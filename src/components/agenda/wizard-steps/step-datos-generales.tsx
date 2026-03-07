"use client"

import type { AgendaConRelaciones } from "@/lib/types/agenda"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export function StepDatosGenerales({
  agenda,
}: {
  agenda: AgendaConRelaciones
}) {
  const { docente } = agenda

  const fields = [
    { label: "Nombre", value: docente.nombre },
    { label: "Cedula", value: docente.cedula },
    { label: "Correo Electronico", value: docente.email },
    { label: "Celular", value: docente.celular || "—" },
    { label: "Facultad", value: docente.facultad || "—" },
    { label: "Programa", value: docente.programa || "—" },
    { label: "Modalidad", value: docente.modalidad || "—" },
    { label: "Periodo", value: agenda.periodo },
    {
      label: "Fecha",
      value: new Date(agenda.fecha).toLocaleDateString("es-CO"),
    },
  ]

  return (
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
      </CardContent>
    </Card>
  )
}
