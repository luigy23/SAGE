import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { AuditoriaStats } from "@/lib/types/auditoria"
import { ETIQUETAS_ACCION, ETIQUETAS_ENTIDAD } from "@/lib/types/auditoria"
import { Activity, Calendar, Clock, TrendingUp } from "lucide-react"

export function AuditoriaStats({ stats }: { stats: AuditoriaStats }) {
  const topEntidad = stats.porEntidad[0]
  const topAccion = stats.porAccion[0]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">Hoy</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalHoy}</div>
          <p className="text-xs text-muted-foreground mt-1">eventos registrados</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">Últimos 7 días</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalSemana}</div>
          <p className="text-xs text-muted-foreground mt-1">eventos registrados</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">Entidad más activa</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-lg font-bold truncate">
            {topEntidad ? ETIQUETAS_ENTIDAD[topEntidad.entidad] : "—"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {topEntidad ? `${topEntidad.count} eventos` : "Sin datos"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">Acción más frecuente</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-lg font-bold truncate">
            {topAccion ? ETIQUETAS_ACCION[topAccion.accion] : "—"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {topAccion ? `${topAccion.count} veces` : "Sin datos"}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
