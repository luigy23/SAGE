"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getAutoridadDeSesion } from "@/lib/auth/get-autoridad"
import { puedeGestionarFormulario } from "@/lib/auth/autoridad"
import { registrarAuditoria } from "@/lib/audit"
import type { Rol } from "@/generated/prisma/client"

/**
 * Términos OPERATIVOS de la vinculación de un invitado que captura el Jefe/Decano
 * al crear su agenda (Art. 4f). NO incluye `invAutorizadoCA`: la autorización del
 * Consejo Académico es competencia del SUPERADMIN (sheet de Usuarios y Roles).
 */
const terminosInvitadoSchema = z.object({
  invObjeto: z.string().trim().max(500).nullable().optional(),
  invFechaDesde: z.string().trim().nullable().optional(),
  invFechaHasta: z.string().trim().nullable().optional(),
  invHorasContratadas: z.number().int().min(1).max(4000).nullable().optional(),
})

export type TerminosInvitadoInput = z.infer<typeof terminosInvitadoSchema>

export async function actualizarTerminosInvitadoAction(
  docenteId: string,
  input: TerminosInvitadoInput,
): Promise<{ error: string } | { success: true }> {
  const sesion = await getAutoridadDeSesion()
  if (!sesion) return { error: "No tienes autoridad académica para esta acción." }

  const target = await prisma.docente.findUnique({
    where: { id: docenteId },
    select: { id: true, programa: true, facultad: true, modalidad: true, nombre: true },
  })
  if (!target) return { error: "Docente no encontrado." }
  if (target.modalidad !== "INVITADO") {
    return { error: "Estos datos solo aplican a profesores invitados." }
  }
  if (!puedeGestionarFormulario(sesion.autoridad, target)) {
    return { error: "Ese docente está fuera de tu ámbito." }
  }

  const parsed = terminosInvitadoSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." }
  }
  const data = parsed.data

  const parseFecha = (v: string | null | undefined): Date | null => {
    if (!v) return null
    const d = new Date(v)
    return isNaN(d.getTime()) ? null : d
  }
  const desde = parseFecha(data.invFechaDesde)
  const hasta = parseFecha(data.invFechaHasta)
  if (desde && hasta && hasta < desde) {
    return { error: "La fecha de fin no puede ser anterior a la de inicio." }
  }

  await prisma.docente.update({
    where: { id: docenteId },
    data: {
      invObjeto: data.invObjeto?.trim() || null,
      invFechaDesde: desde,
      invFechaHasta: hasta,
      invHorasContratadas: data.invHorasContratadas ?? null,
    },
  })

  await registrarAuditoria({
    actorId: sesion.actor.id,
    actorRol: sesion.actor.rol as Rol,
    actorNombre: sesion.actor.nombre ?? sesion.actor.email ?? sesion.actor.id,
    entidad: "SOLICITUD_PERFIL",
    accion: "ACTUALIZAR",
    recursoId: docenteId,
    recursoDesc: `Términos de invitación de ${target.nombre}`,
    observaciones: "Captura de términos de invitado por autoridad académica (Art. 4f).",
  })

  revalidatePath(`/gestion/agendas/nueva/${docenteId}`)
  revalidatePath("/gestion/agendas")
  return { success: true }
}
