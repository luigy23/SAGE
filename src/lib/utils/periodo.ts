export function getPeriodoActivo(): string {
  const hoy = new Date();
  const año = hoy.getFullYear();
  const mes = hoy.getMonth() + 1;
  const semestre = mes <= 6 ? 1 : 2;
  return `${año}-${semestre}`;
}

/**
 * Sedes regionales que permiten 19h/sem para catedráticos
 * Art. 4d: "...vinculados para orientar cursos en las sedes de Pitalito, Garzón y La Plata,
 * quienes podrán laborar hasta 19 horas semanales."
 */
const SEDES_REGIONALES_19H = ["PITALITO", "GARZON", "LA_PLATA"]

/**
 * getMaxHoras — Single Source of Truth para límites legales del Acuerdo 048.
 *
 * @param modalidad  — Modalidad del docente (enum Prisma: PLANTA_TC, PLANTA_MT, etc.)
 * @param sedeBase   — Sede contractual del docente (enum Prisma: NEIVA, PITALITO, etc.)
 *                     Solo relevante para CATEDRA (Art. 4d).
 *
 * Retorna:
 * - maxHoras:   Límite máximo de horas SEMANALES.
 * - esEstricto: `true` = bloqueo duro en envío. ALL modalities are strict per Acuerdo 048.
 */
export function getMaxHoras(
  modalidad: string,
  sedeBase?: string | null
): {
  maxHoras: number
  esEstricto: boolean
} {
  // Art. 4a/4c — Tiempo Completo → 40 h/sem (estricto)
  if (modalidad === "PLANTA_TC" || modalidad === "OCASIONAL_TC") {
    return { maxHoras: 40, esEstricto: true }
  }

  // Art. 4b/4c — Medio Tiempo → 20 h/sem (estricto)
  if (modalidad === "PLANTA_MT" || modalidad === "OCASIONAL_MT") {
    return { maxHoras: 20, esEstricto: true }
  }

  // Art. 4d — Cátedra → 16 h/sem (central) ó 19 h/sem (sedes regionales)
  // STRICT: Art. 4d dice "podrán laborar hasta..." = techo legal obligatorio.
  if (modalidad === "CATEDRA") {
    const sedeNorm = (sedeBase || "").toUpperCase().trim()
    const esSedeRegional = SEDES_REGIONALES_19H.some(
      (s) => sedeNorm === s || sedeNorm.includes(s.replace("_", " "))
    )
    return { maxHoras: esSedeRegional ? 19 : 16, esEstricto: true }
  }

  // Fallback conservador (VISITANTE, INVITADO, etc.)
  return { maxHoras: 40, esEstricto: true }
}