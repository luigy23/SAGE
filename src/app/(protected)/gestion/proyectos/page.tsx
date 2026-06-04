import type { Metadata } from "next"
import Link from "next/link"
import {
  getProyectosParaGestion,
  getEstadisticasProyectosGestion,
} from "@/lib/actions/proyecto-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ProyectoRevisionListItem } from "@/components/proyectos/ProyectoRevisionListItem"
import { PanelProyectosActivos } from "@/components/proyectos/PanelProyectosActivos"
import { Microscope, Inbox } from "lucide-react"

export const metadata: Metadata = {
  title: "Proyectos | Gestión SAGE",
}

type SP = Record<string, string | string[] | undefined>

function pickString(sp: SP, key: string): string | undefined {
  const v = sp[key]
  return Array.isArray(v) ? v[0] : v
}

export default async function GestionProyectosPage({
  searchParams,
}: {
  searchParams: Promise<SP>
}) {
  const sp = await searchParams
  const estado =
    (pickString(sp, "estado") as
      | "ENVIADO"
      | "APROBADO"
      | "RECHAZADO"
      | "BORRADOR"
      | "TODAS"
      | undefined) ?? "ENVIADO"
  const q = pickString(sp, "q") ?? ""
  const page = Number(pickString(sp, "page") ?? 1)

  const [data, estadisticas] = await Promise.all([
    getProyectosParaGestion({ estado, q: q || undefined, page, perPage: 20 }),
    getEstadisticasProyectosGestion(),
  ])

  const ambito = data.autoridad?.ambitoValor

  return (
    <div className="space-y-6">
      {estadisticas && <PanelProyectosActivos data={estadisticas} />}
      <Card>
      <CardHeader className="space-y-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Microscope className="h-5 w-5" />
            Proyectos de docentes
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Proyectos de investigación y proyección social
            {ambito ? (
              <>
                {" "}
                de <span className="font-medium text-foreground">{ambito}</span>
              </>
            ) : (
              " de toda la universidad"
            )}
            . Por defecto se muestran los que están en{" "}
            <span className="font-mono">ENVIADO</span> (pendientes de tu
            aprobación). Al aprobar, tú asignas las horas de cada participante.
          </p>
        </div>

        <form className="flex flex-wrap items-end gap-3" action="" method="get">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Estado
            </label>
            <select
              name="estado"
              defaultValue={estado}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              <option value="ENVIADO">En revisión</option>
              <option value="APROBADO">Aprobados</option>
              <option value="RECHAZADO">Rechazados</option>
              <option value="BORRADOR">Borrador</option>
              <option value="TODAS">Todos</option>
            </select>
          </div>
          <div className="flex-1 space-y-1 min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground">
              Buscar docente
            </label>
            <Input name="q" defaultValue={q} placeholder="Nombre, cédula o email" />
          </div>
          <Button type="submit" size="sm">
            Filtrar
          </Button>
        </form>
      </CardHeader>

      <CardContent className="space-y-3">
        {data.items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No hay proyectos con estos filtros en tu ámbito.
            </p>
          </div>
        ) : (
          <ul className="divide-y rounded-md border">
            {data.items.map((p) => (
              <ProyectoRevisionListItem
                key={p.id}
                proyecto={p}
                basePath="/gestion/proyectos"
              />
            ))}
          </ul>
        )}

        {data.totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 text-sm text-muted-foreground">
            <span>
              Página {data.page} de {data.totalPages} · {data.total} proyectos
            </span>
            <div className="flex gap-2">
              {data.page > 1 && (
                <Button asChild size="sm" variant="outline">
                  <Link
                    href={`/gestion/proyectos?estado=${estado}&q=${encodeURIComponent(q)}&page=${data.page - 1}`}
                  >
                    Anterior
                  </Link>
                </Button>
              )}
              {data.page < data.totalPages && (
                <Button asChild size="sm" variant="outline">
                  <Link
                    href={`/gestion/proyectos?estado=${estado}&q=${encodeURIComponent(q)}&page=${data.page + 1}`}
                  >
                    Siguiente
                  </Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  )
}
