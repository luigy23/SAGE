"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { assertPuedeMutarUsuario } from "@/lib/rbac"
import { registrarAuditoriaStrict } from "@/lib/audit"
import type { Prisma, Rol, Modalidad, Sede, AmbitoCargo } from "@/generated/prisma/client"
import {
  editarDocenteSuperadminSchema,
  type EditarDocenteSuperadminInput,
} from "@/lib/schemas/superadmin-docente-schema"
import { CARGO_AMBITO, FACULTADES, PROGRAMAS } from "@/lib/constants"

/**
 * Modalidades temporales no-INVITADO que usan rango de fechas de contrato
 * (ocasional, visitante, cátedra visitante). INVITADO tiene sus propios campos `inv*`.
 */
const MODALIDADES_VINCULACION_FECHAS = new Set<Modalidad>([
  "OCASIONAL_TC",
  "OCASIONAL_MT",
  "VISITANTE_TC",
  "VISITANTE_MT",
  "CATEDRA_VISITANTE_TC",
  "CATEDRA_VISITANTE_MT",
])

async function ensureSuperadmin() {
  const session = await auth()
  if (!session?.user || session.user.rol !== "SUPERADMIN") {
    throw new Error("No autorizado. Se requieren privilegios de SuperAdmin.")
  }
  return session.user
}

const CAMPOS_AUDITABLES = [
  "nombre",
  "cedula",
  "celular",
  "modalidad",
  "programa",
  "facultad",
  "sedeBase",
  "doctorado",
  "tituloDoctorado",
  "cargoAdministrativo",
  "tipoCargo",
  "cargoAmbitoValor",
  "proyectosActivos",
  "semanasVinculacion",
  "vinculacionDesde",
  "vinculacionHasta",
  "invObjeto",
  "invFechaDesde",
  "invFechaHasta",
  "invHorasContratadas",
  "invAutorizadoCA",
] as const

type CampoAuditable = (typeof CAMPOS_AUDITABLES)[number]
type DocenteSnapshot = Record<CampoAuditable, unknown>

function snapshot(d: Record<string, unknown>): DocenteSnapshot {
  const out = {} as DocenteSnapshot
  for (const k of CAMPOS_AUDITABLES) {
    out[k] = d[k] ?? null
  }
  return out
}

function diffCambios(
  antes: DocenteSnapshot,
  despues: DocenteSnapshot,
): { antes: Partial<DocenteSnapshot>; despues: Partial<DocenteSnapshot> } {
  const a: Partial<DocenteSnapshot> = {}
  const d: Partial<DocenteSnapshot> = {}
  for (const k of CAMPOS_AUDITABLES) {
    if (JSON.stringify(antes[k]) !== JSON.stringify(despues[k])) {
      a[k] = antes[k] as DocenteSnapshot[typeof k]
      d[k] = despues[k] as DocenteSnapshot[typeof k]
    }
  }
  return { antes: a, despues: d }
}

export async function editarDocenteSuperadminAction(
  usuarioId: string,
  input: EditarDocenteSuperadminInput,
): Promise<{ error: string } | { success: true }> {
  const actor = await ensureSuperadmin()

  // Guard RBAC (anti-autoedición y jerarquía)
  const rbac = await assertPuedeMutarUsuario(
    { id: actor.id, rol: actor.rol as Rol },
    usuarioId,
  )
  if ("error" in rbac) return { error: rbac.error }

  // Validación Zod
  const parsed = editarDocenteSuperadminSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." }
  }
  const data = parsed.data

  // Snapshot actual del docente
  const docente = await prisma.docente.findUnique({
    where: { id: usuarioId },
  })
  if (!docente) return { error: "Usuario no encontrado." }

  // Unicidad de cédula si cambió
  if (data.cedula !== docente.cedula) {
    const choque = await prisma.docente.findFirst({
      where: { cedula: data.cedula, NOT: { id: usuarioId } },
      select: { id: true },
    })
    if (choque) {
      return {
        error: `Ya existe otro docente con la cédula "${data.cedula}".`,
      }
    }
  }

  // Reglas estatutarias (Triple-Lock, defensa en profundidad)
  if (data.cargoAdministrativo && !(data.tipoCargo && data.tipoCargo.trim())) {
    return { error: "Debe especificar el tipo de cargo administrativo." }
  }

  const isCatedra = data.modalidad === "CATEDRA"
  // CÁTEDRA (Art. 10) e INVITADO (Art. 4f) no pueden ejercer cargo administrativo.
  const sinCargoAdmin = isCatedra || data.modalidad === "INVITADO"
  const finalCargoAdministrativo = sinCargoAdmin ? false : data.cargoAdministrativo
  const finalTipoCargo = sinCargoAdmin
    ? null
    : finalCargoAdministrativo
      ? (data.tipoCargo ?? null)
      : null
  // Proyectos activos: solo CÁTEDRA los tiene vedados (Art. 3 Par. 1); el invitado sí puede.
  const finalProyectosActivos = isCatedra ? false : data.proyectosActivos
  const finalTituloDoctorado = data.doctorado
    ? (data.tituloDoctorado ?? null)
    : null

  // Ámbito del cargo: tipo derivado del cargo resultante; valor validado contra
  // la lista controlada. Se limpia a null si no hay cargo o no maneja ámbito.
  const cfgAmbito = finalCargoAdministrativo && finalTipoCargo
    ? (CARGO_AMBITO[finalTipoCargo] ?? null)
    : null
  let finalCargoAmbitoTipo: AmbitoCargo | null = null
  let finalCargoAmbitoValor: string | null = null
  if (cfgAmbito) {
    const valor = data.cargoAmbitoValor?.trim() || ""
    const opciones = cfgAmbito.lista === "FACULTADES" ? FACULTADES : PROGRAMAS
    if (!valor) {
      return { error: "Debe especificar el ámbito del cargo (¿de cuál?)." }
    }
    if (!opciones.includes(valor)) {
      return { error: `El ámbito "${valor}" no es válido para el cargo seleccionado.` }
    }
    // El ámbito DEBE ser el propio del docente: un jefe de programa lo es de SU programa;
    // un decano/coordinador, de SU facultad. Evita autoridad sobre un ámbito ajeno.
    const ambitoPropio = (cfgAmbito.tipo === "PROGRAMA" ? data.programa : data.facultad)?.trim() || ""
    if (valor !== ambitoPropio) {
      return {
        error: cfgAmbito.tipo === "PROGRAMA"
          ? `Un Jefe de Programa solo puede serlo de su propio programa (${ambitoPropio}).`
          : `Este cargo solo puede ejercerse sobre su propia facultad (${ambitoPropio}).`,
      }
    }
    finalCargoAmbitoTipo = cfgAmbito.tipo as AmbitoCargo
    finalCargoAmbitoValor = valor
  }

  // Datos de invitación (Art. 4f): solo se persisten para modalidad INVITADO; en
  // cualquier otra modalidad se limpian a null/false (defensa en profundidad).
  const esInvitado = data.modalidad === "INVITADO"
  const parseFecha = (v: string | null | undefined): Date | null => {
    if (!esInvitado || !v) return null
    const d = new Date(v)
    return isNaN(d.getTime()) ? null : d
  }
  const finalInvFechaDesde = parseFecha(data.invFechaDesde)
  const finalInvFechaHasta = parseFecha(data.invFechaHasta)
  if (finalInvFechaDesde && finalInvFechaHasta && finalInvFechaHasta < finalInvFechaDesde) {
    return { error: "La fecha de fin de la invitación no puede ser anterior a la de inicio." }
  }
  const finalInvObjeto = esInvitado ? (data.invObjeto?.trim() || null) : null
  const finalInvHorasContratadas = esInvitado ? (data.invHorasContratadas ?? null) : null
  const finalInvAutorizadoCA = esInvitado ? (data.invAutorizadoCA ?? false) : false

  // Rango de vinculación: solo para temporales no-INVITADO (ocasional/visitante/cátedra
  // visitante). En cualquier otra modalidad se limpia a null (defensa en profundidad).
  const esTemporalNoInvitado = MODALIDADES_VINCULACION_FECHAS.has(data.modalidad)
  const parseVinc = (v: string | null | undefined): Date | null => {
    if (!esTemporalNoInvitado || !v) return null
    const d = new Date(v)
    return isNaN(d.getTime()) ? null : d
  }
  const finalVinculacionDesde = parseVinc(data.vinculacionDesde)
  const finalVinculacionHasta = parseVinc(data.vinculacionHasta)
  if (finalVinculacionDesde && finalVinculacionHasta && finalVinculacionHasta < finalVinculacionDesde) {
    return { error: "La fecha de fin de la vinculación no puede ser anterior a la de inicio." }
  }

  const updatePayload: Prisma.DocenteUpdateInput = {
    nombre: data.nombre,
    cedula: data.cedula,
    celular: data.celular?.trim() ? data.celular.trim() : null,
    modalidad: data.modalidad as Modalidad,
    programa: data.programa,
    facultad: data.facultad,
    sedeBase: data.sedeBase as Sede,
    doctorado: data.doctorado,
    tituloDoctorado: finalTituloDoctorado,
    cargoAdministrativo: finalCargoAdministrativo,
    tipoCargo: finalTipoCargo,
    cargoAmbitoTipo: finalCargoAmbitoTipo,
    cargoAmbitoValor: finalCargoAmbitoValor,
    proyectosActivos: finalProyectosActivos,
    semanasVinculacion: data.semanasVinculacion ?? null,
    vinculacionDesde: finalVinculacionDesde,
    vinculacionHasta: finalVinculacionHasta,
    invObjeto: finalInvObjeto,
    invFechaDesde: finalInvFechaDesde,
    invFechaHasta: finalInvFechaHasta,
    invHorasContratadas: finalInvHorasContratadas,
    invAutorizadoCA: finalInvAutorizadoCA,
  }

  const antesSnap = snapshot(docente as unknown as Record<string, unknown>)
  const despuesSnap = snapshot({
    ...(docente as unknown as Record<string, unknown>),
    ...updatePayload,
  } as Record<string, unknown>)
  const cambios = diffCambios(antesSnap, despuesSnap)

  // Si no hubo cambios, devolver temprano
  if (Object.keys(cambios.despues).length === 0) {
    return { error: "No se detectaron cambios respecto al estado actual." }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.docente.update({
        where: { id: usuarioId },
        data: updatePayload,
      })
      await registrarAuditoriaStrict(
        {
          actorId: actor.id,
          actorRol: actor.rol as Rol,
          actorNombre: actor.name ?? actor.email ?? actor.id,
          entidad: "SOLICITUD_PERFIL",
          accion: "ACTUALIZAR",
          recursoId: usuarioId,
          recursoDesc: `Docente ${docente.nombre}`,
          antes: cambios.antes as Record<string, unknown>,
          despues: cambios.despues as Record<string, unknown>,
          observaciones: "Edición directa por SUPERADMIN",
        },
        tx,
      )
    })
  } catch (e) {
    console.error("[editarDocenteSuperadminAction] Error:", e)
    return { error: "No se pudo actualizar el docente. Intenta de nuevo." }
  }

  revalidatePath("/superadmin/usuarios")
  revalidatePath(`/superadmin/usuarios/${usuarioId}`)
  revalidatePath("/superadmin/auditoria")
  revalidatePath("/agenda")

  return { success: true }
}
