"use server"

import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { assertPuedeMutarUsuario } from "@/lib/rbac"
import { registrarAuditoriaStrict } from "@/lib/audit"
import type { Prisma, Rol } from "@/generated/prisma/client"
import {
  cambiarCredencialesSchema,
  type CambiarCredencialesInput,
} from "@/lib/schemas/superadmin-credenciales-schema"

async function ensureSuperadmin() {
  const session = await auth()
  if (!session?.user || session.user.rol !== "SUPERADMIN") {
    throw new Error("No autorizado. Se requieren privilegios de SuperAdmin.")
  }
  return session.user
}

/**
 * Cambia el correo y/o la contraseña de un usuario desde la consola del SUPERADMIN.
 *
 * - Solo SUPERADMIN, con guard de jerarquía y anti-autoedición (RBAC).
 * - El email se mantiene único: rechaza si ya pertenece a otro usuario.
 * - La contraseña se hashea con bcrypt (10 rounds, igual que el registro) y
 *   NUNCA se persiste ni se audita en claro.
 * - Tras cambiar el email, el usuario debe iniciar sesión con el nuevo correo.
 */
export async function cambiarCredencialesSuperadminAction(
  usuarioId: string,
  input: CambiarCredencialesInput,
): Promise<{ error: string } | { success: true }> {
  const actor = await ensureSuperadmin()

  // Guard RBAC (anti-autoedición y jerarquía)
  const rbac = await assertPuedeMutarUsuario(
    { id: actor.id, rol: actor.rol as Rol },
    usuarioId,
  )
  if ("error" in rbac) return { error: rbac.error }

  // Validación Zod
  const parsed = cambiarCredencialesSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." }
  }
  const { email, password } = parsed.data

  const docente = await prisma.docente.findUnique({
    where: { id: usuarioId },
    select: { id: true, nombre: true, email: true },
  })
  if (!docente) return { error: "Usuario no encontrado." }

  const updatePayload: Prisma.DocenteUpdateInput = {}
  const auditAntes: Record<string, unknown> = {}
  const auditDespues: Record<string, unknown> = {}

  // ── Email ──
  const emailCambia = Boolean(email) && email !== docente.email
  if (email && emailCambia) {
    const choque = await prisma.docente.findFirst({
      where: { email, NOT: { id: usuarioId } },
      select: { id: true },
    })
    if (choque) {
      return { error: `Ya existe otro usuario con el correo "${email}".` }
    }
    updatePayload.email = email
    auditAntes.email = docente.email
    auditDespues.email = email
  }

  // ── Contraseña ── (nunca se audita el valor, solo la marca de restablecimiento)
  if (password) {
    updatePayload.password = await bcrypt.hash(password, 10)
    auditAntes.password = "********"
    auditDespues.password = "(restablecida)"
  }

  if (Object.keys(updatePayload).length === 0) {
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
          antes: auditAntes,
          despues: auditDespues,
          observaciones: "Cambio de credenciales (acceso) por SUPERADMIN",
        },
        tx,
      )
    })
  } catch (e) {
    console.error("[cambiarCredencialesSuperadminAction] Error:", e)
    return { error: "No se pudieron actualizar las credenciales. Intenta de nuevo." }
  }

  revalidatePath("/superadmin/usuarios")
  revalidatePath(`/superadmin/usuarios/${usuarioId}`)
  revalidatePath("/superadmin/auditoria")

  return { success: true }
}
