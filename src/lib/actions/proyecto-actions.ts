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
} from "@/lib/schemas/proyecto-schema"

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
  revalidatePath("/admin/revision/proyectos")
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
 * Valida y arma la lista final de participantes (creador + adicionales):
 * sin duplicados, roles válidos para el tipo, EXACTAMENTE un rol líder
 * (Investigador Principal / Coordinador), todos activos y ninguno catedrático.
 */
async function construirParticipantes(
  tipo: TipoProyecto,
  creadorId: string,
  rolCreador: string,
  adicionales: ParticipanteInput[],
): Promise<{ error: string } | { participantes: { docenteId: string; rol: RolEnProyecto }[] }> {
  const todos = [{ docenteId: creadorId, rol: rolCreador }, ...adicionales]

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

  const lider = ROL_LIDER[tipo]
  const liderLabel = lider === "INVESTIGADOR_PRINCIPAL" ? "Investigador Principal" : "Coordinador"
  const numLideres = todos.filter((p) => p.rol === lider).length
  if (numLideres !== 1) {
    return { error: `Debe haber exactamente un ${liderLabel} en el proyecto (hay ${numLideres}).` }
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

  return { participantes: todos.map((p) => ({ docenteId: p.docenteId, rol: p.rol as RolEnProyecto })) }
}

/** Busca docentes elegibles como participantes (activos, no cátedra) por cédula o nombre. */
export async function buscarDocentesAction(q: string) {
  await ensureDocente()
  const query = q.trim()
  if (query.length < 2) return []
  return prisma.docente.findMany({
    where: {
      estadoCuenta: "ACTIVO",
      modalidad: { not: "CATEDRA" },
      OR: [
        { nombre: { contains: query, mode: "insensitive" } },
        { cedula: { contains: query } },
      ],
    },
    select: { id: true, nombre: true, cedula: true, programa: true, facultad: true, modalidad: true },
    take: 10,
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
    select: { id: true, modalidad: true },
  })
  if (!docente) return { error: "Docente no encontrado." }
  if (docente.modalidad === "CATEDRA") {
    return {
      error:
        "Art. 3 Par. 1: los docentes catedráticos no pueden registrar proyectos activos.",
    }
  }

  const { rolDocente, participantes: adicionales, ...datos } = parsed.data
  const armado = await construirParticipantes(datos.tipo, docente.id, rolDocente, adicionales ?? [])
  if ("error" in armado) return armado

  const creado = await prisma.proyecto.create({
    data: {
      ...datos,
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
  if (proyecto.estado !== "BORRADOR") {
    return { error: "Solo se pueden editar proyectos en estado BORRADOR." }
  }

  const { rolDocente, participantes: adicionales, ...datos } = parsed.data
  const armado = await construirParticipantes(datos.tipo, session.id, rolDocente, adicionales ?? [])
  if ("error" in armado) return armado

  await prisma.$transaction([
    prisma.proyecto.update({ where: { id }, data: datos }),
    prisma.participanteProyecto.deleteMany({ where: { proyectoId: id } }),
    prisma.participanteProyecto.createMany({
      data: armado.participantes.map((p) => ({
        proyectoId: id,
        docenteId: p.docenteId,
        rol: p.rol,
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

export async function aprobarProyectoAction(
  id: string,
): Promise<{ error: string } | { success: true }> {
  const user = await ensureAdmin()

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    select: { id: true, titulo: true, estado: true, creador: { select: { nombre: true } } },
  })
  if (!proyecto) return { error: "Proyecto no encontrado." }
  if (proyecto.estado !== "ENVIADO") {
    return { error: "Solo se pueden aprobar proyectos en estado ENVIADO." }
  }

  await prisma.$transaction(async (tx) => {
    const ids = await getParticipantesIds(tx, id)
    await tx.proyecto.update({
      where: { id },
      data: { estado: "APROBADO", revisadoPor: user.id, revisadoEn: new Date() },
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
  const user = await ensureAdmin()

  if (!motivo || motivo.trim().length < 10) {
    return { error: "El motivo es obligatorio y debe tener al menos 10 caracteres." }
  }

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    select: { id: true, titulo: true, estado: true, creador: { select: { nombre: true } } },
  })
  if (!proyecto) return { error: "Proyecto no encontrado." }
  if (proyecto.estado !== "ENVIADO") {
    return { error: "Solo se pueden rechazar proyectos en estado ENVIADO." }
  }

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
  const user = await ensureAdmin()

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    select: { id: true, titulo: true, estado: true, creador: { select: { nombre: true } } },
  })
  if (!proyecto) return { error: "Proyecto no encontrado." }
  if (proyecto.estado !== "APROBADO") {
    return { error: "Solo se pueden rehabilitar proyectos APROBADOS." }
  }

  await prisma.$transaction(async (tx) => {
    const ids = await getParticipantesIds(tx, id)
    await tx.proyecto.update({
      where: { id },
      data: { estado: "BORRADOR", observacionesAdmin: null, revisadoPor: null, revisadoEn: null },
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
        antes: { estado: proyecto.estado },
        despues: { estado: "BORRADOR" },
      },
      tx,
    )
  })

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
