import type { Metadata } from "next"
import Link from "next/link"
import {
  getProyectosParaGestion,
  getConteosProyectosGestion,
  getEstadisticasProyectosGestion,
} from "@/lib/actions/proyecto-actions"
import { getPeriodos } from "@/lib/actions/periodo-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ProyectoRevisionListItem } from "@/components/proyectos/ProyectoRevisionListItem"
import { PanelProyectosActivos } from "@/components/proyectos/PanelProyectosActivos"
import { cn } from "@/lib/utils"
import { Microscope, Inbox, Plus, ClipboardCheck } from "lucide-react"

export const metadata: Metadata = {
  title: "Proyectos | Gestión SAGE",
}

type SP = Record<string, string | string[] | undefined>

function pickString(sp: SP, key: string): string | undefined {
  const v = sp[key]
  return Array.isArray(v) ? v[0] : v
}

type Estado = "ENVIADO" | "APROBADO" | "RECHAZADO" | "BORRADOR" | "TODAS"
type Tipo = "INVESTIGACION" | "PROYECCION_SOCIAL"

const TABS: { value: Estado; label: string }[] = [
  { value: "ENVIADO", label: "Por revisar" },
  { value: "APROBADO", label: "Aprobados" },
  { value: "RECHAZADO", label: "Rechazados" },
  { value: "BORRADOR", label: "Mis registros" },
  { value: "TODAS", label: "Todos" },
]

const TIPOS: { value: Tipo; label: string }[] = [
  { value: "INVESTIGACION", label: "Investigación" },
  { value: "PROYECCION_SOCIAL", label: "Proyección social" },
]

export default async function GestionProyectosPage({
  searchParams,
}: {
  searchParams: Promise<SP>
}) {
  const sp = await searchParams
  const estado = (pickString(sp, "estado") as Estado | undefined) ?? "ENVIADO"
  const tipo = pickString(sp, "tipo") as Tipo | undefined
  const periodo = pickString(sp, "periodo") || undefined
  const q = pickString(sp, "q") ?? ""
  const page = Number(pickString(sp, "page") ?? 1)

  const [data, conteos, estadisticas, periodos] = await Promise.all([
    getProyectosParaGestion({ estado, tipo, periodo, q: q || undefined, page, perPage: 20 }),
    getConteosProyectosGestion(),
    getEstadisticasProyectosGestion(),
    getPeriodos(),
  ])

  const ambito = data.autoridad?.ambitoValor

  // Construye un href preservando los filtros vigentes (cambiando solo lo indicado).
  function href(next: { estado?: Estado; tipo?: Tipo | ""; periodo?: string; q?: string }) {
    const params = new URLSearchParams()
    params.set("estado", next.estado ?? estado)
    const t = next.tipo !== undefined ? next.tipo : tipo
    if (t) params.set("tipo", t)
    const per = next.periodo !== undefined ? next.periodo : periodo
    if (per) params.set("periodo", per)
    const query = next.q !== undefined ? next.q : q
    if (query) params.set("q", query)
    return `/gestion/proyectos?${params.toString()}`
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Microscope className="h-5 w-5" />
            Proyectos de investigación y proyección social
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Investigación y proyección social
            {ambito ? (
              <> de <span className="font-medium text-foreground">{ambito}</span></>
            ) : (
              " de toda la universidad"
            )}
            . Al aprobar, vos asignás las horas de cada participante.
          </p>
        </div>
        <Button asChild size="sm" className="gap-1.5">
          <Link href="/proyectos/nuevo?paraOtro=true">
            <Plus className="h-4 w-4" />
            Registrar proyecto
          </Link>
        </Button>
      </div>

      {/* 1) Cola de revisión — lo accionable primero */}
      <Card>
        <CardHeader className="space-y-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="h-4 w-4" />
            Bandeja de revisión
            {conteos.ENVIADO > 0 && (
              <Badge className="bg-amber-500 hover:bg-amber-500">{conteos.ENVIADO} por revisar</Badge>
            )}
          </CardTitle>

          {/* Pestañas por estado con contadores */}
          <div className="flex flex-wrap gap-1.5">
            {TABS.map((t) => {
              const activo = t.value === estado
              const n = conteos[t.value]
              return (
                <Button
                  key={t.value}
                  asChild
                  size="sm"
                  variant={activo ? "default" : "outline"}
                  className="h-8 gap-1.5"
                >
                  <Link href={href({ estado: t.value })}>
                    {t.label}
                    <span
                      className={cn(
                        "rounded px-1 text-xs tabular-nums",
                        activo ? "bg-white/20" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {n}
                    </span>
                  </Link>
                </Button>
              )
            })}
          </div>

          {/* Filtros secundarios: tipo + búsqueda */}
          <form className="flex flex-wrap items-end gap-3" action="" method="get">
            <input type="hidden" name="estado" value={estado} />
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Tipo</label>
              <select
                name="tipo"
                defaultValue={tipo ?? ""}
                className="h-9 rounded-md border bg-background px-2 text-sm"
              >
                <option value="">Todos los tipos</option>
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Período</label>
              <select
                name="periodo"
                defaultValue={periodo ?? ""}
                className="h-9 rounded-md border bg-background px-2 text-sm"
              >
                <option value="">Todos los períodos</option>
                {periodos.map((p) => (
                  <option key={p.id} value={p.nombre}>{p.nombre}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 space-y-1 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground">Buscar docente</label>
              <Input name="q" defaultValue={q} placeholder="Nombre, cédula o email" />
            </div>
            <Button type="submit" size="sm" variant="secondary">Filtrar</Button>
            {(q || tipo || periodo) && (
              <Button asChild type="button" size="sm" variant="ghost">
                <Link href={href({ q: "", tipo: "", periodo: "" })}>Limpiar</Link>
              </Button>
            )}
          </form>
        </CardHeader>

        <CardContent className="space-y-3">
          {data.items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Inbox className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {estado === "ENVIADO" && !q && !tipo
                  ? "No tienes proyectos pendientes de revisión"
                  : "No hay proyectos con estos filtros en tu ámbito."}
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
                    <Link href={`${href({})}&page=${data.page - 1}`}>Anterior</Link>
                  </Button>
                )}
                {data.page < data.totalPages && (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`${href({})}&page=${data.page + 1}`}>Siguiente</Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2) Contexto — resumen de proyectos activos (secundario, abajo) */}
      {estadisticas && <PanelProyectosActivos data={estadisticas} />}
    </div>
  )
}
