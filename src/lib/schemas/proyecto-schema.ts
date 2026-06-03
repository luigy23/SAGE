import { z } from "zod"

export const ROLES_POR_TIPO = {
  INVESTIGACION: ["INVESTIGADOR_PRINCIPAL", "COINVESTIGADOR"],
  PROYECCION_SOCIAL: ["COORDINADOR", "COGESTOR"],
} as const

/** Rol "líder" (único por proyecto) según el tipo. */
export const ROL_LIDER = {
  INVESTIGACION: "INVESTIGADOR_PRINCIPAL",
  PROYECCION_SOCIAL: "COORDINADOR",
} as const

export const participanteSchema = z.object({
  docenteId: z.string().min(1, "Falta el docente."),
  rol: z.enum([
    "INVESTIGADOR_PRINCIPAL",
    "COINVESTIGADOR",
    "COORDINADOR",
    "COGESTOR",
  ]),
})

export const crearProyectoSchema = z.object({
  titulo: z
    .string()
    .min(5, "El título debe tener al menos 5 caracteres.")
    .max(200, "El título no puede superar 200 caracteres."),
  descripcion: z.string().max(1000).optional(),
  tipo: z.enum(["INVESTIGACION", "PROYECCION_SOCIAL"], {
    error: "Seleccioná el tipo de proyecto.",
  }),
  rolDocente: z.enum(
    ["INVESTIGADOR_PRINCIPAL", "COINVESTIGADOR", "COORDINADOR", "COGESTOR"],
    { error: "Seleccioná tu rol en el proyecto." },
  ),
  entidadConvocatoria: z.string().max(200).optional(),
  periodoInicio: z.string().max(20).optional(),
  // Participantes ADICIONALES (sin el creador, que se agrega aparte con `rolDocente`).
  participantes: z.array(participanteSchema).optional(),
})

export type CrearProyectoInput = z.infer<typeof crearProyectoSchema>
export type ParticipanteInput = z.infer<typeof participanteSchema>
