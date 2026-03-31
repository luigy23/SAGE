"use client"

import type { Docente } from "@/generated/prisma/client"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  GraduationCap,
  Briefcase,
  FolderKanban,
  Clock,
} from "lucide-react"

/**
 * Paso 1 — Identificación y Reglas de Negocio
 *
 * Muestra los datos del docente en campos disabled (solo lectura).
 * Muestra los booleanos (doctorado, cargoAdministrativo, proyectosActivos) como Badges.
 * Muestra el maxHoras calculado según la modalidad.
 *
 * Este paso NO tiene campos editables del formulario RHF.
 */
export function StepIdentificacion({
  docente,
  maxHoras,
  esEstricto,
}: {
  docente: Docente
  maxHoras: number
  esEstricto: boolean
}) {
  // Mapeo de modalidad a label legible
  const modalidadLabels: Record<string, string> = {
    TCP: "Tiempo Completo Planta",
    TCO: "Tiempo Completo Ocasional",
    MTP: "Medio Tiempo Planta",
    MTC: "Medio Tiempo Cátedra",
    CATEDRA: "Cátedra",
  }

  return (
    <div className="space-y-6">
      {/* Datos del docente */}
      <Card>
        <CardHeader>
          <CardTitle>Datos del Docente</CardTitle>
          <CardDescription>
            Estos datos provienen de tu perfil. Si necesitas modificarlos, ve a
            la sección de Perfil.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="step1-nombre">Nombre completo</Label>
              <Input
                id="step1-nombre"
                value={docente.nombre}
                disabled
                className="disabled:opacity-70"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="step1-cedula">Cédula</Label>
              <Input
                id="step1-cedula"
                value={docente.cedula}
                disabled
                className="disabled:opacity-70"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="step1-facultad">Facultad</Label>
              <Input
                id="step1-facultad"
                value={docente.facultad}
                disabled
                className="disabled:opacity-70"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="step1-programa">Programa / Departamento</Label>
              <Input
                id="step1-programa"
                value={docente.programa}
                disabled
                className="disabled:opacity-70"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="step1-modalidad">Modalidad</Label>
              <Input
                id="step1-modalidad"
                value={`${docente.modalidad} — ${modalidadLabels[docente.modalidad] || docente.modalidad}`}
                disabled
                className="disabled:opacity-70"
              />
            </div>
            {docente.sede && (
              <div className="space-y-2">
                <Label htmlFor="step1-sede">Sede</Label>
                <Input
                  id="step1-sede"
                  value={docente.sede}
                  disabled
                  className="disabled:opacity-70"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Badges de estado booleano */}
      <Card>
        <CardHeader>
          <CardTitle>Condiciones del Docente</CardTitle>
          <CardDescription>
            Estos indicadores afectan las secciones disponibles y las validaciones del formulario.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Badge
              variant={docente.doctorado ? "default" : "secondary"}
              className="gap-1.5 px-3 py-1.5 text-sm"
            >
              <GraduationCap className="h-3.5 w-3.5" />
              Doctorado: {docente.doctorado ? "Sí" : "No"}
            </Badge>
            <Badge
              variant={docente.cargoAdministrativo ? "default" : "secondary"}
              className="gap-1.5 px-3 py-1.5 text-sm"
            >
              <Briefcase className="h-3.5 w-3.5" />
              Cargo Administrativo: {docente.cargoAdministrativo ? "Sí" : "No"}
            </Badge>
            <Badge
              variant={docente.proyectosActivos ? "default" : "secondary"}
              className="gap-1.5 px-3 py-1.5 text-sm"
            >
              <FolderKanban className="h-3.5 w-3.5" />
              Proyectos Activos: {docente.proyectosActivos ? "Sí" : "No"}
            </Badge>
          </div>

          <Separator className="my-4" />

          {/* Regla de horas máximas */}
          <div className="flex items-start gap-3 rounded-lg border bg-muted/50 p-4">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold">
                Máximo de dedicación: {maxHoras} horas
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {esEstricto
                  ? `Su modalidad (${docente.modalidad}) tiene un límite estricto de ${maxHoras} horas. No podrá enviar la agenda si lo excede.`
                  : `Su modalidad (${docente.modalidad}) tiene un umbral de referencia de ${maxHoras} horas. Si lo excede, verá una advertencia pero podrá enviar la agenda.`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
