import type { TipoEntidad, AccionAuditoria, Rol } from "@/generated/prisma/client"

export type { TipoEntidad, AccionAuditoria }

export type AuditoriaFilters = {
  q?: string
  entidad?: TipoEntidad
  accion?: AccionAuditoria
  actorId?: string
  desde?: string
  hasta?: string
  page?: number
  perPage?: number
}

export type AuditoriaLogRow = {
  id: string
  actorId: string
  actorRol: Rol
  actorNombre: string
  entidad: TipoEntidad
  accion: AccionAuditoria
  recursoId: string | null
  recursoDesc: string | null
  antes: unknown
  despues: unknown
  observaciones: string | null
  creadoEn: Date
}

export type AuditoriaPage = {
  items: AuditoriaLogRow[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

export type AuditoriaStats = {
  totalHoy: number
  totalSemana: number
  porEntidad: { entidad: TipoEntidad; count: number }[]
  porAccion: { accion: AccionAuditoria; count: number }[]
}

const ENTIDADES = new Set<TipoEntidad>([
  "PARAMETRO_GLOBAL",
  "PARAMETROS_MODALIDAD",
  "USUARIO_ROL",
  "USUARIO_ESTADO",
  "PERIODO",
  "AGENDA",
  "MONITOREO",
  "CURSO_MAESTRO",
  "SOLICITUD_PERFIL",
])

const ACCIONES = new Set<AccionAuditoria>([
  "CREAR",
  "ACTUALIZAR",
  "CAMBIAR_ROL",
  "CAMBIAR_ESTADO",
  "REHABILITAR",
])

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v
}

export function parseAuditoriaFilters(
  sp: Record<string, string | string[] | undefined>,
): AuditoriaFilters {
  const q = first(sp.q)?.trim() || undefined

  const entidadRaw = first(sp.entidad) as TipoEntidad | undefined
  const entidad = entidadRaw && ENTIDADES.has(entidadRaw) ? entidadRaw : undefined

  const accionRaw = first(sp.accion) as AccionAuditoria | undefined
  const accion = accionRaw && ACCIONES.has(accionRaw) ? accionRaw : undefined

  const actorId = first(sp.actorId)?.trim() || undefined
  const desde = first(sp.desde)?.trim() || undefined
  const hasta = first(sp.hasta)?.trim() || undefined

  const pageRaw = parseInt(first(sp.page) ?? "1", 10)
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1

  const perPageRaw = parseInt(first(sp.perPage) ?? "25", 10)
  const perPage =
    Number.isFinite(perPageRaw) && perPageRaw > 0 ? Math.min(perPageRaw, 100) : 25

  return { q, entidad, accion, actorId, desde, hasta, page, perPage }
}

export function serializeAuditoriaFilters(f: Partial<AuditoriaFilters>): string {
  const sp = new URLSearchParams()
  if (f.q) sp.set("q", f.q)
  if (f.entidad) sp.set("entidad", f.entidad)
  if (f.accion) sp.set("accion", f.accion)
  if (f.actorId) sp.set("actorId", f.actorId)
  if (f.desde) sp.set("desde", f.desde)
  if (f.hasta) sp.set("hasta", f.hasta)
  if (f.page && f.page > 1) sp.set("page", String(f.page))
  if (f.perPage && f.perPage !== 25) sp.set("perPage", String(f.perPage))
  return sp.toString()
}

export const ETIQUETAS_ENTIDAD: Record<TipoEntidad, string> = {
  PARAMETRO_GLOBAL: "Parámetro Global",
  PARAMETROS_MODALIDAD: "Modalidad",
  USUARIO_ROL: "Rol Usuario",
  USUARIO_ESTADO: "Estado Usuario",
  PERIODO: "Período",
  AGENDA: "Agenda",
  MONITOREO: "Monitoreo",
  CURSO_MAESTRO: "Curso Maestro",
  SOLICITUD_PERFIL: "Solicitud de Perfil",
  PROYECTO_DOCENTE: "Proyecto Docente",
}

export const ETIQUETAS_ACCION: Record<AccionAuditoria, string> = {
  CREAR: "Crear",
  ACTUALIZAR: "Actualizar",
  CAMBIAR_ROL: "Cambiar Rol",
  CAMBIAR_ESTADO: "Cambiar Estado",
  REHABILITAR: "Rehabilitar",
}
