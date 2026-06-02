"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import type { Docente } from "@/generated/prisma/client"
import {
  createAgendaSchema,
  DEFAULT_FORM_VALUES,
  topesKey,
  type AgendaWizardFormData,
  type TopesActividadesMap,
  type ActividadTopeDetalle,
} from "@/lib/schemas/agenda-schema"
import { getMaxHoras, getMinDocencia, getMaxInvProySocialCatedra } from "@/lib/utils/periodo"
import type { AgendaLimits } from "@/lib/validations/agenda-rules"
import { esCargoExentoGestion20, esJefeDePrograma } from "@/lib/utils/cargo"
import {
  upsertAgendaCompletaAction,
} from "@/lib/actions/agenda-wizard"
import { Form } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { HorasStickyHeader } from "./HorasStickyHeader"
import type { CursoMaestroOption } from "@/components/agenda/CursoMaestroSelector"
import type { ActividadCatalogoOption } from "@/components/agenda/ActividadCatalogoSelector"
import { StepIdentificacion } from "./steps/StepIdentificacion"
import { StepDocencia } from "./steps/StepDocencia"
import { StepInvestigacionProyeccion } from "./steps/StepInvestigacionProyeccion"
import { StepGestion } from "./steps/StepGestion"
import { StepRevision } from "./steps/StepRevision"
import { SilentDedicacionCalc } from "./steps/StepDocencia"
import { cn } from "@/lib/utils"
import type { FormulasCursos } from "@/lib/actions/formulas"

const DEFAULT_FORMULAS: FormulasCursos = {
  TEORICO: { factorHoras: 2, constanteSuma: 1 },
  TEORICO_PRACTICO: { factorHoras: 1.5, constanteSuma: 1 },
  PRACTICO: { factorHoras: 1, constanteSuma: 1 },
}
import {
  ChevronLeft,
  ChevronRight,
  Save,
  Send,
  Loader2,
  Check,
} from "lucide-react"

interface StepConfig {
  id: string
  label: string
  shortLabel: string
  fieldsToValidate: (keyof AgendaWizardFormData)[]
}

function buildSteps(cargoAdministrativo: boolean): StepConfig[] {
  const steps: StepConfig[] = [
    {
      id: "identificacion",
      label: "Identificación",
      shortLabel: "ID",
      fieldsToValidate: [],
    },
    {
      id: "docencia",
      label: "Docencia",
      shortLabel: "Doc",
      fieldsToValidate: ["cursos", "otrasActividadesDocencia"],
    },
    {
      id: "investigacion",
      label: "Investigación y Proyección",
      shortLabel: "Inv/Proy",
      fieldsToValidate: [
        "actividadesInvestigacion",
        "actividadesProyeccionSocial",
      ],
    },
  ]

  if (cargoAdministrativo) {
    steps.push({
      id: "gestion",
      label: "Gestión",
      shortLabel: "Gest",
      fieldsToValidate: ["actividadesGestion"],
    })
  }

  steps.push({
    id: "revision",
    label: "Revisión y Envío",
    shortLabel: "Envío",
    fieldsToValidate: [],
  })

  return steps
}

function WizardStepper({
  steps,
  currentStep,
  onStepClick,
}: {
  steps: StepConfig[]
  currentStep: number
  onStepClick: (index: number) => void
}) {
  return (
    <nav className="flex items-center gap-1 overflow-x-auto print:hidden" aria-label="Pasos del formulario">
      {steps.map((step, index) => {
        const isActive = index === currentStep
        const isCompleted = index < currentStep

        return (
          <div key={step.id} className="flex items-center">
            {index > 0 && (
              <div
                className={cn(
                  "mx-1 h-0.5 w-4 shrink-0 sm:w-8",
                  isCompleted ? "bg-primary" : "bg-border"
                )}
              />
            )}
            <button
              type="button"
              onClick={() => onStepClick(index)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all sm:text-sm",
                isActive &&
                  "bg-primary text-primary-foreground shadow-sm",
                isCompleted &&
                  !isActive &&
                  "bg-primary/10 text-primary hover:bg-primary/20",
                !isActive &&
                  !isCompleted &&
                  "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
              aria-current={isActive ? "step" : undefined}
            >
              {isCompleted && !isActive ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <span className="flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold">
                  {index + 1}
                </span>
              )}
              <span className="hidden sm:inline">{step.label}</span>
              <span className="sm:hidden">{step.shortLabel}</span>
            </button>
          </div>
        )
      })}
    </nav>
  )
}

export function AgendaWizardForm({
  docente,
  cursosMaestros,
  catalogoActividades,
  periodo,
  defaultValues,
  semanasPeriodo,
  semanasMaximas,
  defaultSemanasAgenda,
  formulas = DEFAULT_FORMULAS,
  agendaLimits,
  targetDocenteId,
  redirectOnSuccess,
}: {
  docente: Docente
  cursosMaestros: CursoMaestroOption[]
  catalogoActividades: ActividadCatalogoOption[]
  periodo: string
  defaultValues?: AgendaWizardFormData
  semanasPeriodo: number
  /** Techo máximo de semanas elegibles (semanasVinculacion o semanasPeriodo global). */
  semanasMaximas?: number
  /** Semanas guardadas en el BORRADOR (si existe). */
  defaultSemanasAgenda?: number
  formulas?: FormulasCursos
  agendaLimits?: AgendaLimits
  /**
   * Gestión DELEGADA: id del docente objetivo cuando un Jefe/Decano crea o edita
   * la agenda en su nombre. Si se omite, es el flujo propio del docente en sesión.
   */
  targetDocenteId?: string
  /** Ruta a la que volver tras enviar (usado en el flujo delegado). */
  redirectOnSuccess?: string
}) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [isSavingDraft, setIsSavingDraft] = useState(false)

  // Semanas de trabajo elegidas por el docente para esta agenda.
  // Default: semanas guardadas (BORRADOR) → semanas efectivas del resolver → semanasPeriodo global.
  const semanasMaximasEfectivas = semanasMaximas ?? agendaLimits?.semanasMaximas ?? semanasPeriodo
  const [semanasAgenda, setSemanasAgenda] = useState(
    defaultSemanasAgenda ?? agendaLimits?.semanas ?? semanasPeriodo
  )

  // =========================================================
  // Single Source of Truth: Dynamic legal limits (Art. 4)
  // Si se pasa agendaLimits (desde DB via resolver), tiene prioridad
  // sobre las funciones hardcoded de fallback (periodo.ts).
  // =========================================================
  const { maxHoras, esEstricto } = useMemo(() => {
    if (agendaLimits) {
      return { maxHoras: agendaLimits.maxHorasSemanales, esEstricto: agendaLimits.esEstricto }
    }
    return getMaxHoras(docente.modalidad, docente.sedeBase)
  }, [agendaLimits, docente.modalidad, docente.sedeBase])

  const minDocencia = useMemo(() => {
    if (agendaLimits) return agendaLimits.minDocencia
    return getMinDocencia(docente.modalidad, docente.proyectosActivos, semanasPeriodo)
  }, [agendaLimits, docente.modalidad, docente.proyectosActivos, semanasPeriodo])

  // Art. 10 + Art. 11: si el docente ocupa uno de los 5 cargos exentos
  // (Jefe de Programa/Departamento, Asesor de Vicerrectoría/Rectoría, Decano)
  // queda eximido del tope del 20% en gestión.
  const excluyeTopeGestion20 = useMemo(
    () => esCargoExentoGestion20(docente.tipoCargo),
    [docente.tipoCargo]
  )

  // Art. 3 Par. 1: Jefes de Programa deben orientar mínimo un curso.
  const esJefeProg = useMemo(
    () => esJefeDePrograma(docente.tipoCargo),
    [docente.tipoCargo]
  )

  // Art. 3 Par. 2: tope semestral de cátedra en Inv + PS combinadas.
  const maxInvProySocialCatedra = useMemo(() => {
    if (agendaLimits) return agendaLimits.maxInvProySocialCatedra
    return getMaxInvProySocialCatedra(docente.modalidad, semanasPeriodo)
  }, [agendaLimits, docente.modalidad, semanasPeriodo])

  // Art. 10: tope de gestión. Viene del resolver (DB) que aplica limiteGestionPorcentaje
  // de ParametroGlobal. Fallback: 20% hardcodeado solo si no hay agendaLimits del servidor.
  const maxGestion = useMemo(() => {
    if (agendaLimits) return agendaLimits.maxGestion
    return Math.floor(maxHoras * semanasAgenda * 0.20)
  }, [agendaLimits, maxHoras, semanasAgenda])

  // Art. 11: map de topes individuales por actividad. Se construye una sola vez
  // desde el catálogo precargado en el servidor, para validar cada actividad
  // (tope plano, tope por unidad y restricciones contextuales) en la UI.
  const topesActividades = useMemo<TopesActividadesMap>(() => {
    const map: TopesActividadesMap = {}
    for (const act of catalogoActividades) {
      if (act.topeSemestralH !== null || act.topeSemanalHPorUnidad !== null) {
        const detalle: ActividadTopeDetalle = {
          topeSemestralH: act.topeSemestralH ?? null,
          topePorUnidad: act.topePorUnidad,
          topeSemanalHPorUnidad: act.topeSemanalHPorUnidad ?? null,
          unidadMax: act.unidadMax ?? null,
          cantidadMaxSimultaneos: act.cantidadMaxSimultaneos ?? null,
          requiereProyectoAprobado: act.requiereProyectoAprobado,
          aplicaUnoPorFacultad: act.aplicaUnoPorFacultad,
          aplicaUnoPorSede: act.aplicaUnoPorSede,
          aplicaUnoPorPrograma: act.aplicaUnoPorPrograma,
          requiereResolucionRector: act.requiereResolucionRector ?? false,
        }
        map[topesKey(act.categoria, act.nombre)] = detalle
      }
    }
    return map
  }, [catalogoActividades])

  const schema = useMemo(
    () => createAgendaSchema(
      maxHoras,
      esEstricto,
      {
        doctorado: docente.doctorado,
        cargoAdministrativo: docente.cargoAdministrativo,
        proyectosActivos: docente.proyectosActivos,
        excluyeTopeGestion20,
        esJefeDePrograma: esJefeProg,
      },
      minDocencia,
      semanasAgenda,
      topesActividades,
      maxInvProySocialCatedra,
      maxGestion,
    ),
    [maxHoras, esEstricto, minDocencia, semanasAgenda, docente.doctorado, docente.cargoAdministrativo, docente.proyectosActivos, excluyeTopeGestion20, esJefeProg, topesActividades, maxInvProySocialCatedra, maxGestion]
  )

  const steps = useMemo(
    () => buildSteps(docente.cargoAdministrativo),
    [docente.cargoAdministrativo]
  )

  const isLastStep = currentStep === steps.length - 1
  const isFirstStep = currentStep === 0

  const form = useForm<AgendaWizardFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: defaultValues || DEFAULT_FORM_VALUES,
    mode: "onTouched",
  })

  // =========================================================
  // Validation Engine — Modelo Semestral
  //
  // Suma directamente `dedicacionPeriodo` (ya está en horas semestrales)
  // de TODOS los arrays: cursos, otras actividades, investigación,
  // proyección social, gestión.
  // =========================================================
  const watchedData = useWatch({ control: form.control })
  const horasTotalesPeriodo = maxHoras * semanasAgenda

  // Revalidar el formulario cuando el docente cambia las semanas de trabajo.
  // Esto asegura que los items que ya tenían semanas > semanasAgenda se marquen como inválidos.
  useEffect(() => {
    form.trigger()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semanasAgenda])

  const sumPeriodo = (items?: { dedicacionPeriodo?: number }[]) =>
    items?.reduce((acc, item) => acc + (Number(item?.dedicacionPeriodo) || 0), 0) || 0

  const totalSemestral =
    sumPeriodo(watchedData.cursos) +
    sumPeriodo(watchedData.otrasActividadesDocencia as { dedicacionPeriodo?: number }[] | undefined) +
    sumPeriodo(watchedData.actividadesInvestigacion as { dedicacionPeriodo?: number }[] | undefined) +
    sumPeriodo(watchedData.actividadesProyeccionSocial as { dedicacionPeriodo?: number }[] | undefined) +
    sumPeriodo(watchedData.actividadesGestion as { dedicacionPeriodo?: number }[] | undefined)

  // Subtotal reactivo de Inv + PS — para evaluar el tope de cátedra (Art. 3 Par. 2).
  const totalInvPS =
    sumPeriodo(watchedData.actividadesInvestigacion as { dedicacionPeriodo?: number }[] | undefined) +
    sumPeriodo(watchedData.actividadesProyeccionSocial as { dedicacionPeriodo?: number }[] | undefined)

  const catedraInvPSExcedido =
    maxInvProySocialCatedra !== null && totalInvPS > maxInvProySocialCatedra

  // =========================================================
  // Envío bloqueado si:
  // - esEstricto AND total semestral excede el límite legal
  // - O cátedra excede el tope de Inv+PS (Art. 3 Par. 2)
  // - O hay una transición en progreso
  // =========================================================
  const envioDisabled =
    (esEstricto && totalSemestral > horasTotalesPeriodo) ||
    catedraInvPSExcedido ||
    isPending ||
    isSavingDraft

  // Elimina filas dinámicas vacías antes de validar/enviar.
  // Una fila se considera "vacía" cuando el usuario tocó "+ Agregar" pero
  // nunca seleccionó un curso/actividad del catálogo — estado fuente del
  // bloqueo silencioso reportado en QA.
  function pruneEmptyArrayRows() {
    const values = form.getValues()

    const cursosFiltrados = (values.cursos ?? []).filter(
      (c) => (c?.numeroCurso ?? "").trim() !== ""
    )
    if (cursosFiltrados.length !== (values.cursos?.length ?? 0)) {
      form.setValue("cursos", cursosFiltrados, { shouldDirty: true })
    }

    const actividadArrays = [
      "otrasActividadesDocencia",
      "actividadesInvestigacion",
      "actividadesProyeccionSocial",
      "actividadesGestion",
    ] as const
    for (const name of actividadArrays) {
      const arr = values[name] ?? []
      const pruned = arr.filter((a) => (a?.nombre ?? "").trim() !== "")
      if (pruned.length !== arr.length) {
        form.setValue(name, pruned, { shouldDirty: true })
      }
    }
  }

  async function handleNext() {
    pruneEmptyArrayRows()

    const currentFields = steps[currentStep]?.fieldsToValidate || []

    if (currentFields.length > 0) {
      const valid = await form.trigger(
        currentFields as (keyof AgendaWizardFormData)[]
      )
      if (!valid) {
        toast.error("Corrija los errores antes de continuar.")
        return
      }
    }

    setCurrentStep((s) => Math.min(steps.length - 1, s + 1))
  }

  function handlePrev() {
    pruneEmptyArrayRows()
    setCurrentStep((s) => Math.max(0, s - 1))
  }

  function handleStepClick(index: number) {
    if (index <= currentStep) {
      setCurrentStep(index)
    }
  }

  async function handleSaveDraft() {
    pruneEmptyArrayRows()
    setIsSavingDraft(true)
    const data = form.getValues()

    startTransition(async () => {
      const result = await upsertAgendaCompletaAction({
        periodo,
        enviar: false,
        semanasAgenda,
        data,
        targetDocenteId,
      })

      setIsSavingDraft(false)

      if ("error" in result) {
        toast.error(result.error)
      } else {
        toast.success("Borrador guardado exitosamente.")
      }
    })
  }

  async function handleSubmitAgenda() {
    pruneEmptyArrayRows()

    const valid = await form.trigger()
    if (!valid) {
      const errs = form.formState.errors as Record<string, { message?: string; root?: { message?: string } }>
      if (errs._jefeProgramaSinCursos?.message) {
        toast.error(errs._jefeProgramaSinCursos.message)
      } else if (errs._minDocenciaInsuficiente?.message) {
        toast.error(errs._minDocenciaInsuficiente.message)
      } else if (errs._horasExcedidas?.message) {
        toast.error(errs._horasExcedidas.message)
      } else if (errs._catedraInvPSExcedido?.message) {
        toast.error(errs._catedraInvPSExcedido.message)
      } else {
        toast.error("Hay errores en el formulario. Revise todos los pasos.")
      }
      return
    }

    const data = form.getValues()

    startTransition(async () => {
      const result = await upsertAgendaCompletaAction({
        periodo,
        enviar: true,
        semanasAgenda,
        data,
        targetDocenteId,
      })

      if ("error" in result) {
        toast.error(result.error)
      } else {
        toast.success("¡Agenda enviada exitosamente!")
        if (redirectOnSuccess) {
          router.push(redirectOnSuccess)
        } else {
          router.refresh()
        }
      }
    })
  }

  function renderStepContent() {
    const stepId = steps[currentStep]?.id

    switch (stepId) {
      case "identificacion":
        return (
          <StepIdentificacion
            docente={docente}
            maxHoras={maxHoras}
            esEstricto={esEstricto}
            semanasPeriodo={semanasAgenda}
            semanasMaximas={semanasMaximasEfectivas}
            onSemanasChange={setSemanasAgenda}
          />
        )
      case "docencia":
        return (
          <StepDocencia
            cursosMaestros={cursosMaestros}
            catalogoActividades={catalogoActividades}
            modalidad={docente.modalidad}
            sedeBase={docente.sedeBase}
            semanasPeriodo={semanasAgenda}
            esJefeDePrograma={esJefeProg}
          />
        )
      case "investigacion":
        return (
          <StepInvestigacionProyeccion
            catalogoActividades={catalogoActividades}
            semanasPeriodo={semanasAgenda}
            doctorado={docente.doctorado}
            sedeBase={docente.sedeBase}
            proyectosActivos={docente.proyectosActivos}
          />
        )
      case "gestion":
        return (
          <StepGestion
            cargoAdministrativo={docente.cargoAdministrativo}
            maxGestion={maxGestion}
            excluyeTopeGestion20={excluyeTopeGestion20}
            catalogoActividades={catalogoActividades}
            sedeBase={docente.sedeBase}
            semanasPeriodo={semanasAgenda}
          />
        )
      case "revision":
        return (
          <StepRevision
            docente={docente}
            horasTotalesPeriodo={horasTotalesPeriodo}
            maxGestion={maxGestion}
            minDocencia={minDocencia}
            excluyeTopeGestion20={excluyeTopeGestion20}
            maxInvProySocialCatedra={maxInvProySocialCatedra}
          />
        )
      default:
        return null
    }
  }

  return (
    <Form {...form}>
      {/* Motores silenciosos: sincronizan dedicacionPeriodo de cada curso
          con la fórmula de DB (horasPresenciales × factor × semanas) sin
          importar en qué paso del wizard está el usuario. */}
      {(watchedData.cursos ?? []).map((_, i) => (
        <SilentDedicacionCalc
          key={i}
          cursoIndex={i}
          semanasPeriodo={semanasAgenda}
          formulas={formulas ?? DEFAULT_FORMULAS}
        />
      ))}
      <form
        onSubmit={(e) => e.preventDefault()}
        className="space-y-6"
      >
        <HorasStickyHeader
          horasTotalesPeriodo={horasTotalesPeriodo}
          esEstricto={esEstricto}
          periodo={periodo}
        />

        <WizardStepper
          steps={steps}
          currentStep={currentStep}
          onStepClick={handleStepClick}
        />

        <div className="min-h-[300px]">{renderStepContent()}</div>

        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrev}
            disabled={isFirstStep || isPending}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Anterior
          </Button>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              onClick={handleSaveDraft}
              disabled={isPending || isSavingDraft}
            >
              {isSavingDraft ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isSavingDraft ? "Guardando..." : "Guardar Borrador"}
            </Button>

            {!isLastStep ? (
              <Button type="button" onClick={handleNext} disabled={isPending}>
                Siguiente
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    disabled={envioDisabled}
                    className="gap-2"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {isPending ? "Enviando..." : "Enviar Agenda"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      ¿Enviar agenda definitivamente?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Una vez enviada, la agenda del periodo{" "}
                      <strong>{periodo}</strong> no podrá ser modificada ni
                      eliminada. Asegúrese de que toda la información es
                      correcta.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleSubmitAgenda}
                      disabled={isPending}
                    >
                      {isPending ? "Enviando..." : "Confirmar Envío"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </form>
    </Form>
  )
}