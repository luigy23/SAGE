import { z } from "zod"
import { cohorteVigente } from "@/lib/utils/periodo"

// Default semestral: 22 semanas (Acuerdo 048). Se sobreescribe vía
// SUPERADMIN al crear el schema dinámico con `createAgendaSchema(...)`.
export const DEFAULT_SEMANAS_PERIODO = 22

// Semanas de CLASE por defecto: base del cálculo de horas de los cursos,
// independiente de las semanas del contrato. Aunque el contrato sea de 22
// semanas, las clases corren 16. Parametrizable vía `semanas_clases` (SUPERADMIN).
export const DEFAULT_SEMANAS_CLASES = 16

const FACTOR_POR_TIPO: Record<string, { factorHoras: number; constanteSuma: number }> = {
  TEORICO: { factorHoras: 2, constanteSuma: 1 },
  TEORICO_PRACTICO: { factorHoras: 1.5, constanteSuma: 1 },
  PRACTICO: { factorHoras: 1, constanteSuma: 1 },
}

export function createCursoAgendaSchema(
  semanasPeriodo: number = DEFAULT_SEMANAS_PERIODO,
  semanasClases: number = DEFAULT_SEMANAS_CLASES,
) {
  return z.object({
    // FK al catálogo maestro. null cuando el curso se ingresó a mano (no se eligió del catálogo).
    // Es la única señal real de "este CursoAgenda usa este CursoMaestro" — sostén del safeguard
    // de borrado en /admin/cursos.
    cursoMaestroId: z.string().nullable().optional(),
    // Tipo de curso del catálogo (TEORICO, TEORICO_PRACTICO, PRACTICO). null para cursos manuales.
    // Controla el factorHoras según Art. 3 Par. 4 Acuerdo 048.
    tipoCurso: z.enum(["TEORICO", "TEORICO_PRACTICO", "PRACTICO"]).nullable().optional(),
    numeroCurso: z.string().min(1, "El número de curso es obligatorio"),
    nombreCurso: z.string().min(1, "El nombre del curso es obligatorio"),
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
    // Semanas de CLASE del curso. Default = semanas_clases (16), tope = semanas
    // del contrato (semanasPeriodo). Independiente de las semanas del contrato.
    semanas: z.coerce
      .number()
      .int("Debe ser un número entero")
      .min(0, "No puede ser negativo")
      .max(semanasPeriodo, `Máximo ${semanasPeriodo} semanas por semestre.`)
      .default(semanasClases),

    dedicacionPeriodo: z.coerce.number().optional().default(0),
  }).transform((data) => {
    // Art. 3 Par. 4 Acuerdo 048: factor varía según tipo de curso.
    // El curso se calcula sobre sus SEMANAS DE CLASE (data.semanas, default 16),
    // no sobre las semanas del contrato. Coincide con SilentDedicacionCalc, que
    // también multiplica por el campo `semanas` del curso.
    // Guard horas > 0 igual al de SilentDedicacionCalc (constanteSuma no aplica si no hay horas).
    const f = FACTOR_POR_TIPO[data.tipoCurso ?? "TEORICO_PRACTICO"] ?? { factorHoras: 1.5, constanteSuma: 1 }
    const horasSemanalesCalculadas = data.horasPresenciales > 0
      ? (data.horasPresenciales * f.factorHoras) + f.constanteSuma
      : 0
    const semanasClasesEf = Number(data.semanas) > 0 ? Number(data.semanas) : semanasClases
    const calculoLegalTotal = horasSemanalesCalculadas * semanasClasesEf

    return {
      ...data,
      dedicacionPeriodo: calculoLegalTotal
    }
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
    // Cantidad de unidades para actividades con tope por unidad (Art. 11):
    // cohortes (Consejería), estudiantes (Asesorías), trabajos (Dirección tesis)
    cantidadUnidades: z.coerce
      .number()
      .int("Debe ser un número entero")
      .min(0, "No puede ser negativo")
      .optional()
      .default(0),
    // Sede de ejecución (Art. 11). Obligatoria al ENVIAR cuando el catálogo
    // dice aplicaUnoPorSede=true o topePorUnidad=SEDE. Informativa en el resto
    // (autocompletada desde docente.sedeBase en el wizard).
    sede: z.string().nullable().optional().default(null),
    // Cohortes (períodos de ingreso, ej. "2026-1") para actividades medidas por
    // COHORTE (Consejería, Art. 11). Vacío para el resto.
    cohortes: z.array(z.string()).optional().default([]),
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

export function createAgendaWizardBaseSchema(
  semanasPeriodo: number = DEFAULT_SEMANAS_PERIODO,
  semanasClases: number = DEFAULT_SEMANAS_CLASES,
) {
  return z.object({
    cursos: z.array(createCursoAgendaSchema(semanasPeriodo, semanasClases)).default([]),
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
  // Art. 3 Par. 1 Acuerdo 048: Jefes de Programa deben orientar mínimo un curso.
  // Derivado de `Docente.tipoCargo` vía `esJefeDePrograma()`.
  esJefeDePrograma: boolean;
}

/**
 * Detalle de tope por actividad del catálogo (Art. 11 Acuerdo 048).
 *
 * Tres ramas de validación:
 *   A) topePorUnidad !== NINGUNA + topeSemestralH set → tope por unidad fijo
 *      (ej: Consejería = 48h × #cohortes, máx 2)
 *   B) topePorUnidad !== NINGUNA + topeSemanalHPorUnidad set → tope semanal por unidad
 *      (ej: Asesoría PP = 2h/sem × #estudiantes; Dirección tesis = 2h/sem × #trabajos)
 *   C) topePorUnidad === NINGUNA → tope plano semestral (comportamiento original)
 */
export type ActividadTopeDetalle = {
  topeSemestralH: number | null
  topePorUnidad: string  // "NINGUNA" | "COHORTE" | "ESTUDIANTE" | "PROYECTO" | "SEDE"
  topeSemanalHPorUnidad: number | null
  unidadMax: number | null
  cantidadMaxSimultaneos: number | null
  requiereProyectoAprobado: boolean
  aplicaUnoPorFacultad: boolean
  aplicaUnoPorSede: boolean
  aplicaUnoPorPrograma: boolean
  // Art. 11: "Supeditadas a asignación de funciones por parte del Rector mediante resolución".
  // Cableado en Paso 1 (saneamiento). La validación dura (rechazar el envío
  // si no hay resolución acreditada) llegará en un paso posterior cuando se
  // defina cómo capturar la evidencia de la resolución.
  requiereResolucionRector: boolean
}

export type TopesActividadesMap = Record<string, ActividadTopeDetalle>

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
  maxInvProySocialCatedra: number | null = null,
  maxGestionOverride?: number,
  periodoActual?: string,
  semanasClases: number = DEFAULT_SEMANAS_CLASES,
) {
  return createAgendaWizardBaseSchema(semanasPeriodo, semanasClases).superRefine((data, ctx) => {
    const totalHorasSemestrales = calcularTotalHoras(data);
    const maxHorasSemestrales = maxHoras * semanasPeriodo; // tope semestral derivado del semanal
    const TOLERANCIA_SEMANAL = 0.5;
    const maxPermitido = (maxHoras + TOLERANCIA_SEMANAL) * semanasPeriodo;

    // 0a. ART. 3 PAR. 1 — Jefes de Programa deben orientar mínimo un curso.
    // Bloqueo duro al enviar. El warning informativo (sin bloqueo) vive en
    // `validateAgenda()` para mostrarse en el panel desde el step de Docencia.
    //
    // IMPORTANTE: usamos un path sintético (no `["cursos"]`) para que la regla
    // NO bloquee el avance entre steps del wizard. `handleNext()` llama a
    // `form.trigger(["cursos", "otrasActividadesDocencia"])` y captura issues
    // en esos paths; con un path sintético solo se dispara en `form.trigger()`
    // sin argumentos (envío final). Sigue el patrón de `_horasExcedidas`,
    // `_minDocenciaInsuficiente`, `_catedraInvPSExcedido`.
    if (flags.esJefeDePrograma && data.cursos.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "El Acuerdo 048 Art. 3 Par. 1 exige que los Jefes de Programa orienten mínimo un curso. Agregue al menos un curso a su agenda para enviar.",
        path: ["_jefeProgramaSinCursos"],
      });
    }

    // 0. SEDE DE CURSO OBLIGATORIA al enviar (Acuerdo 048 + formato oficial FO-19).
    // En borrador es opcional para no bloquear el flujo de carga progresiva.
    data.cursos.forEach((curso, idx) => {
      if (!curso.sede || curso.sede.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La sede del curso es obligatoria.",
          path: ["cursos", idx, "sede"],
        });
      }
    });

    // 1. TOPE MÁXIMO (Acuerdo 048 Arts. 4a/4b/4c/4d)
    if (esEstricto && totalHorasSemestrales > maxPermitido) {
      const exceso = Math.round((totalHorasSemestrales - maxPermitido) * 10) / 10;
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Su dedicación (${totalHorasSemestrales}h) excede en ${exceso}h el tope contractual semestral (${maxPermitido}h). Reduzca actividades para continuar.`,
        path: ["_horasExcedidas"],
      });
    }

    // 2. MÍNIMO DE DOCENCIA (Art. 3)
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

    if (flags.cargoAdministrativo && !flags.excluyeTopeGestion20) {
      const limiteGestionSemestral = maxGestionOverride ?? maxHorasSemestrales * 0.20;
      if (horasGestion > limiteGestionSemestral) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Las horas de gestión semestrales (${horasGestion}h) no pueden exceder el límite permitido de su carga laboral (${limiteGestionSemestral}h).`,
          path: ["actividadesGestion"],
        });
      }
    }

    // 4. ART. 11: Topes individuales por actividad del catálogo.
    //
    // Tres ramas según la naturaleza del tope:
    //
    //   RAMA A — topePorUnidad !== NINGUNA y topeSemestralH set:
    //     Tope semestral POR UNIDAD (ej: Consejería = 48h/cohorte, máx 2 cohortes).
    //     maxPermitido = topeSemestralH × min(cantidadUnidades || 1, unidadMax)
    //
    //   RAMA B — topePorUnidad !== NINGUNA y topeSemanalHPorUnidad set:
    //     Tope semanal POR UNIDAD (ej: Dirección tesis = 2h/sem × #trabajos, máx 3).
    //     maxPermitido = topeSemanalHPorUnidad × min(cantidadUnidades, cantMaxSim) × semanas
    //     También valida que cantidadUnidades no supere cantidadMaxSimultaneos.
    //
    //   RAMA C — topePorUnidad === NINGUNA:
    //     Tope plano semestral. Comportamiento original.
    //
    // Si la actividad no está en el mapa (texto libre legacy o genérico sin tope), se omite.
    if (topesActividades) {
      const validarTopesArray = (
        arr: { nombre?: string; dedicacionPeriodo?: number; cantidadUnidades?: number; sede?: string | null; cohortes?: string[] }[],
        arrayName: "otrasActividadesDocencia" | "actividadesInvestigacion" | "actividadesProyeccionSocial" | "actividadesGestion",
        categoria: "DOCENCIA" | "INVESTIGACION" | "PROYECCION_SOCIAL" | "GESTION",
      ) => {
        arr.forEach((act, idx) => {
          const nombre = act.nombre?.trim()
          if (!nombre) return

          const tope = topesActividades[topesKey(categoria, nombre)]
          if (!tope) return

          const dedicacion = Number(act.dedicacionPeriodo) || 0
          const cantidadUnidades = Number(act.cantidadUnidades) || 0

          // requiereProyectoAprobado — independiente de la rama de topes
          if (tope.requiereProyectoAprobado && !flags.proyectosActivos) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `"${nombre}" requiere que tenga un proyecto aprobado activo (Art. 3 Par. 1). Active el flag en su perfil si corresponde.`,
              path: [arrayName, idx, "nombre"],
            })
          }

          // Sede OBLIGATORIA cuando la actividad es "Uno por Sede" o su tope se
          // calcula por sede. Sin sede no se puede enforzar Art. 11 con precisión.
          if ((tope.aplicaUnoPorSede || tope.topePorUnidad === "SEDE") && !act.sede) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `"${nombre}" requiere indicar la sede de ejecución (Art. 11 — "uno por sede").`,
              path: [arrayName, idx, "sede"],
            })
          }

          // Consejería (Art. 11): cohortes — entre 1 y unidadMax, y cada una vigente
          // (≤ 6 semestres inclusive) respecto del período de la agenda.
          if (tope.topePorUnidad === "COHORTE") {
            const cohortes = (act.cohortes ?? []).filter((c) => c && c.trim() !== "")
            const maxCohortes = tope.unidadMax ?? 1
            if (cohortes.length === 0) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `"${nombre}" requiere indicar al menos una cohorte (período de ingreso).`,
                path: [arrayName, idx, "cohortes"],
              })
            }
            if (cohortes.length > maxCohortes) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `"${nombre}" admite máximo ${maxCohortes} cohorte(s) simultánea(s) (Art. 11).`,
                path: [arrayName, idx, "cohortes"],
              })
            }
            if (periodoActual) {
              for (const c of cohortes) {
                if (!cohorteVigente(c, periodoActual)) {
                  ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `La cohorte ${c} no es válida para ${periodoActual}: ya superó los 6 semestres de consejería o aún no inicia.`,
                    path: [arrayName, idx, "cohortes"],
                  })
                }
              }
            }
          }

          if (tope.topePorUnidad !== "NINGUNA" && tope.topeSemestralH !== null) {
            // RAMA A: tope semestral por unidad (Consejería Académica)
            const unidadesEfectivas = tope.unidadMax !== null
              ? Math.min(cantidadUnidades || 1, tope.unidadMax)
              : (cantidadUnidades || 1)
            const maxTotal = tope.topeSemestralH * unidadesEfectivas
            if (dedicacion > maxTotal) {
              const exceso = Math.round((dedicacion - maxTotal) * 10) / 10
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `"${nombre}" excede el tope del Art. 11 para ${unidadesEfectivas} ${_unidadLabel(tope.topePorUnidad)}(s): máx ${maxTotal}h (${tope.topeSemestralH}h × ${unidadesEfectivas}). Actual: ${dedicacion}h. Exceso: ${exceso}h.`,
                path: [arrayName, idx, "dedicacionPeriodo"],
              })
            }
          } else if (tope.topePorUnidad !== "NINGUNA" && tope.topeSemanalHPorUnidad !== null) {
            // RAMA B: tope semanal por unidad (Asesorías, Dirección tesis)
            if (tope.cantidadMaxSimultaneos !== null && cantidadUnidades > tope.cantidadMaxSimultaneos) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `"${nombre}" no puede tener más de ${tope.cantidadMaxSimultaneos} ${_unidadLabel(tope.topePorUnidad)}(s) simultáneos (Art. 11).`,
                path: [arrayName, idx, "cantidadUnidades"],
              })
            }
            if (cantidadUnidades > 0) {
              const unidadesEfectivas = tope.cantidadMaxSimultaneos !== null
                ? Math.min(cantidadUnidades, tope.cantidadMaxSimultaneos)
                : cantidadUnidades
              const maxTotal = tope.topeSemanalHPorUnidad * unidadesEfectivas * semanasPeriodo
              if (dedicacion > maxTotal) {
                const exceso = Math.round((dedicacion - maxTotal) * 10) / 10
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: `"${nombre}" excede el tope del Art. 11: máx ${maxTotal}h (${tope.topeSemanalHPorUnidad}h/sem × ${unidadesEfectivas} ${_unidadLabel(tope.topePorUnidad)}(s) × ${semanasPeriodo} sem). Actual: ${dedicacion}h. Exceso: ${exceso}h.`,
                  path: [arrayName, idx, "dedicacionPeriodo"],
                })
              }
            }
          } else if (tope.topePorUnidad === "NINGUNA" && tope.topeSemestralH !== null) {
            // RAMA C: tope plano semestral (comportamiento original)
            if (dedicacion > tope.topeSemestralH) {
              const exceso = Math.round((dedicacion - tope.topeSemestralH) * 10) / 10
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `"${nombre}" excede su tope individual del Art. 11 (máx ${tope.topeSemestralH}h). Actual: ${dedicacion}h. Reduzca las horas en ${exceso}h o seleccione otra actividad.`,
                path: [arrayName, idx, "dedicacionPeriodo"],
              })
            }
          }
        })
      }

      validarTopesArray(data.otrasActividadesDocencia, "otrasActividadesDocencia", "DOCENCIA")
      validarTopesArray(data.actividadesInvestigacion, "actividadesInvestigacion", "INVESTIGACION")
      validarTopesArray(data.actividadesProyeccionSocial, "actividadesProyeccionSocial", "PROYECCION_SOCIAL")
      validarTopesArray(data.actividadesGestion, "actividadesGestion", "GESTION")
    }

    // 5. ART. 3 PAR. 2: Tope de cátedra en Investigación + Proyección Social combinadas.
    if (maxInvProySocialCatedra !== null) {
      const invPS =
        data.actividadesInvestigacion.reduce(
          (acc, a) => acc + (Number(a.dedicacionPeriodo) || 0), 0
        ) +
        data.actividadesProyeccionSocial.reduce(
          (acc, a) => acc + (Number(a.dedicacionPeriodo) || 0), 0
        )
      if (invPS > maxInvProySocialCatedra) {
        const exceso = Math.round((invPS - maxInvProySocialCatedra) * 10) / 10
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `La suma de Investigación + Proyección Social (${invPS}h) excede en ${exceso}h el tope de cátedra (${maxInvProySocialCatedra}h = 4h/sem × ${semanasPeriodo} sem). Art. 3 Par. 2 Acuerdo 048.`,
          path: ["_catedraInvPSExcedido"],
        })
      }
    }
  });
}

function _unidadLabel(topePorUnidad: string): string {
  const labels: Record<string, string> = {
    COHORTE: "cohorte",
    ESTUDIANTE: "estudiante",
    PROYECTO: "trabajo",
    SEDE: "sede",
    FACULTAD: "facultad",
  }
  return labels[topePorUnidad] ?? topePorUnidad.toLowerCase()
}

export interface AgendaWizardPayload {
  periodo: string
  enviar: boolean
  semanasAgenda: number
  data: AgendaWizardFormData
  /**
   * Creación/edición DELEGADA: id del docente objetivo (No-Planta) cuando un
   * Jefe de Programa / Decano gestiona la agenda en su nombre. Si se omite o
   * coincide con el usuario en sesión, el flujo es el propio del docente (sin
   * cambios). La autorización (scope + modalidad No-Planta) se valida en servidor.
   */
  targetDocenteId?: string
}

export const EMPTY_CURSO: CursoAgendaFormData = {
  cursoMaestroId: null,
  tipoCurso: null,
  numeroCurso: "",
  nombreCurso: "",
  sede: "",
  horasPresenciales: 0,
  creditos: 0,
  semanas: 0,
  dedicacionPeriodo: 0,
}

export const EMPTY_ACTIVIDAD: ActividadFormData = {
  nombre: "",
  descripcion: "",
  horasSemanales: 0,
  semanas: 0,
  dedicacionPeriodo: 0,
  cantidadUnidades: 0,
  sede: null,
  cohortes: [],
}

export const DEFAULT_FORM_VALUES: AgendaWizardFormData = {
  cursos: [],
  otrasActividadesDocencia: [],
  actividadesInvestigacion: [],
  actividadesProyeccionSocial: [],
  actividadesGestion: [],
}
