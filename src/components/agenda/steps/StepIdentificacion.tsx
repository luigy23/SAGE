"use client"

import type { Docente } from "@/generated/prisma/client"
import { getModalidadLabel, getCargaSemestralCopy } from "@/lib/utils/modalidad"
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
 * Calcula el maxHoras dinámicamente desde la modalidad usando getMaxHoras().
 *
 * Este paso NO tiene campos editables del formulario RHF.
 */
export function StepIdentificacion({
  docente,
  maxHoras,
  esEstricto,
  semanasPeriodo,
  semanasMaximas,
  onSemanasChange,
}: {
  docente: Docente
  maxHoras: number
  esEstricto: boolean
  semanasPeriodo: number
  semanasMaximas: number
  onSemanasChange: (semanas: number) => void
}) {
  // Fuente única de copy: matriz dinámica del helper `modalidad.ts`
  // (Acuerdo 048 Art. 4 — diferencia obligación contractual vs tope permisivo).
  const carga = getCargaSemestralCopy(docente.modalidad, docente.sedeBase, semanasPeriodo)

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
                value={getModalidadLabel(docente.modalidad)}
                disabled
                className="disabled:opacity-70"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="step1-sede">Sede Base</Label>
              <Input
                id="step1-sede"
                value={docente.sedeBase}
                disabled
                className="disabled:opacity-70"
              />
            </div>
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

          {/* Selector de semanas de trabajo */}
          <div className="mb-4 space-y-2">
            <Label htmlFor="step1-semanas" className="text-sm font-medium">
              Semanas de trabajo en este semestre
            </Label>
            <p className="text-xs text-muted-foreground">
              Base: {semanasMaximas} semanas del período. Reduce si ingresás después del inicio del semestre.
            </p>
            <div className="flex items-center gap-3">
              <Input
                id="step1-semanas"
                type="number"
                min={1}
                max={semanasMaximas}
                value={semanasPeriodo}
                onChange={(e) => {
                  const raw = parseInt(e.target.value, 10)
                  const clamped = Number.isNaN(raw) ? 1 : Math.min(Math.max(1, raw), semanasMaximas)
                  onSemanasChange(clamped)
                }}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">
                de {semanasMaximas} semanas máx.
              </span>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Regla de horas máximas — dynamic from getMaxHoras */}
          <div className="flex items-start gap-3 rounded-lg border bg-muted/50 p-4">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold">
                {carga.titulo}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({carga.resumen})
                </span>
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {carga.descripcion}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
