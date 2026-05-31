import { z } from "zod"
import { MODALIDADES_ENUM } from "@/lib/schemas/profile-schema"

/**
 * Schema para una Solicitud de Cambio de Perfil.
 *
 * Todos los campos son opcionales — el docente solo envía los que quiere
 * cambiar. Las reglas estatutarias (CATEDRA, cargo) se aplican sobre el
 * estado RESULTANTE (los campos enviados sobreescriben los actuales del
 * docente), por eso esta validación se hace en el server con el contexto
 * completo. Aquí solo se valida la forma de los datos.
 */
export const SEDES_ENUM = ["NEIVA", "PITALITO", "GARZON", "LA_PLATA"] as const

export const solicitudCambioPerfilInputSchema = z.object({
  modalidad: z.enum(MODALIDADES_ENUM).optional(),
  programa: z.string().trim().min(1).max(200).optional(),
  facultad: z.string().trim().min(1).max(200).optional(),
  sedeBase: z.enum(SEDES_ENUM).optional(),
  cargoAdministrativo: z.boolean().optional(),
  tipoCargo: z.string().trim().max(80).nullable().optional(),
  doctorado: z.boolean().optional(),
  tituloDoctorado: z.string().trim().max(200).nullable().optional(),
  semanasVinculacion: z.coerce.number().int().min(1).max(22).nullable().optional(),
  celular: z.string().trim().max(30).nullable().optional(),
  motivoSolicitud: z.string().trim().max(500).optional(),
})

export type SolicitudCambioPerfilInput = z.infer<typeof solicitudCambioPerfilInputSchema>

/**
 * Lista canónica de campos editables vía solicitud. Útil para iterar y
 * construir el diff antes/después.
 */
export const CAMPOS_EDITABLES = [
  "modalidad",
  "programa",
  "facultad",
  "sedeBase",
  "cargoAdministrativo",
  "tipoCargo",
  "doctorado",
  "tituloDoctorado",
  "semanasVinculacion",
  "celular",
] as const

export type CampoEditable = (typeof CAMPOS_EDITABLES)[number]

export const ETIQUETAS_CAMPOS: Record<CampoEditable, string> = {
  modalidad: "Modalidad",
  programa: "Programa",
  facultad: "Facultad",
  sedeBase: "Sede",
  cargoAdministrativo: "Cargo administrativo",
  tipoCargo: "Tipo de cargo",
  doctorado: "Doctorado",
  tituloDoctorado: "Título de doctorado",
  semanasVinculacion: "Semanas de vinculación",
  celular: "Celular",
}
