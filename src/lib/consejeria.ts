import "server-only"
import { prisma } from "@/lib/prisma"
import {
  cohorteVigente,
  cohortesValidas,
  ordinalPeriodo,
  semestresEntre,
} from "@/lib/utils/periodo"

/**
 * Helpers de Consejería (Art. 11) — solo servidor.
 *
 * Una "cohorte" es el período de ingreso (ej. "2026-1"). Reglas vigentes:
 *  - Un solo consejero por cohorte y PROGRAMA.
 *  - La consejería dura 6 semestres (inclusive) desde el período de ingreso.
 */

export type ConsejeriaArrastrada = {
  nombre: string
  cohortes: string[]
  cantidadUnidades: number
  dedicacionPeriodo: number
}

/**
 * Continuidad automática: toma la consejería de la agenda PREVIA más reciente del
 * docente y arrastra solo las cohortes que siguen vigentes en `periodoActual`.
 * Devuelve `null` si no hay nada que arrastrar. Sirve para pre-sembrar el formulario
 * al crear una agenda nueva, sin que nadie reescriba las cohortes cada semestre.
 */
export async function getConsejeriaArrastrada(
  docenteId: string,
  periodoActual: string,
): Promise<ConsejeriaArrastrada | null> {
  const acts = await prisma.actividadDocencia.findMany({
    where: { cohortes: { isEmpty: false }, agenda: { docenteId } },
    select: { nombre: true, cohortes: true, agenda: { select: { periodo: true } } },
  })

  // Solo períodos estrictamente anteriores al actual; el más reciente manda.
  const previas = acts
    .filter((a) => semestresEntre(a.agenda.periodo, periodoActual) > 0)
    .sort((a, b) => ordinalPeriodo(b.agenda.periodo) - ordinalPeriodo(a.agenda.periodo))
  const ref = previas[0]
  if (!ref) return null

  const cohortes = (ref.cohortes ?? [])
    .filter((c) => cohorteVigente(c, periodoActual))
    .slice(0, 2)
  if (cohortes.length === 0) return null

  const cat = await prisma.catalogoActividad.findFirst({
    where: { nombre: ref.nombre, categoria: "DOCENCIA" },
    select: { topeSemestralH: true },
  })
  const tope = cat?.topeSemestralH ?? 0

  return {
    nombre: ref.nombre,
    cohortes,
    cantidadUnidades: cohortes.length,
    dedicacionPeriodo: tope * cohortes.length,
  }
}

export type CohorteConsejero = { cohorte: string; consejero: string | null }

/**
 * Mapa de cohortes vigentes (últimos 6 semestres) de un programa y su consejero en
 * el período dado. Útil para que el jefe vea qué cohortes ya tienen consejero y
 * cuáles están sin asignar, justo donde arma la agenda. Considera cualquier estado
 * de agenda del período (incluye borradores en curso).
 */
export async function getCohortesConsejeros(
  programa: string,
  periodoActual: string,
): Promise<CohorteConsejero[]> {
  const vigentes = cohortesValidas(periodoActual)
  const acts = await prisma.actividadDocencia.findMany({
    where: {
      cohortes: { isEmpty: false },
      agenda: { periodo: periodoActual, docente: { programa } },
    },
    select: {
      cohortes: true,
      agenda: { select: { docente: { select: { nombre: true } } } },
    },
  })

  const porCohorte = new Map<string, string>()
  for (const a of acts) {
    for (const c of a.cohortes ?? []) {
      if (!porCohorte.has(c)) porCohorte.set(c, a.agenda.docente.nombre)
    }
  }

  return vigentes.map((c) => ({ cohorte: c, consejero: porCohorte.get(c) ?? null }))
}
