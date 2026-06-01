import { getPeriodosSuperadmin } from "@/lib/actions/superadmin-periodo-actions"
import { resolveGlobales } from "@/lib/rules/resolver"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { CreatePeriodoSuperadminDialog } from "@/components/superadmin/create-periodo-superadmin-dialog"
import { PeriodoFilaAcciones } from "@/components/superadmin/periodo-fila-acciones"
import { CalendarDays, AlertTriangle } from "lucide-react"

function calcularSemanas(fechaInicio: Date, fechaFin: Date): number {
  const ms = fechaFin.getTime() - fechaInicio.getTime()
  return Math.max(1, Math.round(ms / (7 * 24 * 60 * 60 * 1000)))
}

export default async function SuperAdminPeriodosPage() {
  const [periodos, globales] = await Promise.all([
    getPeriodosSuperadmin(),
    resolveGlobales(null),
  ])

  const semanasPeriodo = globales.semanasPeriodo
  const periodoActivo = periodos.find((p) => p.estado === "ABIERTO") ?? null

  return (
    <div className="container mx-auto py-10 max-w-5xl space-y-4">
      {!periodoActivo && periodos.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive dark:text-red-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            No hay ningún semestre vigente. Los docentes no pueden crear agendas.
            Abre un período para reactivar el sistema.
          </span>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-2xl font-bold">
              <CalendarDays className="h-6 w-6" />
              Períodos Académicos
            </CardTitle>
            <CardDescription className="mt-1">
              Define los semestres académicos. La fecha de fin se calcula a partir de{" "}
              <span className="font-mono font-semibold">{semanasPeriodo} semanas</span> (parámetro
              global actual).
              {periodoActivo && (
                <span className="ml-2 font-medium text-green-700 dark:text-green-400">
                  Semestre vigente: <span className="font-mono">{periodoActivo.nombre}</span>
                </span>
              )}
            </CardDescription>
          </div>
          <CreatePeriodoSuperadminDialog semanasPeriodo={semanasPeriodo} />
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
                <TableHead className="text-center">Ventanas</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periodos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                    No hay períodos creados. Crea el primer semestre académico.
                  </TableCell>
                </TableRow>
              )}
              {periodos.map((periodo) => {
                const semanas = calcularSemanas(periodo.fechaInicio, periodo.fechaFin)
                const esActivo = periodo.estado === "ABIERTO"

                const tieneAgendaConfig = !!(periodo.agendaDesde && periodo.agendaHasta)
                const tieneMonitoreoConfig = !!(periodo.monitoreoDesde && periodo.monitoreoHasta)

                return (
                  <TableRow
                    key={periodo.id}
                    className={esActivo ? "bg-green-50/50 dark:bg-green-950/20" : undefined}
                  >
                    <TableCell className="font-bold font-mono">
                      {periodo.nombre}
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
                        {esActivo ? "VIGENTE" : "ARCHIVADO"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col gap-0.5 text-xs">
                        <span className={tieneAgendaConfig ? "text-green-600" : "text-muted-foreground"}>
                          {tieneAgendaConfig ? "● FO-19" : "○ FO-19"}
                        </span>
                        <span className={tieneMonitoreoConfig ? "text-green-600" : "text-muted-foreground"}>
                          {tieneMonitoreoConfig ? "● FO-20" : "○ FO-20"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
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
