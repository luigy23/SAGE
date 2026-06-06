"use client"

import { useState } from "react"
import type { Docente } from "@/generated/prisma/client"
import { AgendaWizardForm } from "@/components/agenda/AgendaWizardForm"
import type { CursoMaestroOption } from "@/components/agenda/CursoMaestroSelector"
import type { ActividadCatalogoOption } from "@/components/agenda/ActividadCatalogoSelector"
import type { FormulasCursos } from "@/lib/actions/formulas"
import type { AgendaLimits } from "@/lib/validations/agenda-rules"
import type { AgendaWizardFormData } from "@/lib/schemas/agenda-schema"
import type { ProyectoAprobadoOpcion } from "@/lib/actions/proyecto-actions"
import type { ConsejeriaCardData } from "@/components/agenda/ActividadCardRow"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, Plus } from "lucide-react"

/**
 * NuevaAgendaView — Patrón "Empty State → Form".
 *
 * Estado 1 (mostrarFormulario=false): Card de bienvenida con botón "Crear Agenda".
 * Estado 2 (mostrarFormulario=true):  Solo el AgendaWizardForm, sin la Card.
 *
 * Esto evita que el Card y el Wizard se rendericen simultáneamente,
 * eliminando el desbordamiento vertical que rompía el layout.
 */
export function NuevaAgendaView({
  docente,
  cursosMaestros,
  catalogoActividades,
  periodo,
  semanasPeriodo,
  semanasClases,
  semanasClasesPorSede,
  semanasMaximas,
  formulas,
  agendaLimits,
  defaultValues,
  proyectosAprobados,
  consejeria,
}: {
  docente: Docente
  cursosMaestros: CursoMaestroOption[]
  catalogoActividades: ActividadCatalogoOption[]
  periodo: string
  semanasPeriodo: number
  semanasClases: number
  semanasClasesPorSede?: Record<string, number>
  semanasMaximas?: number
  formulas?: FormulasCursos
  agendaLimits?: AgendaLimits
  defaultValues?: AgendaWizardFormData
  proyectosAprobados?: ProyectoAprobadoOpcion[]
  consejeria?: ConsejeriaCardData
}) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false)

  // ==========================================
  // Estado 2: Formulario Wizard a pantalla completa
  // ==========================================
  if (mostrarFormulario) {
    return (
      <AgendaWizardForm
        docente={docente}
        cursosMaestros={cursosMaestros}
        catalogoActividades={catalogoActividades}
        periodo={periodo}
        semanasPeriodo={semanasPeriodo}
        semanasClases={semanasClases}
        semanasClasesPorSede={semanasClasesPorSede}
        semanasMaximas={semanasMaximas}
        formulas={formulas}
        agendaLimits={agendaLimits}
        defaultValues={defaultValues}
        proyectosAprobados={proyectosAprobados}
        consejeria={consejeria}
      />
    )
  }

  // ==========================================
  // Estado 1: Empty State con botón de acción
  // ==========================================
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
      <Card className="mx-auto w-full max-w-md border-muted shadow-sm">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CalendarDays className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Crear Agenda del Período {periodo}</CardTitle>
          <CardDescription className="text-sm mt-2 leading-relaxed">
            No se encontró una agenda semestral para el período{" "}
            <Badge variant="secondary" className="text-xs font-medium">
              {periodo}
            </Badge>
            . Inicie el proceso completando el formulario paso a paso.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-5 pb-8">
          <Button
            size="lg"
            className="gap-2 px-8 w-full sm:w-auto"
            onClick={() => setMostrarFormulario(true)}
          >
            <Plus className="h-5 w-5" />
            Crear Agenda
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Podrá guardar su progreso como borrador en cualquier momento.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
