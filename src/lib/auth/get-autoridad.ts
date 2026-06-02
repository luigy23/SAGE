import "server-only"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getAutoridadAcademica, type AutoridadAcademica } from "./autoridad"
import type { Rol } from "@/generated/prisma/client"

export type ActorSesion = {
  id: string
  rol: Rol
  estadoCuenta: string
  cargoAdministrativo: boolean
  tipoCargo: string | null
  cargoAmbitoValor: string | null
  nombre: string
  email: string
}

export type SesionAutoridad = {
  actor: ActorSesion
  autoridad: AutoridadAcademica
}

/**
 * Resuelve la autoridad académica del usuario en sesión leyendo su cargo de BD
 * (el JWT no lo transporta). Retorna `null` si no hay sesión, el usuario no
 * existe, o NO tiene autoridad delegada (Jefe/Decano/SUPERADMIN).
 *
 * Pensado para guards de layout y páginas (no lanza). Las server actions usan su
 * propio guard que lanza ante acceso indebido.
 */
export async function getAutoridadDeSesion(): Promise<SesionAutoridad | null> {
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
      nombre: true,
      email: true,
    },
  })
  if (!actor) return null

  const autoridad = getAutoridadAcademica(actor)
  if (autoridad.tipo === null) return null

  return { actor, autoridad }
}
