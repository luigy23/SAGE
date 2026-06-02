import type { Metadata } from "next"
import Link from "next/link"
import { getProyectosParaAdmin } from "@/lib/actions/proyecto-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ProyectoStatusBadge } from "@/components/proyectos/ProyectoStatusBadge"
import { Microscope, Inbox } from "lucide-react"
import { formatFechaInicio } from "@/lib/utils"
import { getSedeLabel } from "@/lib/utils/sede"

export const metadata: Metadata = {
  title: "Revisión de Proyectos | SAGE",
}

type SP = Record<string, string | string[] | undefined>

function pickString(sp: SP, key: string): string | undefined {
  const v = sp[key]
  if (Array.isArray(v)) return v[0]
  return v
}

const TIPO_LABEL: Record<string, string> = {
  INVESTIGACION: "Investigación",
  PROYECCION_SOCIAL: "Proyección Social",
}

const ROL_LABEL: Record<string, string> = {
  INVESTIGADOR_PRINCIPAL: "Investigador Principal",
  COINVESTIGADOR: "Coinvestigador",
  COORDINADOR: "Coordinador",
  COGESTOR: "Cogestor",
}

export default async function RevisionProyectosPage({
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await getProyectosParaAdmin({
    estado,
    q: q || undefined,
    page,
    perPage: 20,
  })

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Microscope className="h-5 w-5" />
            Proyectos de docentes
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Proyectos de investigación y proyección social pendientes de
            aprobación. Por defecto se muestran los proyectos en estado{" "}
            <span className="font-mono">ENVIADO</span>.
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
            <Input
              name="q"
              defaultValue={q}
              placeholder="Nombre, cédula o email"
            />
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
              No hay proyectos con estos filtros.
            </p>
          </div>
        ) : (
          <ul className="divide-y rounded-md border">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(data.items as any[]).map((p: any) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-3 p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{p.docente.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.docente.programa} · {p.docente.facultad} ·{" "}
                    {getSedeLabel(p.docente.sedeBase)}
                  </p>
                  <p className="mt-0.5 text-sm">{p.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {TIPO_LABEL[p.tipo] ?? p.tipo} ·{" "}
                    {ROL_LABEL[p.rolDocente] ?? p.rolDocente}
                    {p.periodoInicio ? ` · ${formatFechaInicio(p.periodoInicio)}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.createdAt).toLocaleDateString("es-CO", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <ProyectoStatusBadge estado={p.estado} />
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/admin/revision/proyectos/${p.id}`}>
                      Revisar
                    </Link>
                  </Button>
                </div>
              </li>
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
                    href={`/admin/revision/proyectos?estado=${estado}&q=${encodeURIComponent(q)}&page=${data.page - 1}`}
                  >
                    Anterior
                  </Link>
                </Button>
              )}
              {data.page < data.totalPages && (
                <Button asChild size="sm" variant="outline">
                  <Link
                    href={`/admin/revision/proyectos?estado=${estado}&q=${encodeURIComponent(q)}&page=${data.page + 1}`}
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
  )
}
