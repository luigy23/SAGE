import { auth } from "@/lib/auth"
import { getPeriodos } from "@/lib/actions/periodo-actions"
import { resolveGlobales } from "@/lib/rules/resolver"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { PeriodoVentanaCell, type VentanaEstado } from "@/components/admin/periodo-ventana-cell"
import { CreatePeriodoSuperadminDialog } from "@/components/superadmin/create-periodo-superadmin-dialog"
import { PeriodoFilaAcciones } from "@/components/superadmin/periodo-fila-acciones"
import { PeriodoStatusDropdown } from "@/components/admin/periodo-status-dropdown"
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

/**
 * Períodos Académicos (unificado). El ADMIN configura las ventanas de
 * diligenciamiento (FO-19/FO-20). El SUPERADMIN además crea/edita/borra períodos.
 */
export default async function AdminPeriodosPage() {
  const session = await auth()
  const esSuperadmin = session?.user?.rol === "SUPERADMIN"

  const [periodos, globales] = await Promise.all([
    getPeriodos(),
    esSuperadmin ? resolveGlobales(null) : Promise.resolve(null),
  ])
  const semanasPeriodo = globales?.semanasPeriodo ?? 22
  const periodoActivo = periodos.find((p) => p.estado === "ABIERTO") ?? null
  const now = new Date()

  return (
    <div className="container mx-auto py-10 max-w-5xl space-y-4">
      {!periodoActivo && periodos.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive dark:text-red-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            No hay ningún semestre vigente. Los docentes no pueden crear ni modificar agendas.
            Abre un período para reactivar el sistema.
          </span>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-2xl font-bold">
              <CalendarDays className="h-6 w-6" />
              Períodos Académicos
            </CardTitle>
            <CardDescription className="mt-1">
              Configura las ventanas de diligenciamiento (FO-19/FO-20)
              {esSuperadmin
                ? ". Como SuperAdmin, también puedes crear y editar períodos."
                : ". Como Admin, puedes abrir o cerrar los períodos vigentes."}
              {periodoActivo && (
                <span className="ml-2 font-medium text-green-700 dark:text-green-400">
                  Semestre vigente: <span className="font-mono">{periodoActivo.nombre}</span>
                </span>
              )}
            </CardDescription>
          </div>
          {esSuperadmin && <CreatePeriodoSuperadminDialog semanasPeriodo={semanasPeriodo} />}
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
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periodos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                    No hay períodos académicos.{esSuperadmin ? " Crea el primer semestre." : " El Super Administador debe crear el primero."}
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
                    <TableCell className="font-bold font-mono">{periodo.nombre}</TableCell>
                    <TableCell>{new Date(periodo.fechaInicio).toLocaleDateString("es-CO")}</TableCell>
                    <TableCell>{new Date(periodo.fechaFin).toLocaleDateString("es-CO")}</TableCell>
                    <TableCell className="text-center tabular-nums text-muted-foreground">{semanas}</TableCell>
                    <TableCell>
                      <Badge
                        variant={esActivo ? "default" : "secondary"}
                        className={esActivo ? "bg-green-600 hover:bg-green-700" : ""}
                      >
                        {esActivo ? "VIGENTE" : "ARCHIVADO"}
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
                    <TableCell className="text-right">
                      {esSuperadmin ? (
                        <PeriodoFilaAcciones
                          periodo={{
                            id: periodo.id,
                            nombre: periodo.nombre,
                            fechaInicio: periodo.fechaInicio,
                            estado: periodo.estado,
                          }}
                          canEdit={true}
                          semanasPeriodo={semanasPeriodo}
                        />
                      ) : (
                        <PeriodoStatusDropdown 
                          periodoId={periodo.id} 
                          currentStatus={periodo.estado} 
                        />
                      )}
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
