"use client"

import * as React from "react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  ChevronDown,
  ChevronRight,
  Shield,
  ShieldCheck,
  GraduationCap,
  Plus,
  Pencil,
  RefreshCw,
  UserCog,
  ToggleRight,
  type LucideIcon,
} from "lucide-react"
import type {
  AuditoriaLogRow,
  TipoEntidad,
  AccionAuditoria,
} from "@/lib/types/auditoria"
import { ETIQUETAS_ENTIDAD, ETIQUETAS_ACCION } from "@/lib/types/auditoria"
import { CambioDiff } from "./CambioDiff"

// ──────────────────────────────────────────────────────────────────
// Mapas de color e iconografía
// ──────────────────────────────────────────────────────────────────

const COLORES_ENTIDAD: Partial<Record<TipoEntidad, string>> = {
  PARAMETRO_GLOBAL: "bg-purple-100 text-purple-800 border-purple-200",
  PARAMETROS_MODALIDAD: "bg-violet-100 text-violet-800 border-violet-200",
  USUARIO_ROL: "bg-orange-100 text-orange-800 border-orange-200",
  USUARIO_ESTADO: "bg-amber-100 text-amber-800 border-amber-200",
  PERIODO: "bg-sky-100 text-sky-800 border-sky-200",
  AGENDA: "bg-emerald-100 text-emerald-800 border-emerald-200",
  MONITOREO: "bg-teal-100 text-teal-800 border-teal-200",
  CURSO_MAESTRO: "bg-rose-100 text-rose-800 border-rose-200",
  SOLICITUD_PERFIL: "bg-indigo-100 text-indigo-800 border-indigo-200",
}

const ICONO_ACCION: Record<AccionAuditoria, LucideIcon> = {
  CREAR: Plus,
  ACTUALIZAR: Pencil,
  CAMBIAR_ROL: UserCog,
  CAMBIAR_ESTADO: ToggleRight,
  REHABILITAR: RefreshCw,
}

const ICONO_ROL: Record<
  string,
  { Icon: LucideIcon; color: string; label: string }
> = {
  SUPERADMIN: { Icon: Shield, color: "text-red-600", label: "Superadmin" },
  ADMIN: { Icon: ShieldCheck, color: "text-yellow-600", label: "Admin" },
  DOCENTE: { Icon: GraduationCap, color: "text-gray-500", label: "Docente" },
}

// ──────────────────────────────────────────────────────────────────
// Helpers de fecha
// ──────────────────────────────────────────────────────────────────

function formatFechaCompacta(d: Date) {
  const fecha = new Date(d)
  const ahora = new Date()
  const mismoAnio = fecha.getFullYear() === ahora.getFullYear()
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    ...(mismoAnio ? {} : { year: "numeric" }),
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(fecha)
}

function formatFechaCompleta(d: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "full",
    timeStyle: "medium",
  }).format(new Date(d))
}

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function labelDia(d: Date): string {
  const hoy = startOfDay(new Date())
  const fechaDia = startOfDay(new Date(d))
  const diffDias = Math.round(
    (hoy.getTime() - fechaDia.getTime()) / (1000 * 60 * 60 * 24),
  )
  if (diffDias === 0) return "Hoy"
  if (diffDias === 1) return "Ayer"
  const mismoAnio = fechaDia.getFullYear() === hoy.getFullYear()
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    ...(mismoAnio ? {} : { year: "numeric" }),
  }).format(fechaDia)
}

// ──────────────────────────────────────────────────────────────────
// Fila
// ──────────────────────────────────────────────────────────────────

function AuditoriaRow({ item }: { item: AuditoriaLogRow }) {
  const [expanded, setExpanded] = useState(false)
  const hasDetail =
    item.antes !== null || item.despues !== null || !!item.observaciones

  const IconAccion = ICONO_ACCION[item.accion]
  const colorEntidad = COLORES_ENTIDAD[item.entidad] ?? ""
  const rolMeta = ICONO_ROL[item.actorRol] ?? ICONO_ROL.DOCENTE
  const RolIcon = rolMeta.Icon

  return (
    <>
      <TableRow
        className={`hover:bg-muted/30 ${hasDetail ? "cursor-pointer" : ""}`}
        onClick={() => hasDetail && setExpanded((v) => !v)}
      >
        <TableCell className="whitespace-nowrap py-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-muted-foreground tabular-nums cursor-help">
                {formatFechaCompacta(item.creadoEn)}
              </span>
            </TooltipTrigger>
            <TooltipContent>{formatFechaCompleta(item.creadoEn)}</TooltipContent>
          </Tooltip>
        </TableCell>

        <TableCell className="py-2">
          <div className="flex items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <RolIcon className={`h-3.5 w-3.5 shrink-0 ${rolMeta.color}`} />
              </TooltipTrigger>
              <TooltipContent>{rolMeta.label}</TooltipContent>
            </Tooltip>
            <span className="text-sm font-medium">{item.actorNombre}</span>
          </div>
        </TableCell>

        <TableCell className="py-2">
          <div className="flex items-center gap-2 text-sm flex-wrap">
            {IconAccion && (
              <IconAccion className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
            <span className="font-medium">
              {ETIQUETAS_ACCION[item.accion]}
            </span>
            <Badge
              variant="outline"
              className={`text-[10px] font-normal ${colorEntidad}`}
            >
              {ETIQUETAS_ENTIDAD[item.entidad]}
            </Badge>
          </div>
        </TableCell>

        <TableCell className="text-sm text-muted-foreground max-w-xs truncate py-2">
          {item.recursoDesc ?? "—"}
        </TableCell>

        <TableCell className="text-right py-2">
          {hasDetail &&
            (expanded ? (
              <ChevronDown className="h-3.5 w-3.5 inline text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 inline text-muted-foreground" />
            ))}
        </TableCell>
      </TableRow>

      {expanded && hasDetail && (
        <TableRow className="bg-muted/20 hover:bg-muted/20">
          <TableCell colSpan={5} className="py-3 px-6">
            {item.observaciones && (
              <p className="text-sm text-muted-foreground mb-2">
                <span className="font-medium text-foreground">
                  Observación:{" "}
                </span>
                {item.observaciones}
              </p>
            )}
            {(item.antes != null || item.despues != null) && (
              <CambioDiff antes={item.antes} despues={item.despues} />
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

// ──────────────────────────────────────────────────────────────────
// Tabla
// ──────────────────────────────────────────────────────────────────

export function AuditoriaTable({ items }: { items: AuditoriaLogRow[] }) {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        No hay eventos de auditoría para los filtros seleccionados.
      </div>
    )
  }

  // Construir filas con separadores temporales cuando cambia el día
  const filas: React.ReactNode[] = []
  let ultimoDia: string | null = null
  for (const item of items) {
    const dia = labelDia(item.creadoEn)
    if (dia !== ultimoDia) {
      filas.push(
        <TableRow
          key={`sep-${item.id}`}
          className="hover:bg-transparent border-0"
        >
          <TableCell
            colSpan={5}
            className="py-1.5 px-3 text-[10px] font-semibold text-muted-foreground bg-muted/40 uppercase tracking-wide"
          >
            {dia}
          </TableCell>
        </TableRow>,
      )
      ultimoDia = dia
    }
    filas.push(<AuditoriaRow key={item.id} item={item} />)
  }

  return (
    <TooltipProvider>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Fecha</TableHead>
              <TableHead className="w-56">Actor</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead>Recurso</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>{filas}</TableBody>
        </Table>
      </div>
    </TooltipProvider>
  )
}
