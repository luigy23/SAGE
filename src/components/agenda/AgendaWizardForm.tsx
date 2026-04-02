"use client"

import { useMemo, useState, useTransition } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import type { Docente, CursoGuardado } from "@/generated/prisma/client"
import {
  createAgendaSchema,
  calcularTotalHoras,
  DEFAULT_FORM_VALUES,
  type AgendaWizardFormData,
} from "@/lib/schemas/agenda-schema"
import { getMaxHoras } from "@/lib/utils/periodo"
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
import { StepIdentificacion } from "./steps/StepIdentificacion"
import { StepDocencia } from "./steps/StepDocencia"
import { StepInvestigacionProyeccion } from "./steps/StepInvestigacionProyeccion"
import { StepGestion } from "./steps/StepGestion"
import { StepRevision } from "./steps/StepRevision"
import { cn } from "@/lib/utils"
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
  cursosGuardados,
  periodo,
  defaultValues,
}: {
  docente: Docente
  cursosGuardados: CursoGuardado[]
  periodo: string
  defaultValues?: AgendaWizardFormData
}) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [isSavingDraft, setIsSavingDraft] = useState(false)

  const { maxHoras, esEstricto } = useMemo(
    () => getMaxHoras(docente.modalidad),
    [docente.modalidad]
  )

  const schema = useMemo(
    () => createAgendaSchema(maxHoras, esEstricto, {
      doctorado: docente.doctorado,
      cargoAdministrativo: docente.cargoAdministrativo,
      proyectosActivos: docente.proyectosActivos,
    }),
    [maxHoras, esEstricto, docente.doctorado, docente.cargoAdministrativo, docente.proyectosActivos]
  )

  const steps = useMemo(
    () => buildSteps(docente.cargoAdministrativo),
    [docente.cargoAdministrativo]
  )

  const isLastStep = currentStep === steps.length - 1
  const isFirstStep = currentStep === 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<AgendaWizardFormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: defaultValues || DEFAULT_FORM_VALUES,
    mode: "onTouched",
  })

  const watchedData = useWatch({ control: form.control })
  const totalHoras = calcularTotalHoras(watchedData as AgendaWizardFormData)
  const envioDisabled =
    (esEstricto && totalHoras > maxHoras) || isPending || isSavingDraft

  async function handleNext() {
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
    setCurrentStep((s) => Math.max(0, s - 1))
  }

  function handleStepClick(index: number) {
    if (index <= currentStep) {
      setCurrentStep(index)
    }
  }

  async function handleSaveDraft() {
    setIsSavingDraft(true)
    const data = form.getValues()

    startTransition(async () => {
      const result = await upsertAgendaCompletaAction({
        periodo,
        enviar: false,
        data,
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
    const valid = await form.trigger()
    if (!valid) {
      toast.error("Hay errores en el formulario. Revise todos los pasos.")
      return
    }

    const data = form.getValues()

    startTransition(async () => {
      const result = await upsertAgendaCompletaAction({
        periodo,
        enviar: true,
        data,
      })

      if ("error" in result) {
        toast.error(result.error)
      } else {
        toast.success("¡Agenda enviada exitosamente!")
        router.refresh()
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
          />
        )
      case "docencia":
        return <StepDocencia cursosGuardados={cursosGuardados} />
      case "investigacion":
        return <StepInvestigacionProyeccion />
      case "gestion":
        return (
          <StepGestion
            cargoAdministrativo={docente.cargoAdministrativo}
          />
        )
      case "revision":
        return (
          <StepRevision
            docente={docente}
            maxHoras={maxHoras}
            esEstricto={esEstricto}
          />
        )
      default:
        return null
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => e.preventDefault()}
        className="space-y-6"
      >
        <HorasStickyHeader
          maxHoras={maxHoras}
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