import type { Metadata } from "next"
import Link from "next/link"
import { getSedeLabel } from "@/lib/utils/sede"
import { listSolicitudesParaGestion } from "@/lib/actions/solicitud-perfil"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { UserCog, Inbox } from "lucide-react"
import { SolicitudEstadoBadge } from "@/components/perfil/SolicitudEstadoBadge"
import {
  CAMPOS_EDITABLES,
  ETIQUETAS_CAMPOS,
} from "@/lib/schemas/solicitud-perfil-schema"

export const metadata: Metadata = {
  title: "Solicitudes de perfil | Gestión SAGE",
}

type SP = Record<string, string | string[] | undefined>

function pickString(sp: SP, key: string): string | undefined {
  const v = sp[key]
  return Array.isArray(v) ? v[0] : v
}

export default async function GestionPerfilesPage({
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
      | "TODAS"
      | undefined) ?? "ENVIADO"
  const q = pickString(sp, "q") ?? ""
  const page = Number(pickString(sp, "page") ?? 1)

  const data = await listSolicitudesParaGestion({
    estado,
    q: q || undefined,
    page,
    perPage: 20,
  })

  const ambito = data.autoridad?.ambitoValor

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserCog className="h-5 w-5" />
            Solicitudes de cambio de perfil
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Cambios de datos de los docentes
            {ambito ? (
              <>
                {" "}
                de <span className="font-medium text-foreground">{ambito}</span>
              </>
            ) : (
              " de toda la universidad"
            )}
            . Por defecto se muestran las que están en{" "}
            <span className="font-mono">ENVIADO</span>. Los cambios de cargo
            administrativo solo los aprueba el SuperAdmin.
          </p>
        </div>

        <form className="flex flex-wrap items-end gap-3" action="" method="get">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Estado</label>
            <select
              name="estado"
              defaultValue={estado}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              <option value="ENVIADO">En revisión</option>
              <option value="APROBADO">Aprobadas</option>
              <option value="RECHAZADO">Rechazadas</option>
              <option value="TODAS">Todas</option>
            </select>
          </div>
          <div className="flex-1 space-y-1 min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground">Buscar docente</label>
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
              No hay solicitudes con estos filtros en tu ámbito.
            </p>
          </div>
        ) : (
          <ul className="divide-y rounded-md border">
            {data.items.map((s) => {
              const cambios = s.camposDespues as Record<string, unknown>
              const camposCambiados = CAMPOS_EDITABLES.filter((c) => c in cambios)
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-3 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{s.docente.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.docente.programa} · {s.docente.facultad} ·{" "}
                      {getSedeLabel(s.docente.sedeBase)}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {camposCambiados.length === 0 ? (
                        <span className="text-xs text-muted-foreground">Sin cambios</span>
                      ) : (
                        camposCambiados.map((c) => (
                          <Badge key={c} variant="outline" className="text-xs">
                            {ETIQUETAS_CAMPOS[c]}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <SolicitudEstadoBadge estado={s.estado} />
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/gestion/perfiles/${s.id}`}>Revisar</Link>
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {data.totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 text-sm text-muted-foreground">
            <span>
              Página {data.page} de {data.totalPages} · {data.total} solicitudes
            </span>
            <div className="flex gap-2">
              {data.page > 1 && (
                <Button asChild size="sm" variant="outline">
                  <Link
                    href={`/gestion/perfiles?estado=${estado}&q=${encodeURIComponent(q)}&page=${data.page - 1}`}
                  >
                    Anterior
                  </Link>
                </Button>
              )}
              {data.page < data.totalPages && (
                <Button asChild size="sm" variant="outline">
                  <Link
                    href={`/gestion/perfiles?estado=${estado}&q=${encodeURIComponent(q)}&page=${data.page + 1}`}
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
