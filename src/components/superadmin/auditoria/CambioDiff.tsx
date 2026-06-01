import * as React from "react"
import { ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"

/**
 * Mapeo de keys técnicas (JSON) a etiquetas humanas. Si la key no está aquí,
 * se hace un fallback de camelCase → "Camel case".
 */
const ETIQUETAS_CAMPO: Record<string, string> = {
  estadoCuenta: "Estado de cuenta",
  estado: "Estado",
  rol: "Rol",
  actorRol: "Rol del actor",
  modalidad: "Modalidad",
  sedeBase: "Sede",
  facultad: "Facultad",
  programa: "Programa",
  cargoAdministrativo: "Cargo administrativo",
  tipoCargo: "Tipo de cargo",
  cargoAmbitoValor: "Programa / Facultad",
  doctorado: "Doctorado",
  tituloDoctorado: "Título de doctorado",
  proyectosActivos: "Proyectos activos",
  semanasVinculacion: "Semanas de vinculación",
  observacionesAdmin: "Observaciones",
  celular: "Celular",
  valor: "Valor",
  tipo: "Tipo",
  descripcion: "Descripción",
  articuloOrigen: "Artículo origen",
  nombre: "Nombre",
  fechaInicio: "Fecha de inicio",
  fechaFin: "Fecha de fin",
  agendaDesde: "Apertura de agenda",
  agendaHasta: "Cierre de agenda",
  monitoreoDesde: "Apertura de monitoreo",
  monitoreoHasta: "Cierre de monitoreo",
  horasSemanalMax: "Horas semanales máx.",
  horasSemestralMax: "Horas semestrales máx.",
  minDocencia: "Mín. docencia",
  minDocenciaConProyectos: "Mín. docencia (con proyectos)",
  aplicaSoloAModalidades: "Modalidades aplicables",
  topeSemestralH: "Tope semestral (h)",
  topePorUnidad: "Tope por unidad",
  unidadMax: "Unidad máx.",
  aplicaUnoPorPrograma: "Uno por programa",
  aplicaUnoPorFacultad: "Uno por facultad",
  aplicaUnoPorSede: "Uno por sede",
}

function humanize(key: string): string {
  if (ETIQUETAS_CAMPO[key]) return ETIQUETAS_CAMPO[key]
  const spaced = key.replace(/([A-Z])/g, " $1").trim()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase()
}

function formatVal(v: unknown): React.ReactNode {
  if (v === null || v === undefined || v === "") {
    return <span className="text-muted-foreground italic">—</span>
  }
  if (typeof v === "boolean") return v ? "Sí" : "No"
  if (Array.isArray(v)) {
    if (v.length === 0) {
      return <span className="text-muted-foreground italic">vacío</span>
    }
    return (
      <span className="inline-flex flex-wrap gap-1">
        {v.map((x, i) => (
          <Badge key={i} variant="outline" className="text-[10px] font-normal">
            {String(x)}
          </Badge>
        ))}
      </span>
    )
  }
  if (typeof v === "object") {
    return <code className="text-xs">{JSON.stringify(v)}</code>
  }
  return String(v)
}

type Cambio = {
  key: string
  valA: unknown
  valD: unknown
  soloAntes: boolean
  soloDespues: boolean
  changed: boolean
}

function calcularCambios(antes: unknown, despues: unknown): Cambio[] {
  const a =
    antes && typeof antes === "object" ? (antes as Record<string, unknown>) : {}
  const d =
    despues && typeof despues === "object"
      ? (despues as Record<string, unknown>)
      : {}
  const allKeys = Array.from(new Set([...Object.keys(a), ...Object.keys(d)]))
  return allKeys
    .map((key) => {
      const soloAntes = key in a && !(key in d)
      const soloDespues = !(key in a) && key in d
      const changed = JSON.stringify(a[key]) !== JSON.stringify(d[key])
      return {
        key,
        valA: a[key],
        valD: d[key],
        soloAntes,
        soloDespues,
        changed: soloAntes || soloDespues || changed,
      }
    })
    .filter((c) => c.changed)
}

export function CambioDiff({
  antes,
  despues,
}: {
  antes: unknown
  despues: unknown
}) {
  const cambios = calcularCambios(antes, despues)
  if (cambios.length === 0) return null

  const soloUno = !antes || !despues
  // Modo inline: exactamente 1 campo cambiado y existen ambos lados.
  const modoInline = cambios.length === 1 && !soloUno

  if (modoInline) {
    const { key, valA, valD } = cambios[0]
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm py-1">
        <span className="font-medium text-foreground">{humanize(key)}</span>
        <Badge
          variant="outline"
          className="bg-red-50 text-red-700 border-red-200 font-mono text-xs line-through decoration-red-400"
        >
          {formatVal(valA)}
        </Badge>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
        <Badge
          variant="outline"
          className="bg-green-50 text-green-700 border-green-200 font-mono text-xs"
        >
          {formatVal(valD)}
        </Badge>
      </div>
    )
  }

  return (
    <div className="rounded-lg border overflow-hidden text-sm">
      {!soloUno && (
        <div className="flex items-stretch border-b bg-muted/40 text-xs font-medium text-muted-foreground">
          <div className="min-w-[8rem] shrink-0 px-3 py-1.5 border-r">Campo</div>
          <div className="flex-1 px-3 py-1.5 border-r">Antes</div>
          <div className="flex-1 px-3 py-1.5">Después</div>
        </div>
      )}
      {cambios.map(({ key, valA, valD, soloAntes, soloDespues }) => {
        const cambioReal =
          !soloUno && JSON.stringify(valA) !== JSON.stringify(valD)
        return (
          <div
            key={key}
            className={`flex items-stretch border-b last:border-b-0 ${
              cambioReal ? "bg-amber-50/50" : ""
            }`}
          >
            <div className="min-w-[8rem] shrink-0 px-3 py-2 bg-muted/20 border-r font-medium text-xs flex items-center">
              {humanize(key)}
            </div>

            {soloUno ? (
              <div
                className={`flex-1 px-3 py-2 font-medium ${
                  soloAntes
                    ? "text-red-700 bg-red-50"
                    : "text-green-700 bg-green-50"
                }`}
              >
                {formatVal(soloAntes ? valA : valD)}
              </div>
            ) : (
              <>
                <div
                  className={`flex-1 px-3 py-2 border-r ${
                    cambioReal
                      ? "text-red-700 bg-red-50 line-through decoration-red-400"
                      : "text-muted-foreground"
                  }`}
                >
                  {formatVal(valA)}
                </div>
                <div
                  className={`flex-1 px-3 py-2 font-medium ${
                    cambioReal ? "text-green-700 bg-green-50" : "text-muted-foreground"
                  }`}
                >
                  {formatVal(valD)}
                </div>
              </>
            )}
            {/* Marcar visualmente las claves "solo en un lado" cuando ambos lados existen */}
            {!soloUno && (soloAntes || soloDespues) && (
              <span className="sr-only">
                {soloAntes ? "Campo eliminado" : "Campo nuevo"}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
