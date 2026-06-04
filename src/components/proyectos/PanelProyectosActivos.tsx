import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, FolderCheck, Clock } from "lucide-react"
import type { getEstadisticasProyectosGestion } from "@/lib/actions/proyecto-actions"

type Data = NonNullable<Awaited<ReturnType<typeof getEstadisticasProyectosGestion>>>

const ROL_LABEL: Record<string, string> = {
  INVESTIGADOR_PRINCIPAL: "Investigador Principal",
  COINVESTIGADOR: "Coinvestigador",
  COORDINADOR: "Coordinador",
  COGESTOR: "Cogestor",
}

/**
 * Panel de resumen de proyectos APROBADOS (activos) por docente del ámbito
 * (programa para el jefe, facultad para el decano, global para superadmin).
 * Embebido arriba de la lista de revisión en `/gestion/proyectos`.
 */
export function PanelProyectosActivos({ data }: { data: Data }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FolderCheck className="h-4 w-4" />
          Proyectos activos{" "}
          <span className="font-normal text-muted-foreground">
            · {data.ambito ?? "toda la universidad"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Totales */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border bg-muted/20 p-3 text-center">
            <Users className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
            <p className="text-2xl font-bold tabular-nums">{data.totales.docentes}</p>
            <p className="text-xs text-muted-foreground">Docentes</p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3 text-center">
            <FolderCheck className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
            <p className="text-2xl font-bold tabular-nums">{data.totales.proyectos}</p>
            <p className="text-xs text-muted-foreground">Proyectos</p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3 text-center">
            <Clock className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
            <p className="text-2xl font-bold tabular-nums">{data.totales.horas} h</p>
            <p className="text-xs text-muted-foreground">Horas asignadas</p>
          </div>
        </div>

        {/* Docentes con sus proyectos */}
        {data.docentes.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Aún no hay docentes con proyectos aprobados en tu ámbito.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {data.docentes.map((d) => (
              <li key={d.id} className="space-y-1.5 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{d.nombre}</p>
                    <p className="text-xs text-muted-foreground">{d.programa}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {d.totalHoras} h
                  </span>
                </div>
                <ul className="space-y-0.5 border-l pl-3">
                  {d.proyectos.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-2 text-xs text-muted-foreground"
                    >
                      <span className="truncate">
                        {p.titulo} · {ROL_LABEL[p.rol] ?? p.rol}
                      </span>
                      <span className="shrink-0 tabular-nums">{p.horas} h</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
