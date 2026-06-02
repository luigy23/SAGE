import { z } from "zod"

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
})

export type CrearProyectoInput = z.infer<typeof crearProyectoSchema>
