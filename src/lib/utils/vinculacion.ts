/**
 * Utilidades puras de vinculación contractual — client-safe (sin Prisma, sin React).
 *
 * Las modalidades temporales no-PLANTA (ocasional, visitante, cátedra visitante) se
 * contratan por un rango de fechas que puede abarcar uno o más periodos académicos
 * (ej. un ocasional de ~11 meses trabaja en dos semestres). Estas funciones derivan,
 * a partir de ese rango y de las fechas de cada `PeriodoAcademico`, qué semestres cubre
 * el contrato y cuántas semanas trabaja en cada uno.
 *
 * La aritmética de semanas replica la de `periodo-server.ts` (ms / 1 semana, redondeo).
 */

const MS_POR_SEMANA = 7 * 24 * 60 * 60 * 1000

export type PeriodoRango = {
  nombre: string
  fechaInicio: Date
  fechaFin: Date
}

export type PeriodoCubierto = {
  nombre: string
  semanasEnPeriodo: number
}

function semanasEntre(desde: Date, hasta: Date): number {
  return Math.max(0, Math.round((hasta.getTime() - desde.getTime()) / MS_POR_SEMANA))
}

/**
 * Semanas del contrato que caen dentro de un periodo (solape de los dos rangos).
 * Devuelve 0 si no hay solape. Si hay solape positivo, mínimo 1 semana.
 */
export function semanasDeContratoEnPeriodo(
  desde: Date,
  hasta: Date,
  periodo: { fechaInicio: Date; fechaFin: Date },
): number {
  const ini = desde > periodo.fechaInicio ? desde : periodo.fechaInicio
  const fin = hasta < periodo.fechaFin ? hasta : periodo.fechaFin
  if (fin <= ini) return 0
  return Math.max(1, semanasEntre(ini, fin))
}

/**
 * Periodos que cubre el contrato (solape > 0), con las semanas trabajadas en cada uno.
 * Útil para mostrarle al docente / jefe los semestres que abarca la vinculación.
 */
export function derivarPeriodosDeContrato(
  desde: Date,
  hasta: Date,
  periodos: PeriodoRango[],
): PeriodoCubierto[] {
  return periodos
    .map((p) => ({
      nombre: p.nombre,
      semanasEnPeriodo: semanasDeContratoEnPeriodo(desde, hasta, p),
    }))
    .filter((p) => p.semanasEnPeriodo > 0)
}
