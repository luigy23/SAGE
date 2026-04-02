"use client"

import { useFormContext, useWatch } from "react-hook-form"
import type { AgendaWizardFormData } from "@/lib/schemas/agenda-schema"
import type { Docente } from "@/generated/prisma/client"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  BookOpen,
  FlaskConical,
  Users,
  Building2,
  GraduationCap,
} from "lucide-react"

/**
 * Paso 5 — Revisión y Resumen
 *
 * Muestra un resumen de todos los arrays del formulario con subtotales
 * y un gran total. NO tiene campos editables propios.
 *
 * El botón de envío vive en el AgendaWizardForm (orquestador)
 * porque necesita manejar el estado de submit y la lógica de disabled.
 *
 * Usa useWatch() para leer los datos en tiempo real del formulario.
 */
export function StepRevision({
  docente,
  maxHoras,
  esEstricto,
}: {
  docente: Docente
  maxHoras: number
  esEstricto: boolean
}) {
  // Observar todos los arrays del formulario
  const cursos = useWatch<AgendaWizardFormData, "cursos">({ name: "cursos" }) || []
  const otrasDocencia = useWatch<AgendaWizardFormData, "otrasActividadesDocencia">({ name: "otrasActividadesDocencia" }) || []
  const investigacion = useWatch<AgendaWizardFormData, "actividadesInvestigacion">({ name: "actividadesInvestigacion" }) || []
  const proyeccion = useWatch<AgendaWizardFormData, "actividadesProyeccionSocial">({ name: "actividadesProyeccionSocial" }) || []
  const gestion = useWatch<AgendaWizardFormData, "actividadesGestion">({ name: "actividadesGestion" }) || []

  // Calcular subtotales
  const sum = (items: { dedicacionPeriodo?: number }[]) =>
    items.reduce((acc, i) => acc + (Number(i?.dedicacionPeriodo) || 0), 0)

  const subtotalCursos = sum(cursos)
  const subtotalOtrasDocencia = sum(otrasDocencia)
  const totalDocencia = subtotalCursos + subtotalOtrasDocencia
  const totalInvestigacion = sum(investigacion)
  const totalProyeccion = sum(proyeccion)
  const totalGestion = sum(gestion)
  const granTotal = totalDocencia + totalInvestigacion + totalProyeccion + totalGestion

  const excedido = granTotal > maxHoras

  return (
    <div className="space-y-6">
      {/* Información del docente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Datos del Docente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <span className="text-muted-foreground">Nombre: </span>
              <span className="font-medium">{docente.nombre}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Cédula: </span>
              <span className="font-medium">{docente.cedula}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Facultad: </span>
              <span className="font-medium">{docente.facultad}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Programa: </span>
              <span className="font-medium">{docente.programa}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Modalidad: </span>
              <Badge variant="secondary" className="ml-1">
                {docente.modalidad}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sección 1: Docencia */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            1. Docencia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 1.0 Cursos */}
          <div>
            <h4 className="mb-2 text-sm font-semibold">
              1.0 Cursos ({cursos.length})
            </h4>
            {cursos.length > 0 ? (
              <div className="space-y-1">
                {cursos.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded px-2 py-1 text-sm odd:bg-muted/50"
                  >
                    <span>
                      {c?.numeroCurso || "—"} — {c?.nombreCurso || "Sin nombre"}
                      {c?.subgrupo ? ` (${c.subgrupo})` : ""}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {Number(c?.dedicacionPeriodo) || 0}h
                    </span>
                  </div>
                ))}
                <div className="mt-1 flex justify-between border-t px-2 pt-1 text-sm font-medium">
                  <span>Subtotal Cursos</span>
                  <span className="tabular-nums">{subtotalCursos}h</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin cursos</p>
            )}
          </div>

          <Separator />

          {/* 1.2 Otras Actividades de Docencia */}
          <div>
            <h4 className="mb-2 text-sm font-semibold">
              1.2 Otras Actividades ({otrasDocencia.length})
            </h4>
            {otrasDocencia.length > 0 ? (
              <div className="space-y-1">
                {otrasDocencia.map((a, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded px-2 py-1 text-sm odd:bg-muted/50"
                  >
                    <span>{a?.nombre || "Sin nombre"}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {Number(a?.dedicacionPeriodo) || 0}h
                    </span>
                  </div>
                ))}
                <div className="mt-1 flex justify-between border-t px-2 pt-1 text-sm font-medium">
                  <span>Subtotal Otras Docencia</span>
                  <span className="tabular-nums">{subtotalOtrasDocencia}h</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin actividades</p>
            )}
          </div>

          <div className="flex justify-between rounded-md bg-primary/5 px-3 py-2 text-sm font-bold">
            <span>TOTAL 1 — Docencia</span>
            <span className="tabular-nums">{totalDocencia}h</span>
          </div>
        </CardContent>
      </Card>

      {/* Sección 2: Investigación */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            2. Investigación ({investigacion.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {investigacion.length > 0 ? (
            <div className="space-y-1">
              {investigacion.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded px-2 py-1 text-sm odd:bg-muted/50"
                >
                  <span>{a?.nombre || "Sin nombre"}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {Number(a?.dedicacionPeriodo) || 0}h
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin actividades</p>
          )}
          <div className="mt-2 flex justify-between rounded-md bg-primary/5 px-3 py-2 text-sm font-bold">
            <span>TOTAL 2 — Investigación</span>
            <span className="tabular-nums">{totalInvestigacion}h</span>
          </div>
        </CardContent>
      </Card>

      {/* Sección 3: Proyección Social */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            3. Proyección Social ({proyeccion.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {proyeccion.length > 0 ? (
            <div className="space-y-1">
              {proyeccion.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded px-2 py-1 text-sm odd:bg-muted/50"
                >
                  <span>{a?.nombre || "Sin nombre"}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {Number(a?.dedicacionPeriodo) || 0}h
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin actividades</p>
          )}
          <div className="mt-2 flex justify-between rounded-md bg-primary/5 px-3 py-2 text-sm font-bold">
            <span>TOTAL 3 — Proyección Social</span>
            <span className="tabular-nums">{totalProyeccion}h</span>
          </div>
        </CardContent>
      </Card>

      {/* Sección 4: Gestión (solo si tiene cargoAdministrativo) */}
      {docente.cargoAdministrativo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              4. Gestión ({gestion.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {gestion.length > 0 ? (
              <div className="space-y-1">
                {gestion.map((a, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded px-2 py-1 text-sm odd:bg-muted/50"
                  >
                    <span>{a?.nombre || "Sin nombre"}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {Number(a?.dedicacionPeriodo) || 0}h
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin actividades</p>
            )}
            <div className="mt-2 flex justify-between rounded-md bg-primary/5 px-3 py-2 text-sm font-bold">
              <span>TOTAL 4 — Gestión</span>
              <span className="tabular-nums">{totalGestion}h</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gran Total */}
      <Card
        className={
          excedido && esEstricto
            ? "border-destructive/50 bg-destructive/5"
            : excedido && !esEstricto
              ? "border-yellow-500/50 bg-yellow-500/5"
              : "border-primary/30 bg-primary/5"
        }
      >
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">GRAN TOTAL</h3>
              <p className="text-sm text-muted-foreground">
                Suma de todas las secciones
              </p>
            </div>
            <div className="text-right">
              <p
                className={`text-3xl font-bold tabular-nums ${
                  excedido && esEstricto
                    ? "text-destructive"
                    : excedido && !esEstricto
                      ? "text-yellow-600 dark:text-yellow-400"
                      : "text-primary"
                }`}
              >
                {granTotal}h
              </p>
              <p className="text-sm text-muted-foreground">
                de {maxHoras}h máximo
              </p>
            </div>
          </div>

          {excedido && esEstricto && (
            <p className="mt-3 text-sm font-medium text-destructive">
              ⛔ La dedicación total supera el máximo permitido. Reduzca horas
              en alguna sección para poder enviar la agenda.
            </p>
          )}
          {excedido && !esEstricto && (
            <p className="mt-3 text-sm font-medium text-yellow-700 dark:text-yellow-400">
              ⚠️ Advertencia: La carga supera las {maxHoras} horas de referencia
              para modalidad Cátedra. Puede enviar, pero revise la distribución.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
