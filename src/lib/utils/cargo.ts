import { CARGO_AMBITO, type AmbitoConfig } from "@/lib/constants"

/**
 * Utilidades de clasificación de cargos administrativos.
 *
 * El campo `Docente.tipoCargo` es texto libre (ingresado por el docente en su
 * perfil), por lo que necesitamos un matching tolerante a tildes, mayúsculas
 * y variaciones ortográficas comunes ("Jefatura" vs "Jefe", femenino/masculino).
 *
 * Acuerdo 048 Art. 10: las actividades de gestión académico-administrativa
 * no podrán exceder el 20% del tiempo laboral, EXCEPTO para los siguientes
 * cargos que se rigen por los tiempos del Art. 11:
 *   1. Jefes de Programa        — hasta 660 h
 *   2. Jefes de Departamento    — hasta 330 h
 *   3. Asesores de Vicerrectoría — hasta 440 h
 *   4. Asesores de Rectoría     — supeditado a resolución
 *   5. Decanos                  — 880 h (Art. 11; añadido por decisión institucional
 *                                  para alinear con la realidad operativa, ya que un
 *                                  Decano con 20% de tope no puede cumplir Art. 11)
 *
 * Si `tipoCargo` es null/vacío, la función retorna `false` por seguridad:
 * sin información explícita, se aplica el tope del 20% por defecto.
 */

/**
 * Patrón Jefe / Jefa / Jefatura de Programa. Extraído como constante para
 * reutilizarse tanto en `PATRONES_CARGOS_EXENTOS` (Art. 10 exención del 20%)
 * como en `esJefeDePrograma()` (Art. 3 Par. 1: orientar mínimo un curso).
 * Cubre: "jefe de programa", "jefatura de programa", "jefe del programa",
 * "jefe programa", "Jefatura del Programa de Ingeniería de Software", etc.
 */
const PATRON_JEFE_PROGRAMA = /\bjef(e|a|atura)\s+(de(l)?\s+)?programa\b/

/**
 * Patrones regex (sobre texto normalizado: minúsculas + sin tildes) que
 * identifican cada cargo exento. Cubren variantes comunes:
 *   - "jefe de programa", "jefatura de programa", "jefe del programa", "jefe programa"
 *   - femenino: "jefa", "asesora", "decana", "decanatura"
 *   - sin preposición: "jefe programa", "asesor rectoria"
 */
const PATRONES_CARGOS_EXENTOS: RegExp[] = [
  PATRON_JEFE_PROGRAMA,
  // Jefe / Jefa / Jefatura de Departamento
  /\bjef(e|a|atura)\s+(de(l)?\s+)?departamento\b/,
  // Asesor / Asesora / Asesoria de Vicerrectoría / Vicerrector / Vicerrectorado
  /\basesor(a|ia)?\s+(de(l)?\s+)?vicerrector\w*\b/,
  // Asesor / Asesora / Asesoria de Rectoría / Rector
  /\basesor(a|ia)?\s+(de(l)?\s+)?rector\w*\b/,
  // Decano / Decana / Decanatura
  /\bdecan(o|a|atura)\b/,
]

/**
 * Quita tildes/diacríticos y pasa a minúsculas para hacer comparación
 * insensible a ortografía. Ej: "Asesoría de Vicerrectoría" → "asesoria de vicerrectoria".
 *
 * Usa el rango Unicode U+0300–U+036F (Combining Diacritical Marks) que cubre
 * todos los acentos latinos comunes después de aplicar la descomposición NFD.
 */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/_/g, " ")
    .toLowerCase()
    .trim()
}

/**
 * Determina si un cargo está exento del tope del 20% de gestión (Art. 10).
 *
 * @param tipoCargo Texto libre del campo `Docente.tipoCargo`. Puede ser null,
 *                  undefined o cadena vacía si el docente no tiene cargo registrado.
 * @returns `true` solo si el cargo coincide con uno de los 5 exentos del Art. 10/11.
 */
export function esCargoExentoGestion20(
  tipoCargo: string | null | undefined
): boolean {
  if (!tipoCargo || tipoCargo.trim() === "") return false
  const normalizado = normalizar(tipoCargo)
  return PATRONES_CARGOS_EXENTOS.some((patron) => patron.test(normalizado))
}

/**
 * Determina si el cargo del docente corresponde a "Jefe de Programa"
 * (Acuerdo 048 Art. 3 Par. 1: "Los Jefes de Programa orientarán mínimo
 * un curso en programas de pregrado").
 *
 * Usa el mismo `normalizar()` que el resto del módulo para tolerar tildes,
 * mayúsculas y variantes ortográficas. Si `tipoCargo` es null/vacío
 * retorna `false` (sin información, no se aplica la obligación).
 */
export function esJefeDePrograma(
  tipoCargo: string | null | undefined
): boolean {
  if (!tipoCargo || tipoCargo.trim() === "") return false
  return PATRON_JEFE_PROGRAMA.test(normalizar(tipoCargo))
}

/**
 * Devuelve la configuración de ámbito de un cargo (Decano→Facultad, etc.) o
 * `null` si el cargo no maneja ámbito. Se basa en el código exacto del cargo
 * (TIPOS_CARGO), no en regex, porque ahora la selección es estructurada.
 */
export function getAmbitoDeCargo(
  tipoCargo: string | null | undefined
): AmbitoConfig | null {
  if (!tipoCargo) return null
  return CARGO_AMBITO[tipoCargo] ?? null
}

/** True si el cargo exige elegir un ámbito explícito ("¿De cuál?"). */
export function cargoRequiereAmbito(tipoCargo: string | null | undefined): boolean {
  return getAmbitoDeCargo(tipoCargo) !== null
}
