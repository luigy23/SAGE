import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { UserCog, Clock, Microscope } from "lucide-react"
import { getRevisionCounts } from "@/lib/actions/revision"
import { getPeriodos } from "@/lib/actions/periodo-actions"
import { HubPeriodoSelector } from "@/components/revision/HubPeriodoSelector"

type SP = Record<string, string | string[] | undefined>

function pickString(sp: SP, key: string): string | undefined {
  const v = sp[key]
  if (Array.isArray(v)) return v[0]
  return v
}

export default async function RevisionHubPage({
  searchParams,
}: {
  searchParams: Promise<SP>
}) {
  const [sp, periodos] = await Promise.all([searchParams, getPeriodos()])
  const periodoFromUrl = pickString(sp, "periodo")

  // Si el usuario no eligió periodo, default = el periodo ABIERTO actual.
  // Si no hay ninguno abierto, undefined → cuenta todos.
  const periodoAbierto = periodos.find((p) => p.estado === "ABIERTO")?.nombre
  const periodoActivo = periodoFromUrl ?? periodoAbierto ?? null

  const counts = await getRevisionCounts(periodoActivo)

  const periodosOpts = periodos.map((p) => ({
    nombre: p.nombre,
    estado: p.estado,
  }))

  const contextoPeriodo = periodoActivo
    ? `Mostrando el resumen del periodo ${periodoActivo}.`
    : "Mostrando el acumulado de todos los periodos."

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-muted-foreground">{contextoPeriodo}</p>
        <HubPeriodoSelector periodos={periodosOpts} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCog className="h-4 w-4" />
              Perfiles
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              Cambios
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 text-sm">
              <Stat
                label="Solicitudes en revisión"
                value={counts.perfilesPendientes}
                accent="green"
              />
            </div>
            <Button asChild className="w-full">
              <Link href="/admin/revision/perfiles">Ver listado</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Microscope className="h-4 w-4" />
              Proyectos
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              FO-Proyecto
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 text-sm">
              <Stat
                label="Proyectos en revisión"
                value={counts.proyectosPendientes}
                accent="amber"
                icon={<Clock className="h-3 w-3" />}
              />
            </div>
            <Button asChild className="w-full">
              <Link href="/admin/revision/proyectos">Ver listado</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
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
  accent?: "amber" | "green" | "red"
  icon?: React.ReactNode
}) {
  const numberColor =
    accent === "amber"
      ? "text-amber-600"
      : accent === "green"
        ? "text-green-600"
        : accent === "red"
          ? "text-red-600"
          : ""
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${numberColor}`}>
        {value}
      </div>
    </div>
  )
}
