import type { EstadoFormulario, Modalidad, Sede } from "@/generated/prisma/client"

export type FiltroEstado = EstadoFormulario | "TODAS"

export type RevisionFilters = {
  q?: string
  periodo?: string
  estado?: FiltroEstado
  modalidad?: Modalidad
  sede?: Sede
  facultad?: string
  programa?: string
  rehabilitadas?: "true" | "false"
  page?: number
  perPage?: number
  orderBy?: "updatedAt" | "createdAt" | "docente"
  orderDir?: "asc" | "desc"
}

export type RevisionPage<T> = {
  items: T[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

const ESTADOS = new Set<FiltroEstado>([
  "BORRADOR",
  "ENVIADO",
  "APROBADO",
  "RECHAZADO",
  "TODAS",
])

const MODALIDADES = new Set<Modalidad>([
  "PLANTA_TC",
  "PLANTA_MT",
  "OCASIONAL_TC",
  "OCASIONAL_MT",
  "CATEDRA",
  "VISITANTE",
  "INVITADO",
])

const SEDES = new Set<Sede>(["NEIVA", "PITALITO", "GARZON", "LA_PLATA"])

const ORDER_BY = new Set(["updatedAt", "createdAt", "docente"] as const)

/**
 * Parse searchParams (de Next.js) en filtros tipados.
 * Acepta tanto `string | string[] | undefined` (forma cruda de Next) como Record<string,string>.
 */
export function parseRevisionFilters(
  sp: Record<string, string | string[] | undefined>,
): RevisionFilters {
  const first = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v

  const q = first(sp.q)?.trim() || undefined
  const periodo = first(sp.periodo)?.trim() || undefined
  const facultad = first(sp.facultad)?.trim() || undefined
  const programa = first(sp.programa)?.trim() || undefined

  const estadoRaw = first(sp.estado) as FiltroEstado | undefined
  const estado = estadoRaw && ESTADOS.has(estadoRaw) ? estadoRaw : "ENVIADO"

  const modalidadRaw = first(sp.modalidad) as Modalidad | undefined
  const modalidad =
    modalidadRaw && MODALIDADES.has(modalidadRaw) ? modalidadRaw : undefined

  const sedeRaw = first(sp.sede) as Sede | undefined
  const sede = sedeRaw && SEDES.has(sedeRaw) ? sedeRaw : undefined

  const rehabilitadasRaw = first(sp.rehabilitadas)
  const rehabilitadas =
    rehabilitadasRaw === "true" || rehabilitadasRaw === "false"
      ? rehabilitadasRaw
      : undefined

  const pageRaw = parseInt(first(sp.page) ?? "1", 10)
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1

  const perPageRaw = parseInt(first(sp.perPage) ?? "20", 10)
  const perPage =
    Number.isFinite(perPageRaw) && perPageRaw > 0
      ? Math.min(perPageRaw, 100)
      : 20

  const orderByRaw = first(sp.orderBy) as
    | "updatedAt"
    | "createdAt"
    | "docente"
    | undefined
  const orderBy =
    orderByRaw && ORDER_BY.has(orderByRaw) ? orderByRaw : "updatedAt"

  const orderDirRaw = first(sp.orderDir)
  const orderDir = orderDirRaw === "asc" ? "asc" : "desc"

  return {
    q,
    periodo,
    estado,
    modalidad,
    sede,
    facultad,
    programa,
    rehabilitadas,
    page,
    perPage,
    orderBy,
    orderDir,
  }
}

/** Serializa filtros a URLSearchParams para construir URLs (sin defaults). */
export function serializeRevisionFilters(f: Partial<RevisionFilters>): string {
  const sp = new URLSearchParams()
  if (f.q) sp.set("q", f.q)
  if (f.periodo) sp.set("periodo", f.periodo)
  if (f.estado && f.estado !== "ENVIADO") sp.set("estado", f.estado)
  if (f.modalidad) sp.set("modalidad", f.modalidad)
  if (f.sede) sp.set("sede", f.sede)
  if (f.facultad) sp.set("facultad", f.facultad)
  if (f.programa) sp.set("programa", f.programa)
  if (f.rehabilitadas) sp.set("rehabilitadas", f.rehabilitadas)
  if (f.page && f.page > 1) sp.set("page", String(f.page))
  if (f.perPage && f.perPage !== 20) sp.set("perPage", String(f.perPage))
  if (f.orderBy && f.orderBy !== "updatedAt") sp.set("orderBy", f.orderBy)
  if (f.orderDir && f.orderDir !== "desc") sp.set("orderDir", f.orderDir)
  return sp.toString()
}
