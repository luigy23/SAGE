import { z } from "zod"

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
      return inicio < fin
    },
    { message: "La hora de fin debe ser posterior a la hora de inicio" }
  )

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

export const cursoAgendaSchema = z.object({
  numeroCurso: z.string().min(1, "El número de curso es obligatorio"),
  nombreCurso: z.string().min(1, "El nombre del curso es obligatorio"),
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
  
  dedicacionPeriodo: z.coerce.number().optional().default(0),
  
  horarios: horarioCursoSchema.default({
    lunes: null,
    martes: null,
    miercoles: null,
    jueves: null,
    viernes: null,
    sabado: null,
    domingo: null,
  }),
}).transform((data) => {
  const factorPreparacion = 1.5;
  const horasTutoria = 1;
  const horasSemanalesCalculadas = (data.horasPresenciales * factorPreparacion) + horasTutoria;
  const calculoLegalTotal = horasSemanalesCalculadas * data.semanas;

  return {
    ...data,
    dedicacionPeriodo: calculoLegalTotal
  };
})

export type CursoAgendaFormData = z.infer<typeof cursoAgendaSchema>

export const actividadSchema = z.object({
  nombre: z.string().min(1, "El nombre de la actividad es obligatorio"),
  descripcion: z.string().optional().default(""),
  dedicacionPeriodo: z.coerce
    .number()
    .min(0, "No puede ser negativo")
    .max(880, "La dedicación máxima semestral es de 880 horas."),
})

export type ActividadFormData = z.infer<typeof actividadSchema>

const agendaWizardBaseSchema = z.object({
  cursos: z.array(cursoAgendaSchema).default([]),
  otrasActividadesDocencia: z.array(actividadSchema).default([]),
  actividadesInvestigacion: z.array(actividadSchema).default([]),
  actividadesProyeccionSocial: z.array(actividadSchema).default([]),
  actividadesGestion: z.array(actividadSchema).default([]),
})

export type AgendaWizardFormData = z.infer<typeof agendaWizardBaseSchema>

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

// NUEVO: El schema ahora recibe las banderas académicas del usuario
export type DocenteFlags = {
  doctorado: boolean;
  cargoAdministrativo: boolean;
  proyectosActivos: boolean;
}

export function createAgendaSchema(maxHoras: number, esEstricto: boolean, flags: DocenteFlags) {
  return agendaWizardBaseSchema.superRefine((data, ctx) => {
    const totalHoras = calcularTotalHoras(data);
    
    // 1. REGLA DE TOPE MÁXIMO
    if (esEstricto && totalHoras > maxHoras) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `El total de horas (${totalHoras}) supera el máximo permitido (${maxHoras}h) para su modalidad.`,
        path: ["_horasExcedidas"],
      });
    }

    // 2. REGLA ARTÍCULO 10: Gestión Académico Administrativa
    const horasGestion = data.actividadesGestion.reduce((acc, item) => acc + (Number(item.dedicacionPeriodo) || 0), 0);
    if (horasGestion > 0 && !flags.cargoAdministrativo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "No puede asignar horas de Gestión porque no tiene un Cargo Administrativo registrado en su perfil.",
        path: ["actividadesGestion"], 
      });
    }

    // El límite del 20% para gestión se calcula sobre la dedicación total del semestre
    const limiteGestion = maxHoras * 0.20; 
    if (flags.cargoAdministrativo && horasGestion > limiteGestion) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Las horas de gestión (${horasGestion}h) no pueden exceder el 20% de su tiempo laboral (${limiteGestion}h).`,
        path: ["actividadesGestion"], 
      });
    }
  });
}

export interface AgendaWizardPayload {
  periodo: string
  enviar: boolean
  data: AgendaWizardFormData
}

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