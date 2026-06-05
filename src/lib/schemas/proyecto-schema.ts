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

/**
 * Tope de horas semestrales por rol (Art. 11) — FALLBACK hardcodeado.
 * La fuente real es el Catálogo de Actividades (editable por el superadmin):
 * `resolverTopesPorRol()` lee el `topeSemestralH` de la actividad equivalente
 * y solo cae a estos valores si el catálogo no la tiene. El revisor no puede
 * asignar más que el tope resuelto.
 */
export const TOPE_POR_ROL: Record<string, number> = {
  INVESTIGADOR_PRINCIPAL: 220,
  COINVESTIGADOR: 176,
  COORDINADOR: 220,
  COGESTOR: 110,
}

/**
 * Mapa rol del proyecto → actividad equivalente en el Catálogo de Actividades
 * (de donde sale el tope parametrizable que edita el superadmin).
 */
export const ROL_A_ACTIVIDAD_CATALOGO: Record<
  string,
  { categoria: "INVESTIGACION" | "PROYECCION_SOCIAL"; nombre: string }
> = {
  INVESTIGADOR_PRINCIPAL: { categoria: "INVESTIGACION", nombre: "Investigador Principal" },
  COINVESTIGADOR: { categoria: "INVESTIGACION", nombre: "Coinvestigador" },
  COORDINADOR: {
    categoria: "PROYECCION_SOCIAL",
    nombre: "Coordinador proyectos de proyección social aprobados por convocatoria institucional",
  },
  COGESTOR: {
    categoria: "PROYECCION_SOCIAL",
    nombre: "Cogestor proyectos de proyección social aprobados por convocatoria institucional",
  },
}

export const participanteSchema = z.object({
  docenteId: z.string().min(1, "Falta el docente."),
  rol: z.enum([
    "INVESTIGADOR_PRINCIPAL",
    "COINVESTIGADOR",
    "COORDINADOR",
    "COGESTOR",
  ]),
  // Horas PROPUESTAS al crear (≤ tope del rol). El revisor las confirma/ajusta al
  // aprobar. Opcional: si no se ponen, el revisor las asigna desde cero.
  horas: z.number().int().min(0).max(880).nullable().optional(),
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
  // Horas PROPUESTAS por el creador para sí mismo (≤ tope del rol). El revisor confirma.
  horasDocente: z.number().int().min(0).max(880).nullable().optional(),
  entidadConvocatoria: z.string().max(200).optional(),
  // Tiempo del proyecto (fechas yyyy-MM-dd). El profesor las propone; el revisor
  // las confirma/ajusta al aprobar. De aquí se derivan los semestres que abarca.
  fechaInicio: z.string().optional(),
  fechaFin: z.string().optional(),
  // Participantes ADICIONALES (sin el creador, que se agrega aparte con `rolDocente`).
  participantes: z.array(participanteSchema).optional(),
}).refine(
  (d) => !d.fechaInicio || !d.fechaFin || d.fechaFin >= d.fechaInicio,
  { message: "La fecha de fin no puede ser anterior a la de inicio.", path: ["fechaFin"] },
)

export type CrearProyectoInput = z.infer<typeof crearProyectoSchema>
export type ParticipanteInput = z.infer<typeof participanteSchema>
