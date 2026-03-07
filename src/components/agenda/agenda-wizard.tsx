"use client"

import { useState } from "react"
import type { CursoGuardado } from "@/generated/prisma/client"
import type { AgendaConRelaciones } from "@/lib/types/agenda"
import { WIZARD_STEPS } from "@/lib/types/agenda"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { StepDatosGenerales } from "./wizard-steps/step-datos-generales"
import { StepCursos } from "./wizard-steps/step-cursos"
import { StepHorarios } from "./wizard-steps/step-horarios"
import { StepActividades } from "./wizard-steps/step-actividades"
import { StepResumen } from "./wizard-steps/step-resumen"

export function AgendaWizard({
  agenda,
  cursosGuardados,
}: {
  agenda: AgendaConRelaciones
  cursosGuardados: CursoGuardado[]
}) {
  const [currentStep, setCurrentStep] = useState(1)
  const isReadOnly = agenda.estado !== "BORRADOR"

  function renderStep() {
    switch (currentStep) {
      case 1:
        return <StepDatosGenerales agenda={agenda} />
      case 2:
        return (
          <StepCursos
            agenda={agenda}
            cursosGuardados={cursosGuardados}
            readOnly={isReadOnly}
          />
        )
      case 3:
        return <StepHorarios agenda={agenda} readOnly={isReadOnly} />
      case 4:
        return (
          <StepActividades
            agenda={agenda}
            tipo="docencia"
            titulo="Otras Actividades de Docencia"
            actividades={agenda.otrasActividadesDocencia}
            readOnly={isReadOnly}
          />
        )
      case 5:
        return (
          <StepActividades
            agenda={agenda}
            tipo="investigacion"
            titulo="Actividades de Investigacion"
            actividades={agenda.actividadesInvestigacion}
            readOnly={isReadOnly}
          />
        )
      case 6:
        return (
          <StepActividades
            agenda={agenda}
            tipo="proyeccion"
            titulo="Actividades de Proyeccion Social"
            actividades={agenda.actividadesProyeccionSocial}
            readOnly={isReadOnly}
          />
        )
      case 7:
        return (
          <StepActividades
            agenda={agenda}
            tipo="gestion"
            titulo="Actividades de Gestion"
            actividades={agenda.actividadesGestion}
            readOnly={isReadOnly}
          />
        )
      case 8:
        return <StepResumen agenda={agenda} readOnly={isReadOnly} />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Agenda {agenda.periodo}
          </h1>
          <p className="text-muted-foreground">
            {agenda.docente.nombre} — {agenda.docente.cedula}
          </p>
        </div>
        <Badge variant={isReadOnly ? "default" : "secondary"}>
          {agenda.estado}
        </Badge>
      </div>

      {/* Step navigation */}
      <nav className="flex flex-wrap gap-1">
        {WIZARD_STEPS.map((step) => (
          <button
            key={step.number}
            onClick={() => setCurrentStep(step.number)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              currentStep === step.number
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {step.number}. {step.label}
          </button>
        ))}
      </nav>

      {/* Step content */}
      {renderStep()}

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
          disabled={currentStep === 1}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Anterior
        </Button>
        <Button
          variant="outline"
          onClick={() => setCurrentStep((s) => Math.min(8, s + 1))}
          disabled={currentStep === 8}
        >
          Siguiente
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
