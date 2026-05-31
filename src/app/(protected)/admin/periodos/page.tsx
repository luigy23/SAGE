import { getPeriodos } from "@/lib/actions/periodo-actions"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { PeriodoVentanaCell, type VentanaEstado } from "@/components/admin/periodo-ventana-cell"
import { CalendarDays, AlertTriangle } from "lucide-react"

function calcularSemanas(fechaInicio: Date, fechaFin: Date): number {
  const ms = fechaFin.getTime() - fechaInicio.getTime()
  return Math.max(1, Math.round(ms / (7 * 24 * 60 * 60 * 1000)))
}

function getVentanaEstado(now: Date, desde: Date | null, hasta: Date | null): VentanaEstado {
  if (!desde || !hasta) return "SIN_CONFIGURAR"
  if (now < desde) return "PROXIMA"
  if (now > hasta) return "CERRADA"
  return "ABIERTA"
}

export default async function AdminPeriodosPage() {
  const periodos = await getPeriodos()
  const periodoActivo = periodos.find((p) => p.estado === "ABIERTO") ?? null
  const now = new Date()

  return (
    <div className="container mx-auto py-10 max-w-5xl space-y-4">
      {!periodoActivo && periodos.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive dark:text-red-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            No hay ningún período académico activo. Los docentes no pueden crear ni modificar agendas.
            Contacta al SuperAdmin para que active el semestre correspondiente.
          </span>
        </div>
      )}

      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2 text-2xl font-bold">
              <CalendarDays className="h-6 w-6" />
              Ventanas de Diligenciamiento
            </CardTitle>
            <CardDescription className="mt-1">
              Configura cuándo los docentes pueden diligenciar la Agenda Semestral (FO-19) y el
              Monitoreo (FO-20). Los períodos son gestionados por el SuperAdmin.
              {periodoActivo && (
                <span className="ml-2 font-medium text-green-700 dark:text-green-400">
                  Semestre activo: <span className="font-mono">{periodoActivo.nombre}</span>
                </span>
              )}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Período</TableHead>
                <TableHead>Fecha Inicio</TableHead>
                <TableHead>Fecha Fin</TableHead>
                <TableHead className="text-center">Semanas</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Ventana FO-19</TableHead>
                <TableHead>Ventana FO-20</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periodos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                    No hay períodos académicos. El SuperAdmin debe crear el primer semestre.
                  </TableCell>
                </TableRow>
              )}
              {periodos.map((periodo) => {
                const semanas = calcularSemanas(periodo.fechaInicio, periodo.fechaFin)
                const esActivo = periodo.estado === "ABIERTO"
                const agendaEstado = getVentanaEstado(now, periodo.agendaDesde ?? null, periodo.agendaHasta ?? null)
                const monitoreoEstado = getVentanaEstado(now, periodo.monitoreoDesde ?? null, periodo.monitoreoHasta ?? null)

                return (
                  <TableRow
                    key={periodo.id}
                    className={esActivo ? "bg-green-50/50 dark:bg-green-950/20" : undefined}
                  >
                    <TableCell className="font-bold font-mono">
                      {periodo.nombre}
                      {esActivo && (
                        <Badge className="ml-2 bg-green-600 hover:bg-green-600 text-xs">
                          ACTIVO
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(periodo.fechaInicio).toLocaleDateString("es-CO")}
                    </TableCell>
                    <TableCell>
                      {new Date(periodo.fechaFin).toLocaleDateString("es-CO")}
                    </TableCell>
                    <TableCell className="text-center tabular-nums text-muted-foreground">
                      {semanas}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={esActivo ? "default" : "secondary"}
                        className={esActivo ? "bg-green-600 hover:bg-green-700" : ""}
                      >
                        {periodo.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <PeriodoVentanaCell
                        periodoId={periodo.id}
                        periodoNombre={periodo.nombre}
                        tipo="AGENDA"
                        initialDesde={periodo.agendaDesde ?? null}
                        initialHasta={periodo.agendaHasta ?? null}
                        estado={agendaEstado}
                        label="FO-19"
                      />
                    </TableCell>
                    <TableCell>
                      <PeriodoVentanaCell
                        periodoId={periodo.id}
                        periodoNombre={periodo.nombre}
                        tipo="MONITOREO"
                        initialDesde={periodo.monitoreoDesde ?? null}
                        initialHasta={periodo.monitoreoHasta ?? null}
                        estado={monitoreoEstado}
                        label="FO-20"
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
