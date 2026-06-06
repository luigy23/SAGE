"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getAutoridadAcademica, puedeGestionarFormulario } from "@/lib/auth/autoridad"
import { getPeriodoActivo } from "@/lib/utils/periodo-server"
import { reservarCompromisos } from "@/lib/consejeria"

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
  revalidatePath("/gestion/consejeria")
  return { success: true }
}

/**
 * Asignación DIRECTA de un consejero por la autoridad académica (Jefe→programa,
 * Decano→facultad, SUPERADMIN→global), sin esperar a que el docente elija la cohorte
 * en su propia FO-19. Reusa la lógica de exclusividad y tope de duración de
 * `reservarCompromisos` (lock por programa+cohorte, un solo consejero por cohorte).
 */
export async function asignarConsejeroAction(input: {
  docenteId: string
  cohorte: string
  semestres: number
}): Promise<{ error: string } | { success: true }> {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autenticado." }

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
  if (autoridad.tipo === null) {
    return { error: "No tienes autoridad académica para asignar consejeros." }
  }

  const docente = await prisma.docente.findUnique({
    where: { id: input.docenteId },
    select: { id: true, nombre: true, programa: true, facultad: true, modalidad: true },
  })
  if (!docente) return { error: "Docente no encontrado." }

  if (!puedeGestionarFormulario(autoridad, { id: docente.id, programa: docente.programa, facultad: docente.facultad })) {
    return { error: `${docente.nombre} está fuera de tu ámbito. Solo podés asignar consejeros de tu ${autoridad.ambito === "FACULTAD" ? "facultad" : "programa"}.` }
  }

  if (docente.modalidad === "CATEDRA") {
    return { error: "Los docentes catedráticos no ejercen consejería académica (Art. 11)." }
  }

  const periodo = await getPeriodoActivo()
  if (!periodo) return { error: "No hay un período académico activo." }

  try {
    await prisma.$transaction(async (tx) => {
      await reservarCompromisos(tx, docente.id, docente.programa, periodo, [
        { cohorte: input.cohorte, semestres: input.semestres },
      ])
    })
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo asignar el consejero." }
  }

  revalidatePath("/gestion/consejeria")
  revalidatePath("/gestion/agendas")
  return { success: true }
}
