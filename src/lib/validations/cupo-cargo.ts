import { prisma } from "@/lib/prisma"
import { getAmbitoDeCargo } from "@/lib/utils/cargo"
import { TIPOS_CARGO } from "@/lib/schemas/profile-schema"

/**
 * Unicidad de cupo de cargos directivos (Acuerdo 048 Art. 11).
 *
 * Solo puede haber UN titular de un cargo+ámbito por período (1 Decano por
 * Facultad, 1 Jefe de Programa por Programa, etc.). El cupo se considera
 * "ocupado" únicamente cuando el titular tiene una agenda en estado APROBADO
 * (confirmada por el admin). Agendas en BORRADOR / ENVIADO / RECHAZADO NO
 * cuentan ni bloquean.
 */

function etiquetaCargo(tipoCargo: string): string {
  return TIPOS_CARGO.find((c) => c.value === tipoCargo)?.label ?? tipoCargo
}

/**
 * Cuenta titulares con agenda APROBADA del mismo cargo+ámbito en el período,
 * excluyendo a un docente.
 */
export async function contarTitularesCargoAprobados(params: {
  periodo: string
  tipoCargo: string
  cargoAmbitoValor: string
  excluirDocenteId: string
}): Promise<number> {
  return prisma.docente.count({
    where: {
      id: { not: params.excluirDocenteId },
      tipoCargo: params.tipoCargo,
      cargoAmbitoValor: params.cargoAmbitoValor,
      agendasSemestrales: {
        some: { periodo: params.periodo, estado: "APROBADO" },
      },
    },
  })
}

/**
 * Devuelve un mensaje de error si el cupo del cargo ya está ocupado por otro
 * docente (agenda APROBADA), o `null` si está libre o el cargo no maneja cupo.
 */
export async function verificarCupoCargo(params: {
  periodo: string
  tipoCargo: string | null | undefined
  cargoAmbitoValor: string | null | undefined
  excluirDocenteId: string
}): Promise<string | null> {
  const cfg = getAmbitoDeCargo(params.tipoCargo)
  if (
    !cfg ||
    !cfg.enforcarCupo ||
    !params.tipoCargo ||
    !params.cargoAmbitoValor
  ) {
    return null
  }

  const count = await contarTitularesCargoAprobados({
    periodo: params.periodo,
    tipoCargo: params.tipoCargo,
    cargoAmbitoValor: params.cargoAmbitoValor,
    excluirDocenteId: params.excluirDocenteId,
  })

  if (count > 0) {
    return `El cargo de "${etiquetaCargo(params.tipoCargo)}" para "${params.cargoAmbitoValor}" ya está ocupado por otro docente con agenda aprobada en este período. Solo puede haber un titular por período (Art. 11, Acuerdo 048).`
  }
  return null
}
