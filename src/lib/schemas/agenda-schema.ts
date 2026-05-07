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

// Default semestral: 22 semanas (Acuerdo 048). Se sobreescribe vía
// SUPERADMIN al crear el schema dinámico con `createAgendaSchema(...)`.
export const DEFAULT_SEMANAS_PERIODO = 22

export function createCursoAgendaSchema(semanasPeriodo: number = DEFAULT_SEMANAS_PERIODO) {
  return z.object({
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
      .max(semanasPeriodo, `Máximo ${semanasPeriodo} semanas por semestre.`),

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
}

// Schema con default — usado para inferencia de tipos y como fallback
export const cursoAgendaSchema = createCursoAgendaSchema()
export type CursoAgendaFormData = z.infer<typeof cursoAgendaSchema>

export function createActividadSchema(semanasPeriodo: number = DEFAULT_SEMANAS_PERIODO) {
  return z.object({
    nombre: z.string().min(1, "El nombre de la actividad es obligatorio"),
    descripcion: z.string().optional().default(""),
    horasSemanales: z.coerce
      .number()
      .min(0, "No puede ser negativo")
      .max(40, "No puede exceder las 40 horas semanales.")
      .default(0),
    semanas: z.coerce
      .number()
      .int("Debe ser un número entero")
      .min(0, "No puede ser negativo")
      .max(semanasPeriodo, `Máximo ${semanasPeriodo} semanas por semestre.`)
      .default(0),
    dedicacionPeriodo: z.coerce
      .number()
      .min(0, "No puede ser negativo")
      .max(880, "No puede exceder 880 horas en el semestre.")
      .default(0),
  }).transform((data) => {
    // Si el usuario llenó h/sem × semanas, ese cálculo gana; si no, se preserva
    // el `dedicacionPeriodo` ingresado directamente (modo "total semestre").
    const calculadoPorSemana =
      data.horasSemanales > 0 && data.semanas > 0
        ? data.horasSemanales * data.semanas
        : null
    return {
      ...data,
      dedicacionPeriodo: calculadoPorSemana ?? data.dedicacionPeriodo,
    }
  })
}

export const actividadSchema = createActividadSchema()
export type ActividadFormData = z.infer<typeof actividadSchema>

export function createAgendaWizardBaseSchema(semanasPeriodo: number = DEFAULT_SEMANAS_PERIODO) {
  return z.object({
    cursos: z.array(createCursoAgendaSchema(semanasPeriodo)).default([]),
    otrasActividadesDocencia: z.array(createActividadSchema(semanasPeriodo)).default([]),
    actividadesInvestigacion: z.array(createActividadSchema(semanasPeriodo)).default([]),
    actividadesProyeccionSocial: z.array(createActividadSchema(semanasPeriodo)).default([]),
    actividadesGestion: z.array(createActividadSchema(semanasPeriodo)).default([]),
  })
}

export const agendaWizardBaseSchema = createAgendaWizardBaseSchema()
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

export function createAgendaSchema(
  maxHoras: number,
  esEstricto: boolean,
  flags: DocenteFlags,
  minDocencia: number = 0,
  semanasPeriodo: number = DEFAULT_SEMANAS_PERIODO,
) {
  return createAgendaWizardBaseSchema(semanasPeriodo).superRefine((data, ctx) => {
    const totalHorasSemestrales = calcularTotalHoras(data);
    const maxHorasSemestrales = maxHoras * semanasPeriodo; // tope semestral derivado del semanal
    const TOLERANCIA_SEMANAL = 0.5;
    const maxPermitido = (maxHoras + TOLERANCIA_SEMANAL) * semanasPeriodo;

    // 1. TOPE MÁXIMO (Acuerdo 048 Arts. 4a/4b/4c/4d)
    // `maxHoras` es el límite superior contractual, NO una obligación de
    // igualdad. El docente puede registrar menos horas que el tope.
    if (esEstricto && totalHorasSemestrales > maxPermitido) {
      const exceso = Math.round((totalHorasSemestrales - maxPermitido) * 10) / 10;
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Su dedicación (${totalHorasSemestrales}h) excede en ${exceso}h el tope contractual semestral (${maxPermitido}h). Reduzca actividades para continuar.`,
        path: ["_horasExcedidas"],
      });
    }

    // 2. MÍNIMO DE DOCENCIA (Art. 3) — se evalúa sobre las horas de docencia
    // (cursos + otras actividades de docencia), no sobre el total de la agenda.
    // `minDocencia` ya viene ajustado según `proyectosActivos` (Art. 3 Par. 1).
    if (minDocencia > 0) {
      const horasDocencia =
        data.cursos.reduce((acc, c) => acc + (Number(c.dedicacionPeriodo) || 0), 0) +
        data.otrasActividadesDocencia.reduce(
          (acc, a) => acc + (Number(a.dedicacionPeriodo) || 0),
          0
        );

      if (horasDocencia < minDocencia) {
        const deficit = Math.round((minDocencia - horasDocencia) * 10) / 10;
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Sus horas de docencia (${horasDocencia}h) están ${deficit}h por debajo del mínimo legal (${minDocencia}h). Revisar Paso 2 (Art. 3 Acuerdo 048).`,
          path: ["_minDocenciaInsuficiente"],
        });
      }
    }

    // 3. ARTÍCULO 10: Gestión Académico Administrativa
    const horasGestion = data.actividadesGestion.reduce((acc, item) => acc + (Number(item.dedicacionPeriodo) || 0), 0);
    if (horasGestion > 0 && !flags.cargoAdministrativo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "No puede asignar horas de Gestión porque no tiene un Cargo Administrativo registrado en su perfil.",
        path: ["actividadesGestion"],
      });
    }

    // El límite del 20% para gestión se calcula sobre la dedicación total del semestre
    const limiteGestionSemestral = maxHorasSemestrales * 0.20;
    if (flags.cargoAdministrativo && horasGestion > limiteGestionSemestral) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Las horas de gestión semestrales (${horasGestion}h) no pueden exceder el 20% de su carga laboral (${limiteGestionSemestral}h).`,
        path: ["actividadesGestion"],
      });
    }

    // 4. ART. 4, PAR. 3: Docentes con Doctorado deben registrar investigación
    if (flags.doctorado) {
      const horasInvestigacion = data.actividadesInvestigacion.reduce(
        (acc, a) => acc + (Number(a.dedicacionPeriodo) || 0),
        0
      );
      if (horasInvestigacion <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Por normativa institucional, los docentes con título de Doctorado deben registrar tiempo de investigación.",
          path: ["actividadesInvestigacion"],
        });
      }
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
  horasSemanales: 0,
  semanas: 0,
  dedicacionPeriodo: 0,
}

export const DEFAULT_FORM_VALUES: AgendaWizardFormData = {
  cursos: [],
  otrasActividadesDocencia: [],
  actividadesInvestigacion: [],
  actividadesProyeccionSocial: [],
  actividadesGestion: [],
}