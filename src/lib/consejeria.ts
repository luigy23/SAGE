import "server-only"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma/client"
import { cohortesValidas, ordinalPeriodo, semestresEntre } from "@/lib/utils/periodo"
import { EMPTY_ACTIVIDAD, type ActividadFormData } from "@/lib/schemas/agenda-schema"

/**
 * Helpers de Consejería (Art. 11) — solo servidor.
 *
 * Una "cohorte" es el período de ingreso (ej. "2025-2"). Reglas:
 *  - Un solo consejero por cohorte y PROGRAMA (exclusividad).
 *  - La consejería dura hasta 6 semestres desde el período de ingreso.
 *  - El docente elige por cuántos semestres asume cada cohorte (`semestresCompromiso`);
 *    se reserva al ENVIAR la agenda y se libera si la agenda se rechaza o al cumplirse.
 *
 * Fuente de verdad: tabla `ConsejeriaCompromiso`.
 */

const VENTANA = 6
const NOMBRE_CONSEJERIA = "Consejería Académica"

type CompromisoBase = {
  periodoInicio: string
  semestresCompromiso: number
  estado: "ACTIVO" | "LIBERADO"
}

/** ¿El compromiso está vigente en el período `periodo`? */
function activoEnPeriodo(c: CompromisoBase, periodo: string): boolean {
  if (c.estado !== "ACTIVO") return false
  const ini = ordinalPeriodo(c.periodoInicio)
  const p = ordinalPeriodo(periodo)
  if (Number.isNaN(ini) || Number.isNaN(p)) return false
  return p >= ini && p <= ini + c.semestresCompromiso - 1
}

/** Máximo de semestres comprometibles para `cohorte` desde `periodo` (vida restante). */
export function maxSemestresCohorte(cohorte: string, periodo: string): number {
  const transcurridos = semestresEntre(cohorte, periodo)
  if (!Number.isFinite(transcurridos)) return 0
  return Math.max(0, VENTANA - transcurridos)
}

export type CompromisoActivo = {
  id: string
  cohorte: string
  semestreActual: number
  semestresCompromiso: number
}

/** Compromisos del docente vigentes en `periodo`, con "semestre X de Y". */
export async function getCompromisosActivos(
  docenteId: string,
  periodo: string,
): Promise<CompromisoActivo[]> {
  const compromisos = await prisma.consejeriaCompromiso.findMany({
    where: { docenteId, estado: "ACTIVO" },
    orderBy: { cohorte: "desc" },
  })
  return compromisos
    .filter((c) => activoEnPeriodo(c, periodo))
    .map((c) => ({
      id: c.id,
      cohorte: c.cohorte,
      semestreActual: semestresEntre(c.periodoInicio, periodo) + 1,
      semestresCompromiso: c.semestresCompromiso,
    }))
}

export type CohorteDisponible = { cohorte: string; maxSemestres: number }

/**
 * Cohortes que un docente del programa PUEDE tomar en `periodo`: vigentes (últimos 6
 * semestres) y sin consejero activo. Cada una con su tope de duración dinámico.
 */
export async function getCohortesDisponibles(
  programa: string,
  periodo: string,
): Promise<CohorteDisponible[]> {
  const vigentes = cohortesValidas(periodo)
  const comprometidos = await prisma.consejeriaCompromiso.findMany({
    where: { programa, estado: "ACTIVO" },
    select: { cohorte: true, periodoInicio: true, semestresCompromiso: true, estado: true },
  })
  const tomadas = new Set(
    comprometidos.filter((c) => activoEnPeriodo(c, periodo)).map((c) => c.cohorte),
  )
  return vigentes
    .filter((c) => !tomadas.has(c))
    .map((c) => ({ cohorte: c, maxSemestres: maxSemestresCohorte(c, periodo) }))
    .filter((o) => o.maxSemestres >= 1)
}

export type ConsejeriaInyectada = {
  nombre: string
  cohortes: string[]
  compromisos: CompromisoActivo[]
  cantidadUnidades: number
  topePorCohorte: number
}

/**
 * Tarjeta de Consejería a inyectar (bloqueada) en la agenda del docente: sus cohortes
 * amarradas vigentes en `periodo`. Las HORAS no se pre-llenan (el docente las digita).
 * `null` si no tiene compromisos activos.
 */
export async function getConsejeriaInyectada(
  docenteId: string,
  periodo: string,
): Promise<ConsejeriaInyectada | null> {
  const activos = await getCompromisosActivos(docenteId, periodo)
  if (activos.length === 0) return null
  const cohortes = activos.map((a) => a.cohorte)
  const cat = await prisma.catalogoActividad.findFirst({
    where: { nombre: NOMBRE_CONSEJERIA, categoria: "DOCENCIA" },
    select: { nombre: true, topeSemestralH: true },
  })
  return {
    nombre: cat?.nombre ?? NOMBRE_CONSEJERIA,
    cohortes,
    compromisos: activos,
    cantidadUnidades: cohortes.length,
    topePorCohorte: cat?.topeSemestralH ?? 48,
  }
}

/**
 * Inyecta (de forma forzosa) la actividad de Consejería con las cohortes amarradas
 * en una lista de actividades de docencia, preservando las horas/descr. si ya existía.
 * Si no hay compromisos activos, devuelve la lista sin cambios.
 */
export function inyectarConsejeriaEnActividades(
  actividades: ActividadFormData[],
  inyectada: ConsejeriaInyectada | null,
): ActividadFormData[] {
  if (!inyectada) return actividades
  const previa = actividades.find((a) => a.nombre === inyectada.nombre)
  const resto = actividades.filter((a) => a.nombre !== inyectada.nombre)
  const card: ActividadFormData = {
    ...EMPTY_ACTIVIDAD,
    nombre: inyectada.nombre,
    descripcion: previa?.descripcion ?? "",
    dedicacionPeriodo: previa?.dedicacionPeriodo ?? 0,
    cantidadUnidades: inyectada.cantidadUnidades,
    cohortes: inyectada.cohortes,
    cohortesCompromiso: [],
  }
  return [card, ...resto]
}

/**
 * Reserva (al ENVIAR la agenda) los compromisos de las cohortes NUEVAS. Valida
 * exclusividad (boleto de cine) y el tope de duración. Lanza Error para abortar la
 * transacción si una cohorte ya está tomada o la duración es inválida.
 */
export async function reservarCompromisos(
  tx: Prisma.TransactionClient,
  docenteId: string,
  programa: string,
  periodo: string,
  nuevas: { cohorte: string; semestres: number }[],
): Promise<void> {
  for (const n of nuevas) {
    // Adquirir un lock a nivel de transacción en Postgres para evitar race conditions concurrentes.
    // Usamos hashtext para generar un ID entero de 32-bit basado en "programa-cohorte".
    await tx.$executeRawUnsafe(
      `SELECT pg_advisory_xact_lock(hashtext($1))`,
      `${programa}-${n.cohorte}`
    )

    const existentes = await tx.consejeriaCompromiso.findMany({
      where: { programa, cohorte: n.cohorte, estado: "ACTIVO" },
      select: { periodoInicio: true, semestresCompromiso: true, estado: true },
    })
    if (existentes.some((c) => activoEnPeriodo(c, periodo))) {
      throw new Error(`La cohorte ${n.cohorte} ya tiene consejero. Elegí otra cohorte.`)
    }
    const maxSem = maxSemestresCohorte(n.cohorte, periodo)
    if (n.semestres < 1 || n.semestres > maxSem) {
      throw new Error(`La duración de la cohorte ${n.cohorte} debe ser entre 1 y ${maxSem} semestres.`)
    }
    await tx.consejeriaCompromiso.create({
      data: {
        docenteId,
        programa,
        cohorte: n.cohorte,
        periodoInicio: periodo,
        semestresCompromiso: n.semestres,
        creadaEnPeriodo: periodo,
        estado: "ACTIVO",
      },
    })
  }
}

/** Libera los compromisos creados por la agenda de `periodo` de ese docente (al rechazar/retirar). */
export async function liberarCompromisosDeAgenda(
  tx: Prisma.TransactionClient,
  docenteId: string,
  periodo: string,
): Promise<void> {
  await tx.consejeriaCompromiso.updateMany({
    where: { docenteId, creadaEnPeriodo: periodo, estado: "ACTIVO" },
    data: { estado: "LIBERADO", liberadoEn: new Date() },
  })
}

export type CohorteConsejero = {
  cohorte: string
  consejero: string | null
  compromisoId: string | null
  semestreActual: number | null
  semestresCompromiso: number | null
}

/**
 * Cohortes vigentes del programa y su consejero (con "Sem X de Y") en `periodo`.
 * Lee de los compromisos. Útil para el panel del jefe y el botón "Liberar".
 */
export async function getCohortesConsejeros(
  programa: string,
  periodo: string,
): Promise<CohorteConsejero[]> {
  const vigentes = cohortesValidas(periodo)
  const compromisos = await prisma.consejeriaCompromiso.findMany({
    where: { programa, estado: "ACTIVO" },
    include: { docente: { select: { nombre: true } } },
  })
  const porCohorte = new Map(
    compromisos.filter((c) => activoEnPeriodo(c, periodo)).map((c) => [c.cohorte, c]),
  )
  return vigentes.map((cohorte) => {
    const c = porCohorte.get(cohorte)
    if (!c) {
      return { cohorte, consejero: null, compromisoId: null, semestreActual: null, semestresCompromiso: null }
    }
    return {
      cohorte,
      consejero: c.docente.nombre,
      compromisoId: c.id,
      semestreActual: semestresEntre(c.periodoInicio, periodo) + 1,
      semestresCompromiso: c.semestresCompromiso,
    }
  })
}
