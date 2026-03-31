import { z } from "zod"

// ==========================================
// Sub-esquemas para los modelos anidados
// ==========================================

/**
 * Valida un rango horario en formato "HH:MM-HH:MM".
 * Acepta null/undefined/empty string → se transforma a null.
 */
const horarioStringSchema = z
  .string()
  .nullable()
  .optional()
  .transform((val) => {
    if (!val || val.trim() === "") return null
    return val
  })
  .refine(
    (val) => {
      if (val === null || val === undefined) return true
      return /^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/.test(val)
    },
    { message: "Formato inválido. Use HH:MM-HH:MM (ej. 08:00-10:00)" }
  )
  .refine(
    (val) => {
      if (val === null || val === undefined) return true
      const parts = val.split("-")
      const inicio = parts[0]?.trim()
      const fin = parts[1]?.trim()
      if (!inicio || !fin) return true
      // Comparación alfanumérica: "08:00" < "10:00" funciona en formato 24h
      return inicio < fin
    },
    { message: "La hora de fin debe ser posterior a la hora de inicio" }
  )

/**
 * Schema para HorarioCurso — mapea al model Prisma HorarioCurso.
 * Cada día es un String? con formato "HH:MM-HH:MM" o null.
 */
export const horarioCursoSchema = z.object({
  lunes: horarioStringSchema,
  martes: horarioStringSchema,
  miercoles: horarioStringSchema,
  jueves: horarioStringSchema,
  viernes: horarioStringSchema,
  sabado: horarioStringSchema,
  domingo: horarioStringSchema,
})

export type HorarioCursoFormData = z.infer<typeof horarioCursoSchema>

/**
 * Schema para CursoAgenda — mapea al model Prisma CursoAgenda.
 * Incluye horarios anidados.
 */
export const cursoAgendaSchema = z.object({
  numeroCurso: z
    .string()
    .min(1, "El número de curso es obligatorio"),
  nombreCurso: z
    .string()
    .min(1, "El nombre del curso es obligatorio"),
  subgrupo: z.string().optional().default(""),
  sede: z.string().optional().default(""),
  horasPresenciales: z.coerce
    .number()
    .int("Debe ser un número entero")
    .min(0, "No puede ser negativo")
    .max(40, "No puede exceder las 40 horas semanales legales."),
  creditos: z.coerce
    .number()
    .int("Debe ser un número entero")
    .min(0, "No puede ser negativo")
    .max(15, "Revise el valor. Un curso no suele exceder 15 créditos."),
  semanas: z.coerce
    .number()
    .int("Debe ser un número entero")
    .min(0, "No puede ser negativo")
    .max(22, "El Acuerdo 048 establece un máximo de 22 semanas por semestre."),
  dedicacionPeriodo: z.coerce
    .number()
    .min(0, "No puede ser negativo")
    .max(880, "No puede exceder el límite físico de 880 horas semestrales."),
  horarios: horarioCursoSchema.default({
    lunes: null,
    martes: null,
    miercoles: null,
    jueves: null,
    viernes: null,
    sabado: null,
    domingo: null,
  }),
})

export type CursoAgendaFormData = z.infer<typeof cursoAgendaSchema>

/**
 * Schema para actividades genéricas (ActividadDocencia, ActividadInvestigacion,
 * ActividadProyeccionSocial, ActividadGestion).
 * Mapea a los models Prisma correspondientes.
 */
export const actividadSchema = z.object({
  nombre: z
    .string()
    .min(1, "El nombre de la actividad es obligatorio"),
  descripcion: z.string().optional().default(""),
  dedicacionPeriodo: z.coerce
    .number()
    .min(0, "No puede ser negativo")
    .max(880, "La dedicación máxima semestral es de 880 horas."),
})

export type ActividadFormData = z.infer<typeof actividadSchema>

// ==========================================
// Schema principal del Wizard
// ==========================================

/**
 * Schema base sin la validación de horas máximas.
 * Se compone con superRefine dinámicamente según la modalidad.
 */
const agendaWizardBaseSchema = z.object({
  cursos: z.array(cursoAgendaSchema).default([]),
  otrasActividadesDocencia: z.array(actividadSchema).default([]),
  actividadesInvestigacion: z.array(actividadSchema).default([]),
  actividadesProyeccionSocial: z.array(actividadSchema).default([]),
  actividadesGestion: z.array(actividadSchema).default([]),
})

export type AgendaWizardFormData = z.infer<typeof agendaWizardBaseSchema>

/**
 * Calcula el total de horas de dedicación de todos los arrays del formulario.
 */
export function calcularTotalHoras(data: AgendaWizardFormData): number {
  const sumArray = (items: { dedicacionPeriodo: number }[]) =>
    items.reduce((acc, item) => acc + (Number(item.dedicacionPeriodo) || 0), 0)

  return (
    sumArray(data.cursos) +
    sumArray(data.otrasActividadesDocencia) +
    sumArray(data.actividadesInvestigacion) +
    sumArray(data.actividadesProyeccionSocial) +
    sumArray(data.actividadesGestion)
  )
}

/**
 * Crea el schema Zod completo con validación de horas máximas.
 *
 * @param maxHoras - Máximo de horas según modalidad (40 para TCP/TCO/CATEDRA, 20 para MTP/MTC)
 * @param esEstricto - Si true, superar maxHoras genera error de validación.
 *                     Si false (CATEDRA), solo se muestra advertencia visual.
 */
export function createAgendaSchema(maxHoras: number, esEstricto: boolean) {
  return agendaWizardBaseSchema.superRefine((data, ctx) => {
    const totalHoras = calcularTotalHoras(data)

    if (esEstricto && totalHoras > maxHoras) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `El total de horas (${totalHoras}) supera el máximo permitido (${maxHoras}h) para su modalidad.`,
        path: ["_horasExcedidas"],
      })
    }
  })
}

// ==========================================
// Tipos para el payload del Server Action
// ==========================================

/**
 * Payload que el wizard envía al server action.
 * Incluye metadata de la agenda + los arrays del formulario.
 */
export interface AgendaWizardPayload {
  periodo: string
  enviar: boolean // true = cambiar estado a ENVIADO, false = guardar como BORRADOR
  data: AgendaWizardFormData
}

// ==========================================
// Valores por defecto para inicializar el formulario
// ==========================================

export const EMPTY_HORARIO: HorarioCursoFormData = {
  lunes: null,
  martes: null,
  miercoles: null,
  jueves: null,
  viernes: null,
  sabado: null,
  domingo: null,
}

export const EMPTY_CURSO: CursoAgendaFormData = {
  numeroCurso: "",
  nombreCurso: "",
  subgrupo: "",
  sede: "",
  horasPresenciales: 0,
  creditos: 0,
  semanas: 0,
  dedicacionPeriodo: 0,
  horarios: { ...EMPTY_HORARIO },
}

export const EMPTY_ACTIVIDAD: ActividadFormData = {
  nombre: "",
  descripcion: "",
  dedicacionPeriodo: 0,
}

export const DEFAULT_FORM_VALUES: AgendaWizardFormData = {
  cursos: [],
  otrasActividadesDocencia: [],
  actividadesInvestigacion: [],
  actividadesProyeccionSocial: [],
  actividadesGestion: [],
}
