"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Users, FolderCheck, Search, Inbox } from "lucide-react"
import type { getEstadisticasProyectosGestion } from "@/lib/actions/proyecto-actions"

type Data = NonNullable<Awaited<ReturnType<typeof getEstadisticasProyectosGestion>>>

const TODOS = "__todos__"

const ROL_LABEL: Record<string, string> = {
  INVESTIGADOR_PRINCIPAL: "Investigador Principal",
  COINVESTIGADOR: "Coinvestigador",
  COORDINADOR: "Coordinador",
  COGESTOR: "Cogestor",
}

const TIPO_LABEL: Record<string, string> = {
  INVESTIGACION: "Investigación",
  PROYECCION_SOCIAL: "Proyección social",
}

/**
 * Resumen de proyectos APROBADOS (activos) por docente del ámbito, con filtros
 * (búsqueda + facultad + programa) para que el superadmin (toda la universidad)
 * y el decano/jefe puedan acotar. Las horas ya no se muestran: viven en la agenda.
 */
export function PanelProyectosActivos({ data }: { data: Data }) {
  const [busqueda, setBusqueda] = useState("")
  const [facultad, setFacultad] = useState<string>(TODOS)
  const [programa, setPrograma] = useState<string>(TODOS)

  const facultades = useMemo(
    () => [...new Set(data.docentes.map((d) => d.facultad))].sort((a, b) => a.localeCompare(b)),
    [data.docentes],
  )
  // Programas disponibles según la facultad elegida.
  const programas = useMemo(
    () =>
      [
        ...new Set(
          data.docentes
            .filter((d) => facultad === TODOS || d.facultad === facultad)
            .map((d) => d.programa),
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [data.docentes, facultad],
  )

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return data.docentes.filter((d) => {
      if (facultad !== TODOS && d.facultad !== facultad) return false
      if (programa !== TODOS && d.programa !== programa) return false
      if (q && !d.nombre.toLowerCase().includes(q)) return false
      return true
    })
  }, [data.docentes, busqueda, facultad, programa])

  const proyectosVisibles = useMemo(
    () => new Set(filtrados.flatMap((d) => d.proyectos.map((p) => p.id))).size,
    [filtrados],
  )

  const mostrarFacultad = facultades.length > 1
  const mostrarPrograma = programas.length > 1

  return (
    <Card>
      <CardHeader className="space-y-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <FolderCheck className="h-4 w-4" />
          Proyectos activos{" "}
          <span className="font-normal text-muted-foreground">
            · {data.ambito ?? "Toda la universidad"}
          </span>
        </CardTitle>

        {/* Totales (de lo filtrado) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border bg-muted/20 p-3 text-center">
            <Users className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
            <p className="text-2xl font-bold tabular-nums">{filtrados.length}</p>
            <p className="text-xs text-muted-foreground">Docentes</p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3 text-center">
            <FolderCheck className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
            <p className="text-2xl font-bold tabular-nums">{proyectosVisibles}</p>
            <p className="text-xs text-muted-foreground">Proyectos</p>
          </div>
        </div>

        {/* Filtros */}
        {(mostrarFacultad || mostrarPrograma || data.docentes.length > 0) && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar docente por nombre…"
                className="pl-8"
              />
            </div>
            {mostrarFacultad && (
              <Select
                value={facultad}
                onValueChange={(v) => { setFacultad(v); setPrograma(TODOS) }}
              >
                <SelectTrigger className="sm:w-56">
                  <SelectValue placeholder="Facultad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODOS}>Todas las facultades</SelectItem>
                  {facultades.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {mostrarPrograma && (
              <Select value={programa} onValueChange={setPrograma}>
                <SelectTrigger className="sm:w-56">
                  <SelectValue placeholder="Programa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODOS}>Todos los programas</SelectItem>
                  {programas.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {filtrados.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Inbox className="h-9 w-9 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {data.docentes.length === 0
                ? "Aún no hay docentes con proyectos aprobados en tu ámbito."
                : "Ningún docente coincide con el filtro."}
            </p>
          </div>
        ) : (
          <ul className="divide-y rounded-md border">
            {filtrados.map((d) => (
              <li key={d.id} className="space-y-1.5 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{d.nombre}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {data.tipo === "JEFE" ? d.programa : `${d.programa} · ${d.facultad}`}
                  </p>
                </div>
                <ul className="space-y-1 border-l pl-3">
                  {d.proyectos.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate text-muted-foreground">
                        {p.titulo} · {ROL_LABEL[p.rol] ?? p.rol}
                      </span>
                      <Badge variant="outline" className="shrink-0 font-normal">
                        {TIPO_LABEL[p.tipo] ?? p.tipo}
                      </Badge>
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
