"use server"

import { resolveFormulaCurso } from "@/lib/rules/resolver"

export type FormulasCursos = Record<
  "TEORICO" | "TEORICO_PRACTICO" | "PRACTICO",
  { factorHoras: number; constanteSuma: number }
>

export async function resolveFormulasCursosAction(
  periodoId: string | null,
  facultad: string | null
): Promise<FormulasCursos> {
  const [teorico, teoricoPractico, practico] = await Promise.all([
    resolveFormulaCurso("TEORICO", facultad, periodoId),
    resolveFormulaCurso("TEORICO_PRACTICO", facultad, periodoId),
    resolveFormulaCurso("PRACTICO", facultad, periodoId),
  ])
  return {
    TEORICO: { factorHoras: teorico.factorHoras, constanteSuma: teorico.constanteSuma },
    TEORICO_PRACTICO: { factorHoras: teoricoPractico.factorHoras, constanteSuma: teoricoPractico.constanteSuma },
    PRACTICO: { factorHoras: practico.factorHoras, constanteSuma: practico.constanteSuma },
  }
}
