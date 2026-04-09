"use client"

import { useState } from "react"
import type { Docente, CursoGuardado } from "@/generated/prisma/client"
import { AgendaWizardForm } from "@/components/agenda/AgendaWizardForm"
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
  cursosGuardados,
  periodo,
}: {
  docente: Docente
  cursosGuardados: CursoGuardado[]
  periodo: string
}) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false)

  // ==========================================
  // Estado 2: Formulario Wizard a pantalla completa
  // ==========================================
  if (mostrarFormulario) {
    return (
      <AgendaWizardForm
        docente={docente}
        cursosGuardados={cursosGuardados}
        periodo={periodo}
      />
    )
  }

  // ==========================================
  // Estado 1: Empty State con botón de acción
  // ==========================================
  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <CalendarDays className="h-8 w-8 text-primary" />
        </div>
        <CardTitle>Crear Agenda del Periodo {periodo}</CardTitle>
        <CardDescription>
          No se encontró una agenda semestral para el periodo{" "}
          <Badge variant="secondary" className="text-xs">
            {periodo}
          </Badge>
          . Inicie el proceso completando el formulario paso a paso.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <Button
          size="lg"
          className="gap-2 px-8"
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
  )
}
