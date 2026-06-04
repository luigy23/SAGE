"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { registrarAuditoriaStrict } from "@/lib/audit"
import type { Prisma, Rol, Modalidad, Sede, AmbitoCargo } from "@/generated/prisma/client"
import { CARGO_AMBITO, FACULTADES, PROGRAMAS } from "@/lib/constants"
import { getAutoridadAcademica, puedeGestionarFormulario } from "@/lib/auth/autoridad"
import {
  solicitudCambioPerfilInputSchema,
  type SolicitudCambioPerfilInput,
  CAMPOS_EDITABLES,
  type CampoEditable,
} from "@/lib/schemas/solicitud-perfil-schema"

// =====================================================================
// Guards
// =====================================================================

async function ensureAdmin() {
  const session = await auth()
  const rol = session?.user?.rol
  if (!session?.user || (rol !== "ADMIN" && rol !== "SUPERADMIN")) {
    throw new Error("No autorizado. Se requiere ADMIN o SUPERADMIN.")
  }
  return session.user
}

async function ensureDocente() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("No autenticado. Inicie sesión nuevamente.")
  }
  return session.user
}

// =====================================================================
// Helpers
// =====================================================================

/** Campos que otorgan/cambian autoridad: solo el SUPERADMIN puede aprobarlos. */
const CAMPOS_CARGO = ["cargoAdministrativo", "tipoCargo", "cargoAmbitoValor"] as const

/** Resuelve la autoridad académica del actor leyendo su cargo de BD. */
async function resolverAutoridadActor(userId: string) {
  const actor = await prisma.docente.findUnique({
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
  if (!actor) return null
  return { actor, autoridad: getAutoridadAcademica(actor) }
}

/**
 * Candado para revisar una solicitud de perfil: la autoridad debe gobernar al
 * docente dueño (Jefe→programa, Decano→facultad, SUPERADMIN→global), no puede
 * revisar la propia (SoD) y —al aprobar— los cambios de cargo exigen SUPERADMIN
 * (anti-escalada de privilegios).
 */
async function verificarRevisorSolicitud(
  userId: string,
  docente: { id: string; programa: string; facultad: string },
  camposDespues: unknown,
  opts?: { chequearCargo?: boolean },
): Promise<{ error: string } | null> {
  const resuelto = await resolverAutoridadActor(userId)
  if (!resuelto || resuelto.autoridad.tipo === null) {
    return { error: "No tienes autoridad académica para revisar solicitudes de perfil." }
  }
  const { autoridad } = resuelto
  if (!puedeGestionarFormulario(autoridad, { id: docente.id, programa: docente.programa, facultad: docente.facultad })) {
    return { error: "Esta solicitud es de un docente fuera de tu programa/facultad." }
  }
  if (docente.id === userId && autoridad.tipo !== "SUPERADMIN") {
    return { error: "No puedes revisar tu propia solicitud; la resuelve la autoridad del siguiente ámbito." }
  }
  if (opts?.chequearCargo) {
    const campos = (camposDespues ?? {}) as Record<string, unknown>
    const tocaCargo = CAMPOS_CARGO.some((k) => k in campos)
    if (tocaCargo && autoridad.tipo !== "SUPERADMIN") {
      return {
        error:
          "Este cambio modifica el cargo administrativo; solo el SuperAdmin puede aprobarlo.",
      }
    }
  }
  return null
}

type DocenteSnapshot = Record<CampoEditable, unknown>

function snapshotDocente(d: {
  modalidad: Modalidad
  programa: string
  facultad: string
  sedeBase: Sede
  cargoAdministrativo: boolean
  tipoCargo: string | null
  cargoAmbitoValor: string | null
  doctorado: boolean
  tituloDoctorado: string | null
  proyectosActivos: boolean
  semanasVinculacion: number | null
  celular: string | null
}): DocenteSnapshot {
  return {
    modalidad: d.modalidad,
    programa: d.programa,
    facultad: d.facultad,
    sedeBase: d.sedeBase,
    cargoAdministrativo: d.cargoAdministrativo,
    tipoCargo: d.tipoCargo,
    cargoAmbitoValor: d.cargoAmbitoValor,
    doctorado: d.doctorado,
    tituloDoctorado: d.tituloDoctorado,
    // proyectosActivos NO es editable por solicitud: lo gobierna el módulo de proyectos.
    semanasVinculacion: d.semanasVinculacion,
    celular: d.celular,
  }
}

/**
 * Devuelve solo los campos del input cuyo valor difiere del snapshot actual.
 * Normaliza null/undefined/""/0 para evitar falsos positivos.
 */
function diffCambios(
  input: SolicitudCambioPerfilInput,
  actual: DocenteSnapshot,
): Partial<DocenteSnapshot> {
  const cambios: Partial<DocenteSnapshot> = {}
  for (const campo of CAMPOS_EDITABLES) {
    if (!(campo in input)) continue
    const nuevo = (input as Record<string, unknown>)[campo]
    if (nuevo === undefined) continue
    const original = actual[campo]
    const normNuevo = nuevo === "" ? null : nuevo
    const normOriginal = original ?? null
    if (normNuevo !== normOriginal) {
      cambios[campo] = normNuevo as DocenteSnapshot[typeof campo]
    }
  }
  return cambios
}

/**
 * Aplica las reglas estatutarias sobre el estado RESULTANTE (snapshot actual
 * merged con los cambios propuestos). Si la modalidad final es CATEDRA, fuerza
 * cargoAdministrativo/tipoCargo/proyectosActivos a false/null.
 */
function aplicarReglasEstatutarias(
  cambios: Partial<DocenteSnapshot>,
  actual: DocenteSnapshot,
): { cambios: Partial<DocenteSnapshot>; error?: string } {
  const resultante = { ...actual, ...cambios }

  if (resultante.modalidad === "CATEDRA") {
    if (resultante.cargoAdministrativo === true) {
      return {
        cambios,
        error:
          "Art. 10: un docente catedrático no puede tener cargo administrativo. Desactívelo para esta solicitud.",
      }
    }
    // La restricción de proyectos activos para catedráticos (Art. 3 Par. 1) se
    // valida en el módulo de proyectos, no aquí (proyectosActivos no es editable
    // por solicitud).
  }

  if (resultante.cargoAdministrativo === true && !resultante.tipoCargo) {
    return {
      cambios,
      error: "Debe especificar el tipo de cargo administrativo.",
    }
  }

  // Ámbito del cargo ("¿de cuál?"): obligatorio y válido para cargos que lo
  // manejan (Decano→Facultad, Jefe de Programa→Programa, etc.).
  if (
    resultante.cargoAdministrativo === true &&
    resultante.modalidad !== "CATEDRA"
  ) {
    const cfg = resultante.tipoCargo
      ? CARGO_AMBITO[resultante.tipoCargo as string]
      : null
    if (cfg) {
      const valor = resultante.cargoAmbitoValor as string | null | undefined
      const opciones = cfg.lista === "FACULTADES" ? FACULTADES : PROGRAMAS
      if (!valor) {
        return { cambios, error: "Debe especificar el ámbito del cargo (¿de cuál?)." }
      }
      if (!opciones.includes(valor)) {
        return {
          cambios,
          error: `El ámbito "${valor}" no es válido para el cargo seleccionado.`,
        }
      }
      // El ámbito DEBE ser el propio del docente: jefe de programa → su programa;
      // decano/coordinador → su facultad. Evita autoridad sobre un ámbito ajeno.
      const ambitoPropio = String(
        (cfg.tipo === "PROGRAMA" ? resultante.programa : resultante.facultad) ?? ""
      ).trim()
      if (valor !== ambitoPropio) {
        return {
          cambios,
          error: cfg.tipo === "PROGRAMA"
            ? `Un Jefe de Programa solo puede serlo de su propio programa (${ambitoPropio}).`
            : `Este cargo solo puede ejercerse sobre su propia facultad (${ambitoPropio}).`,
        }
      }
    }
  }

  return { cambios }
}

// =====================================================================
// LECTURA — usada por la UI del docente y del admin
// =====================================================================

export async function getSolicitudActivaParaDocente(docenteId: string) {
  return prisma.solicitudCambioPerfil.findFirst({
    where: { docenteId, estado: "ENVIADO" },
    orderBy: { createdAt: "desc" },
  })
}

export async function getUltimaSolicitudParaDocente(docenteId: string) {
  return prisma.solicitudCambioPerfil.findFirst({
    where: { docenteId },
    orderBy: { createdAt: "desc" },
  })
}

export async function listSolicitudesDocente(docenteId: string) {
  return prisma.solicitudCambioPerfil.findMany({
    where: { docenteId },
    orderBy: { createdAt: "desc" },
  })
}

// =====================================================================
// CREAR — docente envía una solicitud
// =====================================================================

export async function crearSolicitudCambioPerfilAction(
  input: SolicitudCambioPerfilInput,
): Promise<{ error: string } | { success: true; id: string }> {
  const session = await ensureDocente()

  const parsed = solicitudCambioPerfilInputSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." }
  }

  const docente = await prisma.docente.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      modalidad: true,
      programa: true,
      facultad: true,
      sedeBase: true,
      cargoAdministrativo: true,
      tipoCargo: true,
      cargoAmbitoValor: true,
      doctorado: true,
      tituloDoctorado: true,
      proyectosActivos: true,
      semanasVinculacion: true,
      celular: true,
    },
  })
  if (!docente) return { error: "Docente no encontrado." }

  // Bloquear si ya hay una solicitud ENVIADO
  const pendiente = await prisma.solicitudCambioPerfil.findFirst({
    where: { docenteId: docente.id, estado: "ENVIADO" },
    select: { id: true },
  })
  if (pendiente) {
    return {
      error:
        "Ya tienes una solicitud de cambio de perfil en revisión. Cancélala antes de enviar una nueva.",
    }
  }

  const snapshot = snapshotDocente(docente)
  const cambios = diffCambios(parsed.data, snapshot)

  if (Object.keys(cambios).length === 0) {
    return { error: "No se detectaron cambios respecto a tu perfil actual." }
  }

  const reglas = aplicarReglasEstatutarias(cambios, snapshot)
  if (reglas.error) return { error: reglas.error }

  const motivo = parsed.data.motivoSolicitud?.trim() || null

  const creada = await prisma.solicitudCambioPerfil.create({
    data: {
      docenteId: docente.id,
      estado: "ENVIADO",
      camposAntes: snapshot as Prisma.InputJsonValue,
      camposDespues: reglas.cambios as Prisma.InputJsonValue,
      motivoSolicitud: motivo,
    },
    select: { id: true },
  })

  revalidatePath("/perfil")
  revalidatePath("/perfil/editar")
  revalidatePath("/perfil/solicitudes")
  revalidatePath("/gestion/perfiles")

  return { success: true, id: creada.id }
}

// =====================================================================
// CANCELAR — docente cancela su propia solicitud pendiente
// =====================================================================

export async function cancelarSolicitudCambioPerfilAction(
  id: string,
): Promise<{ error: string } | { success: true }> {
  const session = await ensureDocente()

  const solicitud = await prisma.solicitudCambioPerfil.findUnique({
    where: { id },
    select: { id: true, docenteId: true, estado: true },
  })
  if (!solicitud) return { error: "Solicitud no encontrada." }
  if (solicitud.docenteId !== session.id) {
    return { error: "No puedes cancelar una solicitud que no es tuya." }
  }
  if (solicitud.estado !== "ENVIADO") {
    return { error: "Solo se pueden cancelar solicitudes en estado ENVIADO." }
  }

  await prisma.solicitudCambioPerfil.update({
    where: { id },
    data: {
      estado: "RECHAZADO",
      observacionesAdmin: "Cancelada por el docente",
      revisadoEn: new Date(),
    },
  })

  revalidatePath("/perfil/editar")
  revalidatePath("/perfil/solicitudes")
  revalidatePath("/gestion/perfiles")

  return { success: true }
}

// =====================================================================
// APROBAR — admin aplica los cambios al Docente
// =====================================================================

export async function aprobarSolicitudCambioPerfilAction(
  id: string,
): Promise<{ error: string } | { success: true }> {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autenticado." }
  const user = session.user

  const solicitud = await prisma.solicitudCambioPerfil.findUnique({
    where: { id },
    include: {
      docente: {
        select: {
          id: true,
          modalidad: true,
          programa: true,
          facultad: true,
          sedeBase: true,
          cargoAdministrativo: true,
          tipoCargo: true,
          cargoAmbitoValor: true,
          doctorado: true,
          tituloDoctorado: true,
          proyectosActivos: true,
          semanasVinculacion: true,
          celular: true,
          nombre: true,
        },
      },
    },
  })
  if (!solicitud) return { error: "Solicitud no encontrada." }
  if (solicitud.estado !== "ENVIADO") {
    return { error: "Solo se pueden aprobar solicitudes en estado ENVIADO." }
  }

  // Autoridad sobre el docente dueño + SoD + anti-escalada (cargo → solo SUPERADMIN).
  const guard = await verificarRevisorSolicitud(
    user.id,
    solicitud.docente,
    solicitud.camposDespues,
    { chequearCargo: true },
  )
  if (guard) return guard

  const cambios = solicitud.camposDespues as Partial<DocenteSnapshot>
  const snapshotActual = snapshotDocente(solicitud.docente)

  // Re-validar las reglas con el estado RESULTANTE (defensa en profundidad —
  // los datos del docente pueden haber cambiado por otra vía entre el envío
  // y la aprobación).
  const reglas = aplicarReglasEstatutarias(cambios, snapshotActual)
  if (reglas.error) {
    return {
      error: `No se puede aprobar: ${reglas.error}. Pide al docente que cree una nueva solicitud.`,
    }
  }

  // Construir el data del update aplicando override defensivo CATEDRA.
  const resultante = { ...snapshotActual, ...cambios }
  const isCatedra = resultante.modalidad === "CATEDRA"

  const dataDocente: Prisma.DocenteUpdateInput = {}
  if ("modalidad" in cambios)
    dataDocente.modalidad = cambios.modalidad as Modalidad
  if ("programa" in cambios) dataDocente.programa = cambios.programa as string
  if ("facultad" in cambios) dataDocente.facultad = cambios.facultad as string
  if ("sedeBase" in cambios) dataDocente.sedeBase = cambios.sedeBase as Sede
  if ("cargoAdministrativo" in cambios)
    dataDocente.cargoAdministrativo = isCatedra
      ? false
      : (cambios.cargoAdministrativo as boolean)
  if ("tipoCargo" in cambios)
    dataDocente.tipoCargo = isCatedra
      ? null
      : ((cambios.tipoCargo as string | null) ?? null)
  // Ámbito del cargo: se recalcula de forma determinista cuando cambia algo que
  // lo afecta. El TIPO se deriva del cargo resultante; el VALOR del snapshot.
  const ambitoAfectado =
    "cargoAdministrativo" in cambios ||
    "tipoCargo" in cambios ||
    "cargoAmbitoValor" in cambios ||
    "modalidad" in cambios
  if (ambitoAfectado) {
    const cargoFinal = isCatedra ? null : ((resultante.tipoCargo as string | null) ?? null)
    const cfgFinal = cargoFinal ? CARGO_AMBITO[cargoFinal] : null
    if (isCatedra || !resultante.cargoAdministrativo || !cfgFinal) {
      dataDocente.cargoAmbitoTipo = null
      dataDocente.cargoAmbitoValor = null
    } else {
      dataDocente.cargoAmbitoTipo = cfgFinal.tipo as AmbitoCargo
      dataDocente.cargoAmbitoValor = (resultante.cargoAmbitoValor as string | null) ?? null
    }
  }
  if ("doctorado" in cambios)
    dataDocente.doctorado = cambios.doctorado as boolean
  if ("tituloDoctorado" in cambios)
    dataDocente.tituloDoctorado = (cambios.tituloDoctorado as string | null) ?? null
  if ("proyectosActivos" in cambios)
    dataDocente.proyectosActivos = isCatedra
      ? false
      : (cambios.proyectosActivos as boolean)
  if ("semanasVinculacion" in cambios)
    dataDocente.semanasVinculacion =
      (cambios.semanasVinculacion as number | null) ?? null
  if ("celular" in cambios)
    dataDocente.celular = (cambios.celular as string | null) ?? null

  await prisma.$transaction(async (tx) => {
    await tx.docente.update({
      where: { id: solicitud.docenteId },
      data: dataDocente,
    })
    await tx.solicitudCambioPerfil.update({
      where: { id },
      data: {
        estado: "APROBADO",
        revisadoPor: user.id,
        revisadoEn: new Date(),
      },
    })
    await registrarAuditoriaStrict(
      {
        actorId: user.id,
        actorRol: user.rol as Rol,
        actorNombre: user.name ?? user.email ?? user.id,
        entidad: "SOLICITUD_PERFIL",
        accion: "CAMBIAR_ESTADO",
        recursoId: id,
        recursoDesc: `Solicitud de ${solicitud.docente.nombre}`,
        antes: snapshotActual as Record<string, unknown>,
        despues: { ...snapshotActual, ...cambios } as Record<string, unknown>,
      },
      tx,
    )
  })

  revalidatePath("/gestion/perfiles")
  revalidatePath(`/gestion/perfiles/${id}`)
  revalidatePath("/perfil")
  revalidatePath("/perfil/editar")
  revalidatePath("/perfil/solicitudes")
  revalidatePath("/agenda")

  return { success: true }
}

// =====================================================================
// RECHAZAR — admin rechaza con motivo, no toca al Docente
// =====================================================================

export async function rechazarSolicitudCambioPerfilAction(
  id: string,
  motivo: string,
): Promise<{ error: string } | { success: true }> {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autenticado." }
  const user = session.user

  if (!motivo || motivo.trim().length < 10) {
    return { error: "El motivo es obligatorio y debe tener al menos 10 caracteres." }
  }

  const solicitud = await prisma.solicitudCambioPerfil.findUnique({
    where: { id },
    include: {
      docente: { select: { id: true, nombre: true, programa: true, facultad: true } },
    },
  })
  if (!solicitud) return { error: "Solicitud no encontrada." }
  if (solicitud.estado !== "ENVIADO") {
    return { error: "Solo se pueden rechazar solicitudes en estado ENVIADO." }
  }

  const guard = await verificarRevisorSolicitud(user.id, solicitud.docente, solicitud.camposDespues)
  if (guard) return guard

  await prisma.$transaction(async (tx) => {
    await tx.solicitudCambioPerfil.update({
      where: { id },
      data: {
        estado: "RECHAZADO",
        observacionesAdmin: motivo.trim(),
        revisadoPor: user.id,
        revisadoEn: new Date(),
      },
    })
    await registrarAuditoriaStrict(
      {
        actorId: user.id,
        actorRol: user.rol as Rol,
        actorNombre: user.name ?? user.email ?? user.id,
        entidad: "SOLICITUD_PERFIL",
        accion: "CAMBIAR_ESTADO",
        recursoId: id,
        recursoDesc: `Solicitud de ${solicitud.docente.nombre}`,
        antes: { estado: "ENVIADO" },
        despues: { estado: "RECHAZADO" },
        observaciones: motivo.trim(),
      },
      tx,
    )
  })

  revalidatePath("/gestion/perfiles")
  revalidatePath(`/gestion/perfiles/${id}`)
  revalidatePath("/perfil/editar")
  revalidatePath("/perfil/solicitudes")

  return { success: true }
}

// =====================================================================
// LISTAR / OBTENER — admin
// =====================================================================

export async function listSolicitudesParaAdmin(opts?: {
  estado?: "ENVIADO" | "APROBADO" | "RECHAZADO" | "TODAS"
  q?: string
  page?: number
  perPage?: number
}) {
  await ensureAdmin()
  const page = opts?.page ?? 1
  const perPage = opts?.perPage ?? 20
  const estado = !opts?.estado || opts.estado === "TODAS" ? undefined : opts.estado

  const where: Prisma.SolicitudCambioPerfilWhereInput = {
    estado,
    docente: opts?.q
      ? {
          OR: [
            { nombre: { contains: opts.q, mode: "insensitive" } },
            { cedula: { contains: opts.q } },
            { email: { contains: opts.q, mode: "insensitive" } },
          ],
        }
      : undefined,
  }

  const [total, items] = await Promise.all([
    prisma.solicitudCambioPerfil.count({ where }),
    prisma.solicitudCambioPerfil.findMany({
      where,
      orderBy: [{ estado: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        docente: {
          select: {
            id: true,
            nombre: true,
            email: true,
            cedula: true,
            modalidad: true,
            sedeBase: true,
            facultad: true,
            programa: true,
          },
        },
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

export async function getSolicitudParaAdmin(id: string) {
  await ensureAdmin()
  return prisma.solicitudCambioPerfil.findUnique({
    where: { id },
    include: {
      docente: {
        select: {
          id: true,
          nombre: true,
          email: true,
          cedula: true,
          modalidad: true,
          sedeBase: true,
          facultad: true,
          programa: true,
        },
      },
    },
  })
}

// =====================================================================
// LISTAR / OBTENER — autoridad académica (jefe/decano/superadmin), scoped
// =====================================================================

const SOLICITUD_DOCENTE_SELECT = {
  id: true,
  nombre: true,
  email: true,
  cedula: true,
  modalidad: true,
  sedeBase: true,
  facultad: true,
  programa: true,
} satisfies Prisma.DocenteSelect

export async function listSolicitudesParaGestion(opts?: {
  estado?: "ENVIADO" | "APROBADO" | "RECHAZADO" | "TODAS"
  q?: string
  page?: number
  perPage?: number
}) {
  const vacio = { items: [], total: 0, page: 1, perPage: 20, totalPages: 1 as number, autoridad: null }
  const session = await auth()
  if (!session?.user?.id) return vacio

  const resuelto = await resolverAutoridadActor(session.user.id)
  if (!resuelto || resuelto.autoridad.tipo === null) return vacio
  const { autoridad } = resuelto

  const page = opts?.page ?? 1
  const perPage = opts?.perPage ?? 20
  const estado = !opts?.estado || opts.estado === "TODAS" ? undefined : opts.estado

  const scopeWhere: Prisma.SolicitudCambioPerfilWhereInput =
    autoridad.tipo === "JEFE"
      ? { docente: { programa: autoridad.ambitoValor ?? "" } }
      : autoridad.tipo === "DECANO"
        ? { docente: { facultad: autoridad.ambitoValor ?? "" } }
        : {}

  const qWhere: Prisma.SolicitudCambioPerfilWhereInput = opts?.q
    ? {
        docente: {
          OR: [
            { nombre: { contains: opts.q, mode: "insensitive" } },
            { cedula: { contains: opts.q } },
            { email: { contains: opts.q, mode: "insensitive" } },
          ],
        },
      }
    : {}

  const where: Prisma.SolicitudCambioPerfilWhereInput = { AND: [{ estado }, scopeWhere, qWhere] }

  const [total, items] = await Promise.all([
    prisma.solicitudCambioPerfil.count({ where }),
    prisma.solicitudCambioPerfil.findMany({
      where,
      orderBy: [{ estado: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * perPage,
      take: perPage,
      include: { docente: { select: SOLICITUD_DOCENTE_SELECT } },
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

export async function getSolicitudParaGestion(id: string) {
  const session = await auth()
  if (!session?.user?.id) return null

  const solicitud = await prisma.solicitudCambioPerfil.findUnique({
    where: { id },
    include: { docente: { select: SOLICITUD_DOCENTE_SELECT } },
  })
  if (!solicitud) return null

  const resuelto = await resolverAutoridadActor(session.user.id)
  if (!resuelto || resuelto.autoridad.tipo === null) return null
  if (
    !puedeGestionarFormulario(resuelto.autoridad, {
      id: solicitud.docente.id,
      programa: solicitud.docente.programa,
      facultad: solicitud.docente.facultad,
    })
  ) {
    return null
  }
  return solicitud
}

/**
 * ¿La autoridad en sesión puede APROBAR esta solicitud? `false` si toca cargo y
 * no es SUPERADMIN (anti-escalada). Para gatear el botón en la UI.
 */
export async function puedeAprobarSolicitudGestion(
  camposDespues: unknown,
): Promise<boolean> {
  const session = await auth()
  if (!session?.user?.id) return false
  const resuelto = await resolverAutoridadActor(session.user.id)
  if (!resuelto || resuelto.autoridad.tipo === null) return false
  const campos = (camposDespues ?? {}) as Record<string, unknown>
  const tocaCargo = CAMPOS_CARGO.some((k) => k in campos)
  return !tocaCargo || resuelto.autoridad.tipo === "SUPERADMIN"
}
