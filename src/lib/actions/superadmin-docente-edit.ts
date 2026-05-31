"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { assertPuedeMutarUsuario } from "@/lib/rbac"
import { registrarAuditoriaStrict } from "@/lib/audit"
import type { Prisma, Rol, Modalidad, Sede } from "@/generated/prisma/client"
import {
  editarDocenteSuperadminSchema,
  type EditarDocenteSuperadminInput,
} from "@/lib/schemas/superadmin-docente-schema"

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
  "proyectosActivos",
  "semanasVinculacion",
  "perfilVerificado",
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
  const finalCargoAdministrativo = isCatedra ? false : data.cargoAdministrativo
  const finalTipoCargo = isCatedra
    ? null
    : finalCargoAdministrativo
      ? (data.tipoCargo ?? null)
      : null
  const finalProyectosActivos = isCatedra ? false : data.proyectosActivos
  const finalTituloDoctorado = data.doctorado
    ? (data.tituloDoctorado ?? null)
    : null

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
    proyectosActivos: finalProyectosActivos,
    semanasVinculacion: data.semanasVinculacion ?? null,
    ...(typeof data.perfilVerificado === "boolean"
      ? { perfilVerificado: data.perfilVerificado }
      : {}),
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
