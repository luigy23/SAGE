"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { EstadoCuenta, type Rol } from "@/generated/prisma/client"
import { assertNoEsUltimoSuperadmin, assertPuedeMutarUsuario } from "@/lib/rbac"
import { registrarAuditoria } from "@/lib/audit"

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
        facultad: true,
        programa: true,
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
    const target = await prisma.docente.findUnique({
      where: { id: docenteId },
      select: { nombre: true, estadoCuenta: true },
    })

    await prisma.docente.update({
      where: { id: docenteId },
      data: { estadoCuenta: nuevoEstado },
    })

    await registrarAuditoria({
      actorId: actor.id,
      actorRol: actor.rol as Rol,
      actorNombre: actor.name ?? actor.email ?? actor.id,
      entidad: "USUARIO_ESTADO",
      accion: "CAMBIAR_ESTADO",
      recursoId: docenteId,
      recursoDesc: `Usuario ${target?.nombre ?? docenteId}`,
      antes: { estadoCuenta: target?.estadoCuenta },
      despues: { estadoCuenta: nuevoEstado },
    })

    revalidatePath("/admin/docentes")
    revalidatePath(`/admin/docentes/${docenteId}`)
    return { success: true }
  } catch (error) {
    console.error("[cambiarEstadoDocente] Error:", error)
    throw new Error("No se pudo actualizar el estado del docente.")
  }
}

/**
 * Obtener todos los datos de un docente para la vista detalle admin
 */
export async function getDocenteAdmin(docenteId: string) {
  await ensureAdmin()

  try {
    return await prisma.docente.findUnique({
      where: { id: docenteId },
      select: {
        id: true,
        nombre: true,
        cedula: true,
        email: true,
        celular: true,
        modalidad: true,
        sedeBase: true,
        facultad: true,
        programa: true,
        estadoCuenta: true,
        createdAt: true,
        doctorado: true,
        cargoAdministrativo: true,
        tipoCargo: true,
        proyectosActivos: true,
        rol: true,
      },
    })
  } catch (error) {
    console.error("[getDocenteAdmin] Error:", error)
    throw new Error("No se pudo obtener el docente.")
  }
}
