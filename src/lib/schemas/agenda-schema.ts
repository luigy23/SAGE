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
  // Art. 10 + Art. 11 Acuerdo 048: cargos exentos del tope del 20% de gestión.
  // Derivado de `Docente.tipoCargo` vía `esCargoExentoGestion20()`.
  excluyeTopeGestion20: boolean;
}

/**
 * Mapa de topes individuales por actividad (Art. 11 Acuerdo 048).
 * Clave: `${categoria}::${nombre}` (ej: "GESTION::Jefatura de Programa").
 * Valor: tope semestral en horas (`topeSemestralH` del catálogo).
 *
 * Si una actividad no está en el mapa o tiene tope null, se omite la
 * validación individual para esa entrada (comportamiento permisivo:
 * compatible con borradores legacy con nombres libres y con la opción
 * genérica "Otras Actividades Académico-Administrativas").
 */
export type TopesActividadesMap = Record<string, number>

export function topesKey(categoria: "DOCENCIA" | "INVESTIGACION" | "PROYECCION_SOCIAL" | "GESTION", nombre: string): string {
  return `${categoria}::${nombre}`
}

export function createAgendaSchema(
  maxHoras: number,
  esEstricto: boolean,
  flags: DocenteFlags,
  minDocencia: number = 0,
  semanasPeriodo: number = DEFAULT_SEMANAS_PERIODO,
  topesActividades?: TopesActividadesMap,
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

    // Sin cargo administrativo no se pueden registrar horas de gestión.
    if (horasGestion > 0 && !flags.cargoAdministrativo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "No puede asignar horas de Gestión porque no tiene un Cargo Administrativo registrado en su perfil.",
        path: ["actividadesGestion"],
      });
    }

    // Art. 10: el límite del 20% aplica a TODOS los cargos administrativos
    // EXCEPTO Jefes de Programa, Jefes de Departamento, Asesores de Vicerrectoría,
    // Asesores de Rectoría y Decanos (esos se rigen por el Art. 11).
    if (flags.cargoAdministrativo && !flags.excluyeTopeGestion20) {
      const limiteGestionSemestral = maxHorasSemestrales * 0.20;
      if (horasGestion > limiteGestionSemestral) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Las horas de gestión semestrales (${horasGestion}h) no pueden exceder el 20% de su carga laboral (${limiteGestionSemestral}h).`,
          path: ["actividadesGestion"],
        });
      }
    }

    // NOTA: El Art. 4 Par. 3 (vinculación a grupo de investigación para
    // docentes con doctorado) es informativo en SAGE — se muestra como nota
    // sutil en la UI, no bloquea el envío. La revisión final la realiza el
    // jefe de programa en el monitoreo.

    // 4. ART. 11: Topes individuales por actividad del catálogo.
    // Solo aplica a las 4 categorías de actividades del Art. 11 (los cursos
    // tienen su propio catálogo en CursoMaestro, no aplican aquí).
    // Si la actividad no está en el mapa (texto libre legacy o genérico sin
    // tope), se omite la validación — permisivo por diseño.
    if (topesActividades) {
      const validarTopesArray = (
        arr: { nombre?: string; dedicacionPeriodo?: number }[],
        arrayName: "otrasActividadesDocencia" | "actividadesInvestigacion" | "actividadesProyeccionSocial" | "actividadesGestion",
        categoria: "DOCENCIA" | "INVESTIGACION" | "PROYECCION_SOCIAL" | "GESTION",
      ) => {
        arr.forEach((act, idx) => {
          const nombre = act.nombre?.trim()
          if (!nombre) return
          const tope = topesActividades[topesKey(categoria, nombre)]
          if (tope === undefined || tope === null) return
          const dedicacion = Number(act.dedicacionPeriodo) || 0
          if (dedicacion > tope) {
            const exceso = Math.round((dedicacion - tope) * 10) / 10
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `"${nombre}" excede su tope individual del Art. 11 (máx ${tope}h). Actual: ${dedicacion}h. Reduzca las horas en ${exceso}h o seleccione otra actividad.`,
              path: [arrayName, idx, "dedicacionPeriodo"],
            })
          }
        })
      }

      validarTopesArray(data.otrasActividadesDocencia, "otrasActividadesDocencia", "DOCENCIA")
      validarTopesArray(data.actividadesInvestigacion, "actividadesInvestigacion", "INVESTIGACION")
      validarTopesArray(data.actividadesProyeccionSocial, "actividadesProyeccionSocial", "PROYECCION_SOCIAL")
      validarTopesArray(data.actividadesGestion, "actividadesGestion", "GESTION")
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