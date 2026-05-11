"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { EstadoCuenta, type Rol } from "@/generated/prisma/client"
import { assertNoEsUltimoSuperadmin, assertPuedeMutarUsuario } from "@/lib/rbac"

/**
 * Solo administradores pueden ejecutar estas acciones.
 * Retorna el usuario autenticado para que el caller pueda aplicar reglas RBAC
 * adicionales (ej. impedir escalada lateral a peers o superiores).
 */
async function ensureAdmin() {
  const session = await auth()
  // SUPERADMIN hereda permisos de ADMIN.
  const rol = session?.user?.rol
  if (!session?.user || (rol !== "ADMIN" && rol !== "SUPERADMIN")) {
    throw new Error("No autorizado. Se requieren privilegios de Administrador.")
  }
  return session.user
}

/**
 * Obtener todos los docentes (Admin dashboard)
 */
export async function getDocentesAdmin() {
  await ensureAdmin()

  try {
    const docentes = await prisma.docente.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        nombre: true,
        cedula: true,
        email: true,
        modalidad: true,
        sedeBase: true,
        estadoCuenta: true,
        createdAt: true,
      },
    })
    return docentes
  } catch (error) {
    console.error("[getDocentesAdmin] Error:", error)
    throw new Error("No se pudieron obtener los docentes.")
  }
}

/**
 * Cambiar el estado de cuenta de un docente
 */
export async function cambiarEstadoDocente(docenteId: string, nuevoEstado: EstadoCuenta) {
  const actor = await ensureAdmin()

  // RBAC: prevenir auto-modificación + escalada lateral/vertical.
  const check = await assertPuedeMutarUsuario(
    { id: actor.id, rol: actor.rol as Rol },
    docenteId,
  )
  if ("error" in check) return check

  // Anti lock-out: no permitir desactivar al último SUPERADMIN activo.
  if (check.targetRol === "SUPERADMIN" && nuevoEstado === "INACTIVO") {
    const lockout = await assertNoEsUltimoSuperadmin(docenteId)
    if (lockout) return lockout
  }

  try {
    await prisma.docente.update({
      where: { id: docenteId },
      data: { estadoCuenta: nuevoEstado },
    })

    // Revalidar la vista de admin
    revalidatePath("/admin/docentes")
    return { success: true }
  } catch (error) {
    console.error("[cambiarEstadoDocente] Error:", error)
    throw new Error("No se pudo actualizar el estado del docente.")
  }
}
