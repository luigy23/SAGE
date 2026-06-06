"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { registrarAuditoriaStrict } from "@/lib/audit"
import type { Rol, Prisma, RolEnProyecto, TipoProyecto } from "@/generated/prisma/client"
import {
  crearProyectoSchema,
  type CrearProyectoInput,
  type ParticipanteInput,
  ROL_LIDER,
  ROLES_POR_TIPO,
  TOPE_POR_ROL,
  ROL_A_ACTIVIDAD_CATALOGO,
} from "@/lib/schemas/proyecto-schema"
import { getAutoridadAcademica, assertPuedeAprobar } from "@/lib/auth/autoridad"
import { periodosQueAbarca } from "@/lib/utils/periodo"

// =====================================================================
// Guards
// =====================================================================

async function ensureDocente() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("No autenticado.")
  return session.user
}

async function ensureAdmin() {
  const session = await auth()
  const rol = session?.user?.rol
  if (!session?.user || (rol !== "ADMIN" && rol !== "SUPERADMIN")) {
    throw new Error("No autorizado. Se requiere ADMIN o SUPERADMIN.")
  }
  return session.user
}

// =====================================================================
// Helpers
// =====================================================================

function revalidateProyectoPaths() {
  revalidatePath("/proyectos")
  revalidatePath("/gestion/proyectos")
  revalidatePath("/agenda")
}

/**
 * Recalcula `proyectosActivos` para cada docente dado: true si tiene al menos una
 * participación en un proyecto APROBADO. Se llama tras aprobar/rechazar/rehabilitar
 * para mantener el flag en sync para TODOS los participantes afectados.
 */
async function recomputeProyectosActivos(
  tx: Prisma.TransactionClient,
  docenteIds: string[],
) {
  for (const docenteId of [...new Set(docenteIds)]) {
    const activos = await tx.participanteProyecto.count({
      where: { docenteId, proyecto: { estado: "APROBADO" } },
    })
    await tx.docente.update({
      where: { id: docenteId },
      data: { proyectosActivos: activos > 0 },
    })
  }
}

/**
 * Valida y arma la lista final de participantes: sin duplicados, roles válidos
 * para el tipo, EXACTAMENTE un rol líder (Investigador Principal / Coordinador),
 * todos activos y ninguno catedrático. Las horas NO se fijan acá (se ponen en la
 * agenda de cada docente).
 *
 * `creadorId`:
 *  - string → el creador es un PROFESOR que registra su propio proyecto; entra
 *    automáticamente como líder y los `adicionales` son el rol secundario.
 *  - null   → el creador es una AUTORIDAD (decano/jefe/superadmin) que registra el
 *    proyecto PARA otros; el equipo es solo `adicionales`, y uno de ellos debe ser
 *    el líder (la autoridad NO queda como participante).
 */
async function construirParticipantes(
  tipo: TipoProyecto,
  creadorId: string | null,
  adicionales: ParticipanteInput[],
): Promise<
  { error: string }
  | { participantes: { docenteId: string; rol: RolEnProyecto; horasAsignadas: number | null }[] }
> {
  const lider = ROL_LIDER[tipo]
  const liderLabel = lider === "INVESTIGADOR_PRINCIPAL" ? "Investigador Principal" : "Coordinador"

  const todos = [
    ...(creadorId ? [{ docenteId: creadorId, rol: lider as string }] : []),
    ...adicionales.map((a) => ({ docenteId: a.docenteId, rol: a.rol as string })),
  ]
  if (todos.length === 0) {
    return { error: "Agrega al menos un participante al proyecto." }
  }

  const ids = new Set<string>()
  for (const p of todos) {
    if (ids.has(p.docenteId)) {
      return { error: "Hay un docente repetido entre los participantes." }
    }
    ids.add(p.docenteId)
  }

  const rolesValidos = ROLES_POR_TIPO[tipo] as readonly string[]
  for (const p of todos) {
    if (!rolesValidos.includes(p.rol)) {
      return {
        error: `El rol seleccionado no corresponde a un proyecto de ${
          tipo === "INVESTIGACION" ? "investigación" : "proyección social"
        }.`,
      }
    }
  }

  const numLideres = todos.filter((p) => p.rol === lider).length
  if (numLideres !== 1) {
    return {
      error:
        numLideres === 0
          ? `Falta designar al ${liderLabel} responsable del proyecto.`
          : `Debe haber exactamente un ${liderLabel} en el proyecto (hay ${numLideres}).`,
    }
  }

  const docentes = await prisma.docente.findMany({
    where: { id: { in: [...ids] } },
    select: { id: true, nombre: true, estadoCuenta: true, modalidad: true },
  })
  if (docentes.length !== ids.size) {
    return { error: "Alguno de los participantes no existe." }
  }
  for (const d of docentes) {
    if (d.estadoCuenta !== "ACTIVO") {
      return { error: `${d.nombre} no tiene una cuenta activa.` }
    }
    if (d.modalidad === "CATEDRA") {
      return {
        error: `${d.nombre} es catedrático y no puede participar en proyectos activos (Art. 3 Par. 1).`,
      }
    }
  }

  return {
    participantes: todos.map((p) => ({
      docenteId: p.docenteId,
      rol: p.rol as RolEnProyecto,
      horasAsignadas: null,
    })),
  }
}

/**
 * Autoriza a revisar un proyecto: ADMIN/SUPERADMIN, o la autoridad académica
 * (jefe/decano) sobre el programa/facultad del Investigador Principal del proyecto
 * (el proyecto se "ancla" a su responsable principal). Devuelve `{ error }` o `null`.
 */
async function verificarRevisor(
  userId: string,
  tipo: TipoProyecto,
  participantes: {
    rol: RolEnProyecto
    docente: { id: string; programa: string; facultad: string }
  }[],
): Promise<{ error: string } | null> {
  const principal = participantes.find((p) => p.rol === ROL_LIDER[tipo])
  if (!principal) {
    return { error: "El proyecto no tiene un responsable principal definido." }
  }
  const actorRow = await prisma.docente.findUnique({
    where: { id: userId },
    select: {
      id: true,
      rol: true,
      estadoCuenta: true,
      cargoAdministrativo: true,
      tipoCargo: true,
      cargoAmbitoValor: true,
    },
  })
  if (!actorRow) return { error: "Usuario no encontrado." }
  // assertPuedeAprobar = alcance + Separación de Deberes (nadie aprueba su propio
  // proyecto → sube de ámbito) + ADMIN operativo sin autoridad bloqueado. Mismo
  // candado que se usa para agendas y monitoreos. El "owner" es el Investigador
  // Principal, que ancla el proyecto a su programa/facultad.
  return assertPuedeAprobar(actorRow, {
    id: principal.docente.id,
    programa: principal.docente.programa,
    facultad: principal.docente.facultad,
  })
}

/** Busca docentes elegibles como participantes (activos, no cátedra) por cédula o nombre. */
export async function buscarDocentesAction(q: string) {
  await ensureDocente()
  const query = q.trim()
  // Sin texto (al abrir): mostramos la lista de activos para que el docente la vea
  // y elija; con texto (≥2): filtra por nombre/cédula.
  const where: Prisma.DocenteWhereInput = {
    estadoCuenta: "ACTIVO",
    modalidad: { not: "CATEDRA" },
  }
  if (query.length >= 2) {
    where.OR = [
      { nombre: { contains: query, mode: "insensitive" } },
      { cedula: { contains: query } },
    ]
  }
  return prisma.docente.findMany({
    where,
    select: { id: true, nombre: true, cedula: true, programa: true, facultad: true, modalidad: true },
    take: query.length >= 2 ? 10 : 30,
    orderBy: { nombre: "asc" },
  })
}

async function getParticipantesIds(
  tx: Prisma.TransactionClient,
  proyectoId: string,
): Promise<string[]> {
  const ps = await tx.participanteProyecto.findMany({
    where: { proyectoId },
    select: { docenteId: true },
  })
  return ps.map((p) => p.docenteId)
}

// =====================================================================
// CREAR — el docente crea en BORRADOR (queda como participante con su rol)
// =====================================================================

export async function crearProyectoAction(
  input: CrearProyectoInput,
): Promise<{ error: string } | { success: true; id: string }> {
  const session = await ensureDocente()

  const parsed = crearProyectoSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." }
  }

  const docente = await prisma.docente.findUnique({
    where: { id: session.id },
    select: {
      id: true, modalidad: true, rol: true, estadoCuenta: true,
      cargoAdministrativo: true, tipoCargo: true, cargoAmbitoValor: true,
    },
  })
  if (!docente) return { error: "Docente no encontrado." }

  const esAutoridadReal = getAutoridadAcademica(docente).tipo !== null
  const esAutoridad = esAutoridadReal && parsed.data.esParaOtro === true

  if (parsed.data.esParaOtro && !esAutoridadReal) {
    return { error: "Solo las autoridades académicas pueden registrar proyectos para otros docentes." }
  }

  // El bloqueo a catedráticos solo aplica si el creador va a ser participante.
  if (!esAutoridad && docente.modalidad === "CATEDRA") {
    return {
      error:
        "Art. 3 Par. 1: los docentes catedráticos no pueden registrar proyectos activos.",
    }
  }

  const { titulo, descripcion, tipo, entidadConvocatoria, participantes: adicionales, fechaInicio, fechaFin } = parsed.data
  const armado = await construirParticipantes(tipo, esAutoridad ? null : docente.id, adicionales ?? [])
  if ("error" in armado) return armado

  const creado = await prisma.proyecto.create({
    data: {
      titulo,
      descripcion,
      tipo,
      entidadConvocatoria,
      fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
      fechaFin: fechaFin ? new Date(fechaFin) : null,
      estado: "BORRADOR",
      creadorId: docente.id,
      participantes: { create: armado.participantes },
    },
    select: { id: true },
  })

  revalidateProyectoPaths()
  return { success: true, id: creado.id }
}

// =====================================================================
// ACTUALIZAR — el creador edita mientras está en BORRADOR
// =====================================================================

export async function actualizarProyectoAction(
  id: string,
  input: CrearProyectoInput,
): Promise<{ error: string } | { success: true }> {
  const session = await ensureDocente()

  const parsed = crearProyectoSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." }
  }

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    select: { id: true, creadorId: true, estado: true },
  })
  if (!proyecto) return { error: "Proyecto no encontrado." }
  if (proyecto.creadorId !== session.id) {
    return { error: "No podés editar un proyecto que no creaste." }
  }
  // Edición atómica: se puede editar en BORRADOR o RECHAZADO. Al guardar, un
  // proyecto RECHAZADO pasa a BORRADOR (sin botón "Corregir" intermedio) y se
  // limpia la nota de rechazo.
  if (proyecto.estado !== "BORRADOR" && proyecto.estado !== "RECHAZADO") {
    return { error: "Solo se pueden editar proyectos en BORRADOR o RECHAZADO." }
  }

  const actor = await prisma.docente.findUnique({
    where: { id: session.id },
    select: {
      id: true, rol: true, estadoCuenta: true,
      cargoAdministrativo: true, tipoCargo: true, cargoAmbitoValor: true,
    },
  })
  if (!actor) return { error: "Docente no encontrado." }
  
  const esAutoridadReal = getAutoridadAcademica(actor).tipo !== null
  const esAutoridad = esAutoridadReal && parsed.data.esParaOtro === true

  if (parsed.data.esParaOtro && !esAutoridadReal) {
    return { error: "Solo las autoridades académicas pueden editar proyectos para otros docentes." }
  }

  const { titulo, descripcion, tipo, entidadConvocatoria, participantes: adicionales, fechaInicio, fechaFin } = parsed.data
  const armado = await construirParticipantes(tipo, esAutoridad ? null : session.id, adicionales ?? [])
  if ("error" in armado) return armado

  await prisma.$transaction([
    prisma.proyecto.update({
      where: { id },
      data: {
        titulo,
        descripcion,
        tipo,
        entidadConvocatoria,
        fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
        fechaFin: fechaFin ? new Date(fechaFin) : null,
        estado: "BORRADOR",
        observacionesAdmin: null,
      },
    }),
    prisma.participanteProyecto.deleteMany({ where: { proyectoId: id } }),
    prisma.participanteProyecto.createMany({
      data: armado.participantes.map((p) => ({
        proyectoId: id,
        docenteId: p.docenteId,
        rol: p.rol,
        horasAsignadas: p.horasAsignadas,
      })),
    }),
  ])

  revalidateProyectoPaths()
  return { success: true }
}

// =====================================================================
// ENVIAR — el creador envía a revisión (BORRADOR → ENVIADO)
// =====================================================================

export async function enviarProyectoAction(
  id: string,
): Promise<{ error: string } | { success: true }> {
  const session = await ensureDocente()

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    select: { id: true, creadorId: true, estado: true },
  })
  if (!proyecto) return { error: "Proyecto no encontrado." }
  if (proyecto.creadorId !== session.id) {
    return { error: "No podés enviar un proyecto que no creaste." }
  }
  if (proyecto.estado !== "BORRADOR") {
    return { error: "Solo se pueden enviar proyectos en estado BORRADOR." }
  }

  // Al (re)enviar, limpia la nota de la revisión anterior: es un envío fresco.
  await prisma.proyecto.update({
    where: { id },
    data: { estado: "ENVIADO", observacionesAdmin: null },
  })
  revalidateProyectoPaths()
  return { success: true }
}

// =====================================================================
// RETIRAR — el creador retira un ENVIADO y lo devuelve a BORRADOR
// =====================================================================

export async function retirarProyectoAction(
  id: string,
): Promise<{ error: string } | { success: true }> {
  const session = await ensureDocente()

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    select: { id: true, creadorId: true, estado: true },
  })
  if (!proyecto) return { error: "Proyecto no encontrado." }
  if (proyecto.creadorId !== session.id) {
    return { error: "No podés retirar un proyecto que no creaste." }
  }
  if (proyecto.estado !== "ENVIADO") {
    return { error: "Solo se puede retirar un proyecto en estado ENVIADO." }
  }

  await prisma.proyecto.update({ where: { id }, data: { estado: "BORRADOR" } })
  revalidateProyectoPaths()
  return { success: true }
}

// =====================================================================
// CORREGIR — el creador reabre su proyecto RECHAZADO (→ BORRADOR) para
// corregirlo y reenviarlo, sin esperar al revisor.
// =====================================================================

export async function corregirProyectoAction(
  id: string,
): Promise<{ error: string } | { success: true }> {
  const session = await ensureDocente()

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    select: { id: true, creadorId: true, estado: true },
  })
  if (!proyecto) return { error: "Proyecto no encontrado." }
  if (proyecto.creadorId !== session.id) {
    return { error: "No podés corregir un proyecto que no creaste." }
  }
  if (proyecto.estado !== "RECHAZADO") {
    return { error: "Solo se pueden corregir proyectos en estado RECHAZADO." }
  }

  // Vuelve a BORRADOR conservando el motivo (observacionesAdmin) como referencia
  // para corregir; se sobrescribirá en la próxima revisión.
  await prisma.proyecto.update({ where: { id }, data: { estado: "BORRADOR" } })
  revalidateProyectoPaths()
  return { success: true }
}

// =====================================================================
// ELIMINAR — el creador elimina un BORRADOR (explícito, sin rastro)
// =====================================================================

export async function eliminarProyectoAction(
  id: string,
): Promise<{ error: string } | { success: true }> {
  const session = await ensureDocente()

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    select: { id: true, creadorId: true, estado: true },
  })
  if (!proyecto) return { error: "Proyecto no encontrado." }
  if (proyecto.creadorId !== session.id) {
    return { error: "No podés eliminar un proyecto que no creaste." }
  }
  if (proyecto.estado !== "BORRADOR") {
    return { error: "Solo se pueden eliminar proyectos en estado BORRADOR." }
  }

  await prisma.proyecto.delete({ where: { id } })
  revalidateProyectoPaths()
  return { success: true }
}

// =====================================================================
// APROBAR — el revisor aprueba y activa proyectosActivos para TODOS
// (la asignación de horas por participante se implementa en la Fase 3)
// =====================================================================

/**
 * Topes de horas por rol resueltos desde el Catálogo de Actividades (parametrizable
 * por el superadmin). Cae al fallback hardcodeado (`TOPE_POR_ROL`) solo si el catálogo
 * no tiene la actividad equivalente o su tope es nulo.
 */
export async function resolverTopesPorRol(): Promise<Record<string, number>> {
  const nombres = Object.values(ROL_A_ACTIVIDAD_CATALOGO).map((v) => v.nombre)
  const actividades = await prisma.catalogoActividad.findMany({
    where: { nombre: { in: nombres }, activo: true },
    select: { nombre: true, topeSemestralH: true },
  })
  const porNombre = new Map(actividades.map((a) => [a.nombre, a.topeSemestralH]))
  const topes: Record<string, number> = {}
  for (const [rol, { nombre }] of Object.entries(ROL_A_ACTIVIDAD_CATALOGO)) {
    const desdeCatalogo = porNombre.get(nombre)
    topes[rol] = desdeCatalogo != null ? desdeCatalogo : (TOPE_POR_ROL[rol] ?? 0)
  }
  return topes
}

export async function aprobarProyectoAction(
  id: string,
  payload: {
    fechaInicio?: string | null
    fechaFin?: string | null
  },
): Promise<{ error: string } | { success: true }> {
  const { fechaInicio, fechaFin } = payload
  const session = await auth()
  if (!session?.user?.id) return { error: "No autenticado." }
  const user = session.user

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    select: {
      id: true,
      titulo: true,
      estado: true,
      tipo: true,
      creador: { select: { nombre: true } },
      participantes: {
        select: {
          id: true,
          docenteId: true,
          rol: true,
          docente: { select: { id: true, programa: true, facultad: true } },
        },
      },
    },
  })
  if (!proyecto) return { error: "Proyecto no encontrado." }
  if (proyecto.estado !== "ENVIADO") {
    return { error: "Solo se pueden aprobar proyectos en estado ENVIADO." }
  }

  const authError = await verificarRevisor(user.id, proyecto.tipo, proyecto.participantes)
  if (authError) return authError

  // El revisor SOLO aprueba la correctitud del proyecto y su tiempo de duración.
  // Las horas NO se asignan aquí: cada docente las define en su propia agenda
  // (FO-19) para el proyecto. Por eso la aprobación no toca `horasAsignadas`.
  if (!fechaInicio || !fechaFin) {
    return { error: "Definí la fecha de inicio y de fin del proyecto antes de aprobar." }
  }
  if (fechaFin < fechaInicio) {
    return { error: "La fecha de fin no puede ser anterior a la de inicio." }
  }

  await prisma.$transaction(async (tx) => {
    await tx.proyecto.update({
      where: { id },
      data: {
        estado: "APROBADO",
        revisadoPor: user.id,
        revisadoEn: new Date(),
        fechaInicio: new Date(fechaInicio),
        fechaFin: new Date(fechaFin),
      },
    })
    await recomputeProyectosActivos(tx, proyecto.participantes.map((p) => p.docenteId))
    await registrarAuditoriaStrict(
      {
        actorId: user.id,
        actorRol: user.rol as Rol,
        actorNombre: user.name ?? user.email ?? user.id,
        entidad: "PROYECTO_DOCENTE",
        accion: "CAMBIAR_ESTADO",
        recursoId: id,
        recursoDesc: `Proyecto "${proyecto.titulo}" de ${proyecto.creador.nombre}`,
        antes: { estado: "ENVIADO" },
        despues: { estado: "APROBADO" },
      },
      tx,
    )
  })

  revalidateProyectoPaths()
  return { success: true }
}

// =====================================================================
// RECHAZAR — el revisor rechaza con motivo
// =====================================================================

export async function rechazarProyectoAction(
  id: string,
  motivo: string,
): Promise<{ error: string } | { success: true }> {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autenticado." }
  const user = session.user

  if (!motivo || motivo.trim().length < 10) {
    return { error: "El motivo es obligatorio y debe tener al menos 10 caracteres." }
  }

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    select: {
      id: true,
      titulo: true,
      estado: true,
      tipo: true,
      creador: { select: { nombre: true } },
      participantes: { select: { rol: true, docente: { select: { id: true, programa: true, facultad: true } } } },
    },
  })
  if (!proyecto) return { error: "Proyecto no encontrado." }
  if (proyecto.estado !== "ENVIADO") {
    return { error: "Solo se pueden rechazar proyectos en estado ENVIADO." }
  }
  const authError = await verificarRevisor(user.id, proyecto.tipo, proyecto.participantes)
  if (authError) return authError

  await prisma.$transaction(async (tx) => {
    const ids = await getParticipantesIds(tx, id)
    await tx.proyecto.update({
      where: { id },
      data: {
        estado: "RECHAZADO",
        observacionesAdmin: motivo.trim(),
        revisadoPor: user.id,
        revisadoEn: new Date(),
      },
    })
    await recomputeProyectosActivos(tx, ids)
    await registrarAuditoriaStrict(
      {
        actorId: user.id,
        actorRol: user.rol as Rol,
        actorNombre: user.name ?? user.email ?? user.id,
        entidad: "PROYECTO_DOCENTE",
        accion: "CAMBIAR_ESTADO",
        recursoId: id,
        recursoDesc: `Proyecto "${proyecto.titulo}" de ${proyecto.creador.nombre}`,
        antes: { estado: "ENVIADO" },
        despues: { estado: "RECHAZADO" },
        observaciones: motivo.trim(),
      },
      tx,
    )
  })

  revalidateProyectoPaths()
  return { success: true }
}

// =====================================================================
// REHABILITAR — el revisor deshace una APROBACIÓN (APROBADO → BORRADOR).
// Los RECHAZADOS los corrige el propio docente (ver corregirProyectoAction),
// así que rehabilitar solo aplica a APROBADO.
// =====================================================================

export async function rehabilitarProyectoAction(
  id: string,
): Promise<{ error: string } | { success: true }> {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autenticado." }
  const user = session.user

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    select: {
      id: true,
      titulo: true,
      estado: true,
      tipo: true,
      creador: { select: { nombre: true } },
      participantes: { select: { rol: true, docente: { select: { id: true, programa: true, facultad: true } } } },
    },
  })
  if (!proyecto) return { error: "Proyecto no encontrado." }
  if (proyecto.estado !== "APROBADO") {
    return { error: "Solo se pueden rehabilitar proyectos APROBADOS." }
  }
  const authError = await verificarRevisor(user.id, proyecto.tipo, proyecto.participantes)
  if (authError) return authError

  await prisma.$transaction(async (tx) => {
    const ids = await getParticipantesIds(tx, id)
    await tx.proyecto.update({
      where: { id },
      data: { estado: "BORRADOR", observacionesAdmin: null, revisadoPor: null, revisadoEn: null },
    })
    await recomputeProyectosActivos(tx, ids)

    // Cascada de integridad: las agendas (ENVIADO/APROBADO) que usan este proyecto
    // también vuelven a BORRADOR, para que ninguna quede con horas "fantasma".
    const [actsInv, actsProy] = await Promise.all([
      tx.actividadInvestigacion.findMany({ where: { proyectoId: id }, select: { agendaId: true } }),
      tx.actividadProyeccionSocial.findMany({ where: { proyectoId: id }, select: { agendaId: true } }),
    ])
    const agendaIds = [...new Set([...actsInv, ...actsProy].map((a) => a.agendaId))]
    if (agendaIds.length > 0) {
      const agendasAfectadas = await tx.agendaSemestral.findMany({
        where: { id: { in: agendaIds }, estado: { in: ["ENVIADO", "APROBADO"] } },
        select: { id: true, estado: true, periodo: true },
      })
      const motivoCascada = `El proyecto "${proyecto.titulo}" asociado a esta agenda fue devuelto a borrador para correcciones.`
      for (const ag of agendasAfectadas) {
        await tx.rehabilitacionAgenda.create({
          data: {
            agendaId: ag.id,
            rehabilitadoPor: user.id,
            motivo: motivoCascada,
            estadoOriginal: ag.estado,
          },
        })
        await tx.agendaSemestral.update({
          where: { id: ag.id },
          data: {
            estado: "BORRADOR",
            observacionesAdmin: motivoCascada,
            rehabilitada: true,
            rehabilitadaCount: { increment: 1 },
            ultimaRehabilitacion: new Date(),
            aprobadoPorId: null,
            aprobadoEn: null,
          },
        })
        await registrarAuditoriaStrict(
          {
            actorId: user.id,
            actorRol: user.rol as Rol,
            actorNombre: user.name ?? user.email ?? user.id,
            entidad: "AGENDA",
            accion: "REHABILITAR",
            recursoId: ag.id,
            recursoDesc: `Agenda ${ag.periodo} (cascada por proyecto)`,
            antes: { estado: ag.estado },
            despues: { estado: "BORRADOR" },
            observaciones: motivoCascada,
          },
          tx,
        )
      }
    }

    await registrarAuditoriaStrict(
      {
        actorId: user.id,
        actorRol: user.rol as Rol,
        actorNombre: user.name ?? user.email ?? user.id,
        entidad: "PROYECTO_DOCENTE",
        accion: "CAMBIAR_ESTADO",
        recursoId: id,
        recursoDesc: `Proyecto "${proyecto.titulo}" de ${proyecto.creador.nombre}`,
        antes: { estado: proyecto.estado },
        despues: { estado: "BORRADOR" },
      },
      tx,
    )
  })

  revalidatePath("/agenda")
  revalidatePath("/gestion/agendas")

  revalidateProyectoPaths()
  return { success: true }
}

// =====================================================================
// LECTURA
// =====================================================================

const participanteInclude = {
  participantes: {
    include: {
      docente: {
        select: { id: true, nombre: true, cedula: true, email: true, programa: true, facultad: true, modalidad: true },
      },
    },
  },
} satisfies Prisma.ProyectoInclude

/** Proyectos en los que el docente participa (creador o no). */
export async function getProyectosDocente(docenteId: string) {
  return prisma.proyecto.findMany({
    where: { participantes: { some: { docenteId } } },
    orderBy: [{ estado: "asc" }, { createdAt: "desc" }],
    include: participanteInclude,
  })
}

/**
 * Proyectos APROBADOS donde el docente participa, con su rol y sus horas asignadas.
 * Para el selector en la agenda (Investigación / Proyección Social).
 *
 * Si se pasa `periodo` (ej. "2026-1"), solo devuelve los proyectos cuyo tiempo
 * (fechaInicio/fechaFin) abarca ese período. Los proyectos sin fechas (legados)
 * se consideran siempre disponibles para no romper datos previos.
 */
export async function getProyectosAprobadosDocente(docenteId: string, periodo?: string) {
  const proyectos = await prisma.proyecto.findMany({
    where: { estado: "APROBADO", participantes: { some: { docenteId } } },
    select: {
      id: true,
      titulo: true,
      tipo: true,
      fechaInicio: true,
      fechaFin: true,
      participantes: { where: { docenteId }, select: { rol: true, horasAsignadas: true } },
    },
    orderBy: { titulo: "asc" },
  })

  const periodos = periodo
    ? await prisma.periodoAcademico.findMany({
        select: { nombre: true, fechaInicio: true, fechaFin: true },
      })
    : []

  return proyectos
    .filter((p) => {
      if (!periodo) return true
      if (!p.fechaInicio || !p.fechaFin) return true // legado sin fechas: disponible
      return periodosQueAbarca(p.fechaInicio, p.fechaFin, periodos).includes(periodo)
    })
    .map((p) => ({
      id: p.id,
      titulo: p.titulo,
      tipo: p.tipo,
      rol: p.participantes[0]?.rol ?? null,
      horasAsignadas: p.participantes[0]?.horasAsignadas ?? 0,
    }))
}

export type ProyectoAprobadoOpcion = Awaited<
  ReturnType<typeof getProyectosAprobadosDocente>
>[number]

export async function getProyectoDetalle(id: string) {
  return prisma.proyecto.findUnique({
    where: { id },
    include: {
      ...participanteInclude,
      creador: { select: { id: true, nombre: true, email: true, cedula: true, modalidad: true } },
    },
  })
}

export async function getProyectosParaAdmin(opts?: {
  estado?: "ENVIADO" | "APROBADO" | "RECHAZADO" | "BORRADOR" | "TODAS"
  q?: string
  page?: number
  perPage?: number
}) {
  await ensureAdmin()
  const page = opts?.page ?? 1
  const perPage = opts?.perPage ?? 20
  const estado = !opts?.estado || opts.estado === "TODAS" ? undefined : opts.estado

  const where: Prisma.ProyectoWhereInput = {
    estado,
    participantes: opts?.q
      ? {
          some: {
            docente: {
              OR: [
                { nombre: { contains: opts.q, mode: "insensitive" } },
                { cedula: { contains: opts.q } },
                { email: { contains: opts.q, mode: "insensitive" } },
              ],
            },
          },
        }
      : undefined,
  }

  const [total, items] = await Promise.all([
    prisma.proyecto.count({ where }),
    prisma.proyecto.findMany({
      where,
      orderBy: [{ estado: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        ...participanteInclude,
        creador: { select: { id: true, nombre: true, email: true, cedula: true, programa: true, facultad: true } },
      },
    }),
  ])

  return {
    items,
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  }
}

/** Roles "líder" — anclan el proyecto a un programa/facultad (ver `verificarRevisor`). */
const LIDER_ROLES = ["INVESTIGADOR_PRINCIPAL", "COORDINADOR"] as const

/**
 * Proyectos dentro del ámbito de la autoridad en sesión (Jefe = su programa,
 * Decano = su facultad, SUPERADMIN = global). El ámbito se ancla al líder del
 * proyecto (Investigador Principal / Coordinador), igual que `verificarRevisor`.
 */
/**
 * Estados de proyecto visibles para la autoridad. Los BORRADOR NO se muestran:
 * son privados del creador, EXCEPTO los que la propia autoridad haya creado.
 */
const ESTADOS_GESTION = ["ENVIADO", "APROBADO", "RECHAZADO"] as const

export async function getProyectosParaGestion(opts?: {
  estado?: "ENVIADO" | "APROBADO" | "RECHAZADO" | "BORRADOR" | "TODAS"
  tipo?: "INVESTIGACION" | "PROYECCION_SOCIAL"
  periodo?: string
  q?: string
  page?: number
  perPage?: number
}) {
  const vacio = { items: [], total: 0, page: 1, perPage: 20, totalPages: 1 as number, autoridad: null }
  const session = await auth()
  if (!session?.user?.id) return vacio

  const actor = await prisma.docente.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      rol: true,
      estadoCuenta: true,
      cargoAdministrativo: true,
      tipoCargo: true,
      cargoAmbitoValor: true,
    },
  })
  if (!actor) return vacio

  const autoridad = getAutoridadAcademica(actor)
  if (autoridad.tipo === null) return { ...vacio, autoridad }

  const page = opts?.page ?? 1
  const perPage = opts?.perPage ?? 20
  const estadoFiltro: Prisma.ProyectoWhereInput["estado"] =
    opts?.estado && opts.estado !== "TODAS"
      ? opts.estado
      : undefined

  // Condición de estado y visibilidad de borradores
  const visibilidadWhere: Prisma.ProyectoWhereInput =
    estadoFiltro === "BORRADOR"
      ? { estado: "BORRADOR", creadorId: actor.id }
      : estadoFiltro
        ? { estado: estadoFiltro }
        : {
            OR: [
              { estado: { in: [...ESTADOS_GESTION] } },
              { estado: "BORRADOR", creadorId: actor.id },
            ],
          }

  // Filtro por período académico: proyectos cuyo rango de fechas se solapa con el período.
  let periodoWhere: Prisma.ProyectoWhereInput = {}
  if (opts?.periodo) {
    const per = await prisma.periodoAcademico.findUnique({
      where: { nombre: opts.periodo },
      select: { fechaInicio: true, fechaFin: true },
    })
    if (per) {
      periodoWhere = { fechaInicio: { lte: per.fechaFin }, fechaFin: { gte: per.fechaInicio } }
    }
  }

  // Scope por el líder del proyecto. SUPERADMIN: sin filtro de ámbito.
  const scopeWhere: Prisma.ProyectoWhereInput =
    autoridad.tipo === "JEFE"
      ? { participantes: { some: { rol: { in: [...LIDER_ROLES] }, docente: { programa: autoridad.ambitoValor ?? "" } } } }
      : autoridad.tipo === "DECANO"
        ? { participantes: { some: { rol: { in: [...LIDER_ROLES] }, docente: { facultad: autoridad.ambitoValor ?? "" } } } }
        : {}

  const qWhere: Prisma.ProyectoWhereInput = opts?.q
    ? {
        participantes: {
          some: {
            docente: {
              OR: [
                { nombre: { contains: opts.q, mode: "insensitive" } },
                { cedula: { contains: opts.q } },
                { email: { contains: opts.q, mode: "insensitive" } },
              ],
            },
          },
        },
      }
    : {}

  const where: Prisma.ProyectoWhereInput = {
    AND: [{ tipo: opts?.tipo }, visibilidadWhere, scopeWhere, qWhere, periodoWhere],
  }

  const [total, items] = await Promise.all([
    prisma.proyecto.count({ where }),
    prisma.proyecto.findMany({
      where,
      orderBy: [{ estado: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        ...participanteInclude,
        creador: { select: { id: true, nombre: true, email: true, programa: true, facultad: true } },
      },
    }),
  ])

  return {
    items,
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    autoridad,
  }
}

export type ConteosProyectosGestion = {
  ENVIADO: number
  APROBADO: number
  RECHAZADO: number
  BORRADOR: number
  TODAS: number
}

/**
 * Cuenta los proyectos por estado en el ámbito de la autoridad en sesión.
 * Utiliza las mismas reglas de visibilidad y anclaje al líder que
 * `getProyectosParaGestion`.
 */
export async function getConteosProyectosGestion(): Promise<ConteosProyectosGestion> {
  const cero: ConteosProyectosGestion = { ENVIADO: 0, APROBADO: 0, RECHAZADO: 0, BORRADOR: 0, TODAS: 0 }
  const session = await auth()
  if (!session?.user?.id) return cero

  const actor = await prisma.docente.findUnique({
    where: { id: session.user.id },
    select: { id: true, rol: true, estadoCuenta: true, cargoAdministrativo: true, tipoCargo: true, cargoAmbitoValor: true },
  })
  if (!actor) return cero

  const autoridad = getAutoridadAcademica(actor)
  if (autoridad.tipo === null) return cero

  const scopeWhere: Prisma.ProyectoWhereInput =
    autoridad.tipo === "JEFE"
      ? { participantes: { some: { rol: { in: [...LIDER_ROLES] }, docente: { programa: autoridad.ambitoValor ?? "" } } } }
      : autoridad.tipo === "DECANO"
        ? { participantes: { some: { rol: { in: [...LIDER_ROLES] }, docente: { facultad: autoridad.ambitoValor ?? "" } } } }
        : {}

  const grupos = await prisma.proyecto.groupBy({
    by: ["estado"],
    where: { AND: [scopeWhere, { estado: { in: [...ESTADOS_GESTION] } }] },
    _count: { _all: true },
  })

  const conteos = { ...cero }
  for (const g of grupos) {
    const n = g._count._all
    if (g.estado in conteos) conteos[g.estado as keyof ConteosProyectosGestion] = n
    conteos.TODAS += n
  }
  return conteos
}

/**
 * Resumen de proyectos APROBADOS (activos) por docente dentro del ámbito de la
 * autoridad en sesión. Aquí el scope es por el DOCENTE (su programa/facultad),
 * para que el jefe/decano vea la carga de SUS docentes — no del líder del
 * proyecto. Devuelve `null` si no hay autoridad.
 */
export async function getEstadisticasProyectosGestion() {
  const session = await auth()
  if (!session?.user?.id) return null

  const actor = await prisma.docente.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      rol: true,
      estadoCuenta: true,
      cargoAdministrativo: true,
      tipoCargo: true,
      cargoAmbitoValor: true,
    },
  })
  if (!actor) return null

  const autoridad = getAutoridadAcademica(actor)
  if (autoridad.tipo === null) return null

  const docenteScope: Prisma.DocenteWhereInput =
    autoridad.tipo === "JEFE"
      ? { programa: autoridad.ambitoValor ?? "" }
      : autoridad.tipo === "DECANO"
        ? { facultad: autoridad.ambitoValor ?? "" }
        : {}

  const participaciones = await prisma.participanteProyecto.findMany({
    where: { proyecto: { estado: "APROBADO" }, docente: docenteScope },
    select: {
      rol: true,
      docente: { select: { id: true, nombre: true, programa: true, facultad: true } },
      proyecto: { select: { id: true, titulo: true, tipo: true } },
    },
    orderBy: { docente: { nombre: "asc" } },
  })

  type DocenteResumen = {
    id: string
    nombre: string
    programa: string
    facultad: string
    // Las horas de cada proyecto se definen en la agenda (FO-19), no acá: este
    // panel resume QUÉ proyectos activos tiene cada docente, no cuántas horas.
    proyectos: { id: string; titulo: string; tipo: string; rol: string }[]
  }

  const porDocente = new Map<string, DocenteResumen>()
  const proyectoIds = new Set<string>()
  for (const p of participaciones) {
    proyectoIds.add(p.proyecto.id)
    let entry = porDocente.get(p.docente.id)
    if (!entry) {
      entry = {
        id: p.docente.id,
        nombre: p.docente.nombre,
        programa: p.docente.programa,
        facultad: p.docente.facultad,
        proyectos: [],
      }
      porDocente.set(p.docente.id, entry)
    }
    entry.proyectos.push({
      id: p.proyecto.id,
      titulo: p.proyecto.titulo,
      tipo: p.proyecto.tipo,
      rol: p.rol,
    })
  }

  const docentes = Array.from(porDocente.values())

  return {
    ambito: autoridad.ambitoValor,
    tipo: autoridad.tipo,
    totales: {
      docentes: docentes.length,
      proyectos: proyectoIds.size,
    },
    docentes,
  }
}
