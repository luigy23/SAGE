import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, ClipboardCheck, RefreshCw } from "lucide-react"
import { getRevisionCounts } from "@/lib/actions/revision"

export default async function RevisionHubPage() {
  const counts = await getRevisionCounts()

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Agendas
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            FO-19
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Stat
              label="Pendientes de revisar"
              value={counts.agendasPendientes}
              accent="green"
            />
            <Stat
              label="Rehabilitadas"
              value={counts.agendasRehab}
              icon={<RefreshCw className="h-3 w-3" />}
            />
          </div>
          <Button asChild className="w-full">
            <Link href="/admin/revision/agendas">Ver listado</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="h-4 w-4" />
            Monitoreos
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            FO-20
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Stat
              label="Pendientes de revisar"
              value={counts.monitoreosPendientes}
              accent="green"
            />
            <Stat
              label="Rehabilitados"
              value={counts.monitoreosRehab}
              icon={<RefreshCw className="h-3 w-3" />}
            />
          </div>
          <Button asChild className="w-full">
            <Link href="/admin/revision/monitoreos">Ver listado</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({
  label,
  value,
  accent,
  icon,
}: {
  label: string
  value: number
  accent?: "green"
  icon?: React.ReactNode
}) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div
        className={
          "mt-1 text-2xl font-bold tabular-nums " +
          (accent === "green" ? "text-green-600" : "")
        }
      >
        {value}
      </div>
    </div>
  )
}
