"use client"

import type { AgendaConRelaciones } from "@/lib/types/agenda"
import {
  getAgendaLimits,
  formatModalidad,
} from "@/lib/validations/agenda-rules"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

export function StepDatosGenerales({
  agenda,
}: {
  agenda: AgendaConRelaciones
}) {
  const { docente } = agenda
  const limits = getAgendaLimits(docente)

  const fields = [
    { label: "Nombre", value: docente.nombre },
    { label: "Cedula", value: docente.cedula },
    { label: "Correo Electronico", value: docente.email },
    { label: "Celular", value: docente.celular || "—" },
    { label: "Facultad", value: docente.facultad || "—" },
    { label: "Programa", value: docente.programa || "—" },
    { label: "Sede", value: docente.sede || "—" },
    { label: "Modalidad", value: formatModalidad(docente.modalidad) },
    { label: "Periodo", value: agenda.periodo },
    {
      label: "Fecha",
      value: new Date(agenda.fecha).toLocaleDateString("es-CO"),
    },
  ]

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Datos Generales del Docente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Estos datos provienen de tu perfil. Si necesitas modificarlos, ve a la
            seccion de perfil.
          </p>
          <Separator className="mb-4" />
          <dl className="grid gap-3 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.label}>
                <dt className="text-sm font-medium text-muted-foreground">
                  {f.label}
                </dt>
                <dd className="text-sm">{f.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 flex flex-wrap gap-2">
            {docente.doctorado && <Badge variant="secondary">Doctorado</Badge>}
            {docente.cargoAdministrativo && <Badge variant="secondary">Cargo Administrativo</Badge>}
            {docente.proyectosActivos && <Badge variant="secondary">Proyectos Activos</Badge>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Configuración de Horas (Acuerdo 048)</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-sm text-muted-foreground">Total Periodo</dt>
              <dd className="text-lg font-semibold">{limits.horasTotalesPeriodo}h</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Horas/Semana</dt>
              <dd className="text-lg font-semibold">{limits.maxHorasSemanales}h</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Min. Docencia</dt>
              <dd className="text-lg font-semibold">
                {limits.minDocencia > 0 ? `${limits.minDocencia}h` : "N/A"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Max. Gestión</dt>
              <dd className="text-lg font-semibold">
                {limits.maxGestion < limits.horasTotalesPeriodo ? `${limits.maxGestion}h (20%)` : "Sin límite"}
              </dd>
            </div>
          </dl>
          {docente.proyectosActivos && (
            <p className="mt-3 text-sm text-muted-foreground">
              El mínimo de docencia está reducido por tener proyectos activos de investigación/proyección social (Art. 3, Parágrafo 1).
            </p>
          )}
          {limits.maxInvProySocialCatedra !== null && (
            <p className="mt-3 text-sm text-muted-foreground">
              Como catedrático, puede dedicar máximo {limits.maxInvProySocialCatedra}h a investigación y proyección social (Art. 3, Parágrafo 2).
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
