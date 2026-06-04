"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getAutoridadAcademica, puedeGestionarFormulario } from "@/lib/auth/autoridad"

/**
 * Liberación MANUAL de un compromiso de consejería antes de que se cumpla, por la
 * autoridad académica del docente (Jefe→programa, Decano→facultad, SUPERADMIN→global).
 * Deja la cohorte disponible para otro consejero.
 */
export async function liberarCompromisoAction(
  id: string,
): Promise<{ error: string } | { success: true }> {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autenticado." }

  const compromiso = await prisma.consejeriaCompromiso.findUnique({
    where: { id },
    include: { docente: { select: { id: true, programa: true, facultad: true } } },
  })
  if (!compromiso) return { error: "Compromiso no encontrado." }
  if (compromiso.estado !== "ACTIVO") return { error: "El compromiso ya no está activo." }

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
  if (!actor) return { error: "Usuario no encontrado." }

  const autoridad = getAutoridadAcademica(actor)
  if (
    autoridad.tipo === null ||
    !puedeGestionarFormulario(autoridad, {
      id: compromiso.docente.id,
      programa: compromiso.docente.programa,
      facultad: compromiso.docente.facultad,
    })
  ) {
    return { error: "No tienes autoridad sobre la consejería de este docente." }
  }

  await prisma.consejeriaCompromiso.update({
    where: { id },
    data: { estado: "LIBERADO", liberadoPor: session.user.id, liberadoEn: new Date() },
  })

  revalidatePath("/gestion/agendas")
  return { success: true }
}
