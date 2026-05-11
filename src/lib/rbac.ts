/**
 * Control de Acceso Basado en Roles (RBAC) — Jerarquía y reglas defensivas.
 *
 * Centraliza la lógica de "quién puede administrar a quién" para evitar
 * escaladas laterales (un ADMIN apagando a otro ADMIN o SUPERADMIN) y
 * escaladas verticales (un usuario inferior modificando a un superior).
 *
 * Regla central: para mutar a otro usuario, el actor debe tener un nivel
 * jerárquico ESTRICTAMENTE MAYOR que el objetivo. Auto-modificaciones se
 * controlan aparte.
 */
import { prisma } from "@/lib/prisma"
import type { Rol } from "@/generated/prisma/client"

const JERARQUIA: Record<Rol, number> = {
  SUPERADMIN: 3,
  ADMIN: 2,
  DOCENTE: 1,
}

/**
 * ¿Puede `actor` administrar (mutar/desactivar) a `target`?
 * Estrictamente mayor — NO permite operar sobre peers.
 */
export function puedeAdministrar(actor: Rol, target: Rol): boolean {
  return JERARQUIA[actor] > JERARQUIA[target]
}

export type RbacFailure = { error: string }

/**
 * Valida que `actor` pueda mutar al usuario con id `targetUserId`:
 *  1. No puede ser él mismo (anti auto-bloqueo)
 *  2. Target debe existir
 *  3. Jerarquía del actor > jerarquía del target
 *
 * Retorna `{ targetRol }` si la operación es segura; `{ error }` si no.
 */
export async function assertPuedeMutarUsuario(
  actor: { id: string; rol: Rol },
  targetUserId: string,
): Promise<{ targetRol: Rol } | RbacFailure> {
  if (targetUserId === actor.id) {
    return {
      error:
        "No puedes modificar tu propia cuenta desde esta acción. Solicita el cambio a otro administrador de igual o mayor jerarquía.",
    }
  }

  const target = await prisma.docente.findUnique({
    where: { id: targetUserId },
    select: { rol: true },
  })
  if (!target) return { error: "Usuario no encontrado." }

  if (!puedeAdministrar(actor.rol, target.rol)) {
    return {
      error:
        "Permisos insuficientes: no puedes administrar a un usuario de igual o mayor jerarquía.",
    }
  }

  return { targetRol: target.rol }
}

/**
 * Garantiza que tras una operación quede al menos un SUPERADMIN activo
 * en el sistema (anti lock-out). Se invoca antes de degradar o desactivar
 * un SUPERADMIN.
 *
 * `excludeUserId` se excluye del conteo (el usuario que está por perder
 * el rol o ser desactivado).
 */
export async function assertNoEsUltimoSuperadmin(
  excludeUserId: string,
): Promise<RbacFailure | null> {
  const restantes = await prisma.docente.count({
    where: {
      rol: "SUPERADMIN",
      estadoCuenta: "ACTIVO",
      NOT: { id: excludeUserId },
    },
  })
  if (restantes === 0) {
    return {
      error:
        "No es posible realizar esta acción: dejaría al sistema sin ningún SUPERADMIN activo.",
    }
  }
  return null
}
