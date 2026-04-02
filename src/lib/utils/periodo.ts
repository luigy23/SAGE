export function getPeriodoActivo(): string {
  const hoy = new Date();
  const año = hoy.getFullYear();
  const mes = hoy.getMonth() + 1; // getMonth() devuelve de 0 a 11
  const semestre = mes <= 6 ? 1 : 2;
  return `${año}-${semestre}`;
}

/**
 * Retorna el máximo de horas y si la restricción es estricta (bloquea envío)
 * según la modalidad del docente (Acuerdo 048).
 *
 * - TCP/TCO: 40h, estricto
 * - MTP/MTC: 20h, estricto
 * - CATEDRA: 40h, NO estricto (solo advertencia visual)
 */
export function getMaxHoras(modalidad: string): {
  maxHoras: number
  esEstricto: boolean
} {
  if (modalidad === "TCP" || modalidad === "TCO") {
    return { maxHoras: 40, esEstricto: true }
  }
  if (modalidad === "MTP" || modalidad === "MTC") {
    return { maxHoras: 20, esEstricto: true }
  }
  if (modalidad === "CATEDRA") {
    return { maxHoras: 40, esEstricto: false }
  }
  return { maxHoras: 40, esEstricto: true } // Valor por defecto de seguridad
}