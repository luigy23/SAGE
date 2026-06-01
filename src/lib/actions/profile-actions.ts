"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { profileSchema, type ProfileFormData } from "@/lib/schemas/profile-schema"
import type { Modalidad } from "@/generated/prisma/client"

/**
 * updateProfileAction — Server Action for profile academic data updates.
 *
 * Implements Lock #3 (Server Action Override Lock) of the Triple-Lock architecture:
 * Even after Zod validation passes, this function explicitly forces
 * cargoAdministrativo and proyectosActivos to false for CATEDRA modality
 * before writing to the database. This is an unbypassable backend guard.
 */
export async function updateProfileAction(
  data: ProfileFormData
): Promise<{ success?: boolean; error?: string }> {
  // 1. Authentication guard
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "No autenticado. Inicie sesión nuevamente." }
  }

  // 2. Lock #2: Zod schema validation
  const parsed = profileSchema.safeParse(data)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || "Datos inválidos."
    return { error: firstError }
  }

  // 2b. Validate semanasVinculacion against the configured semanasPeriodo from DB
  if (parsed.data.semanasVinculacion != null) {
    const { resolveGlobales } = await import("@/lib/rules/resolver")
    const globales = await resolveGlobales(null)
    if (parsed.data.semanasVinculacion > globales.semanasPeriodo) {
      return { error: `Las semanas de vinculación no pueden superar las ${globales.semanasPeriodo} semanas del período.` }
    }
  }

  // 3. Lock #3: Server-side override — unbypassable
  const isCatedra = parsed.data.modalidad === "CATEDRA"
  const finalCargoAdministrativo = isCatedra ? false : parsed.data.cargoAdministrativo
  const finalProyectosActivos = isCatedra ? false : parsed.data.proyectosActivos

  try {
    await prisma.docente.update({
      where: { id: session.user.id },
      data: {
        modalidad: parsed.data.modalidad as Modalidad,
        doctorado: parsed.data.doctorado,
        tituloDoctorado: parsed.data.doctorado ? (parsed.data.tituloDoctorado ?? null) : null,
        cargoAdministrativo: finalCargoAdministrativo,
        tipoCargo: finalCargoAdministrativo ? parsed.data.tipoCargo : null,
        proyectosActivos: finalProyectosActivos,
        semanasVinculacion: parsed.data.semanasVinculacion ?? null,
      },
    })

    // Refresh all pages that depend on docente flags
    revalidatePath("/perfil")
    revalidatePath("/perfil/editar")
    revalidatePath("/agenda")

    return { success: true }
  } catch (error: unknown) {
    console.error("Profile update error:", error)
    return { error: "Error inesperado al actualizar el perfil. Intente de nuevo." }
  }
}
