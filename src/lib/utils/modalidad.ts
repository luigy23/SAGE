/**
 * Utilidades de presentación y copywriting para la modalidad docente.
 *
 * Fuente única de verdad para:
 *  - Etiquetas legibles (cortas y largas) del enum `Modalidad` de Prisma.
 *  - Mensajes dinámicos de "Carga del semestre" según modalidad, sede y
 *    parámetro de semanas (Acuerdo 048 Art. 4).
 *
 * Diseño:
 *  - Funciones puras (sin React, sin DB) — usables en server y cliente.
 *  - Sin estado compartido, sin side effects.
 *  - Textos parametrizados por `semanasPeriodo` para respetar la
 *    configuración del SUPERADMIN.
 */

import type { Modalidad, Sede } from "@/generated/prisma/client"
import { esCatedraConTopeRegional } from "@/lib/validations/agenda-rules"
import { SEDES_CATEDRA_EXTENDIDA } from "@/lib/utils/sede"

// ============================================================
// Diccionarios canónicos (fuente única)
// ============================================================

const LABELS_CORTOS: Record<Modalidad, string> = {
  PLANTA_TC: "Tiempo Completo Planta",
  PLANTA_MT: "Medio Tiempo Planta",
  OCASIONAL_TC: "Tiempo Completo Ocasional",
  OCASIONAL_MT: "Medio Tiempo Ocasional",
  CATEDRA: "Cátedra",
  VISITANTE_TC: "Visitante Tiempo Completo",
  VISITANTE_MT: "Visitante Medio Tiempo",
  CATEDRA_VISITANTE_TC: "Cátedra Visitante Tiempo Completo",
  CATEDRA_VISITANTE_MT: "Cátedra Visitante Medio Tiempo",
  INVITADO: "Invitado",
}

const LABELS_LARGOS: Record<Modalidad, string> = {
  PLANTA_TC: "Tiempo Completo de Planta",
  PLANTA_MT: "Medio Tiempo de Planta",
  OCASIONAL_TC: "Ocasional de Tiempo Completo",
  OCASIONAL_MT: "Ocasional de Medio Tiempo",
  CATEDRA: "Docente Catedrático",
  VISITANTE_TC: "Docente Visitante Tiempo Completo",
  VISITANTE_MT: "Docente Visitante Medio Tiempo",
  CATEDRA_VISITANTE_TC: "Docente Cátedra Visitante Tiempo Completo",
  CATEDRA_VISITANTE_MT: "Docente Cátedra Visitante Medio Tiempo",
  INVITADO: "Docente Invitado",
}


// ============================================================
// API pública — etiquetas
// ============================================================

/**
 * Etiqueta corta de la modalidad para badges, tablas e inputs disabled.
 * Ejemplo: `PLANTA_TC` → `"Tiempo Completo Planta"`.
 */
export function getModalidadLabel(modalidad: Modalidad): string {
  return LABELS_CORTOS[modalidad] ?? String(modalidad)
}

/**
 * Etiqueta larga (formal) para títulos y descripciones de alertas.
 * Ejemplo: `PLANTA_TC` → `"Tiempo Completo de Planta"`.
 */
export function getModalidadLabelLargo(modalidad: Modalidad): string {
  return LABELS_LARGOS[modalidad] ?? String(modalidad)
}

// ============================================================
// API pública — matriz de copy dinámica para alertas
// ============================================================

export type TonoCarga = "estricto" | "permisivo" | "flexible"

export type CargaSemestralCopy = {
  /** Headline corto: ej. "Carga del semestre — 880 horas". */
  titulo: string
  /** Subtítulo con la aritmética: ej. "40 h/semana × 22 semanas (Art. 4a)". */
  resumen: string
  /** Párrafo dinámico que diferencia obligación de tope. */
  descripcion: string
  /** Categoría de tono para que la UI elija colores/iconos. */
  tono: TonoCarga
  /** Referencia al artículo del Acuerdo 048. */
  articulo: string
  /** Tope semestral calculado (horas). Útil para sumas y comparativas. */
  horasTotales: number
  /** Tope semanal contractual (horas). */
  horasSemanales: number
  /** Para CATEDRA: indica si la sede es regional (19h) o central (16h). */
  esCatedraRegional: boolean
}

/**
 * Genera el copy completo para la alerta "Carga del semestre" en función
 * de la modalidad, sede y semanas del período (parametrizable).
 *
 * Diferencia explícitamente:
 *  - Obligación contractual (Planta / Ocasional): "deben laborar X horas".
 *  - Tope máximo permisivo (Cátedra): "podrán laborar hasta X horas".
 *  - Flexibilidad por contrato (Visitante / Invitado): "según vinculación".
 */
export function getCargaSemestralCopy(
  modalidad: Modalidad,
  sede: Sede | null,
  semanasPeriodo: number,
  /**
   * Cursos del docente para evaluar la regla mixta del Art. 4d (catedrático).
   * Si se pasan, el tope refleja `sedeBase` OR (>50% horas en sedes regionales).
   * Si se omite, solo `sede` (sedeBase) decide — back-compat con callers viejos.
   */
  cursos?: Array<{ sede?: string | null; horasPresenciales: number; semanas: number }>,
  /** INVITADO (Art. 4f): horas contratadas autorizadas por el Consejo Académico = base del 100%. */
  invHorasContratadas?: number | null,
): CargaSemestralCopy {
  const labelLargo = getModalidadLabelLargo(modalidad)

  switch (modalidad) {
    // ───── PLANTA TC / OCASIONAL TC — obligación contractual ─────
    case "PLANTA_TC":
    case "OCASIONAL_TC": {
      const horasSemanales = 40
      const horasTotales = horasSemanales * semanasPeriodo
      const articulo = modalidad === "PLANTA_TC" ? "Art. 4a" : "Art. 4c"
      return {
        titulo: `Carga máxima del semestre — ${horasTotales} horas`,
        resumen: `${horasSemanales} h/semana × ${semanasPeriodo} semanas (${articulo})`,
        descripcion:
          `Su vinculación de ${labelLargo} establece una dedicación contractual de ${horasTotales} horas durante el período académico. ` +
          `SAGE validará que la suma de sus actividades no supere esta cifra y que cumpla con el mínimo de docencia exigido por el Art. 3.`,
        tono: "estricto",
        articulo,
        horasTotales,
        horasSemanales,
        esCatedraRegional: false,
      }
    }

    // ───── PLANTA MT / OCASIONAL MT — obligación contractual ─────
    case "PLANTA_MT":
    case "OCASIONAL_MT": {
      const horasSemanales = 20
      const horasTotales = horasSemanales * semanasPeriodo
      const articulo = modalidad === "PLANTA_MT" ? "Art. 4b" : "Art. 4c"
      return {
        titulo: `Carga máxima del semestre — ${horasTotales} horas`,
        resumen: `${horasSemanales} h/semana × ${semanasPeriodo} semanas (${articulo})`,
        descripcion:
          `Su vinculación de ${labelLargo} establece una dedicación contractual de ${horasTotales} horas durante el período académico. ` +
          `SAGE validará que la suma de sus actividades no supere esta cifra y que cumpla con el mínimo de docencia exigido por el Art. 3.`,
        tono: "estricto",
        articulo,
        horasTotales,
        horasSemanales,
        esCatedraRegional: false,
      }
    }

    // ───── CÁTEDRA — tope máximo permisivo, distingue sede ─────
    case "CATEDRA": {
      // Regla mixta del Art. 4d: 19h si sedeBase es regional, O si >50%
      // de las horas presenciales se dictan en sedes regionales.
      const esRegional = esCatedraConTopeRegional(sede, cursos)
      const sedeBaseRegional = sede !== null && SEDES_CATEDRA_EXTENDIDA.includes(sede)
      const elevadoPorCursos = esRegional && !sedeBaseRegional
      const horasSemanales = esRegional ? 19 : 16
      const horasTotales = horasSemanales * semanasPeriodo
      const articulo = esRegional ? "Art. 4d — sede regional" : "Art. 4d"
      const contextoSede = elevadoPorCursos
        ? "Como catedrático que dicta más del 50% de sus cursos en sedes regionales"
        : esRegional
          ? "Como docente catedrático en sede regional"
          : "Como docente catedrático en sede principal"
      const descripcionExtra = esRegional
        ? "(la norma autoriza 3 horas adicionales por semana frente a la sede principal). "
        : ""
      return {
        titulo: `Cupo máximo del semestre — ${horasTotales} horas`,
        resumen: `Hasta ${horasSemanales} h/semana × ${semanasPeriodo} semanas (${articulo})`,
        descripcion:
          `${contextoSede}, su agenda puede contener hasta ${horasTotales} horas semestrales ${descripcionExtra}` +
          `Este es un tope máximo, no una obligación: su carga depende de los cursos asignados por el jefe de programa. ` +
          `SAGE solo bloqueará el envío si lo excede.`,
        tono: "permisivo",
        articulo,
        horasTotales,
        horasSemanales,
        esCatedraRegional: esRegional,
      }
    }

    // ───── VISITANTE TC / MT y CÁTEDRA VISITANTE TC / MT — flexible por contrato ─────
    case "VISITANTE_TC":
    case "VISITANTE_MT":
    case "CATEDRA_VISITANTE_TC":
    case "CATEDRA_VISITANTE_MT": {
      const horasSemanales =
        modalidad === "VISITANTE_TC" || modalidad === "CATEDRA_VISITANTE_TC" ? 40 : 20
      const horasTotales = horasSemanales * semanasPeriodo
      return {
        titulo: "Carga de referencia — según su contrato",
        resumen: `${horasTotales} horas como referencia institucional (Art. 4e)`,
        descripcion:
          `Como docente visitante, su dedicación se ajusta a los términos pactados en su contrato. ` +
          `SAGE muestra ${horasTotales} horas como referencia y permite el envío incluso si la suma de sus actividades es diferente. ` +
          `El jefe de programa validará el detalle durante el monitoreo. Recuerde mantener al menos el 60 % en docencia (Art. 3 Par. 3).`,
        tono: "flexible",
        articulo: "Art. 4e",
        horasTotales,
        horasSemanales,
        esCatedraRegional: false,
      }
    }

    // ───── INVITADO — flexible con aprobación CA ─────
    case "INVITADO": {
      // El 100% es lo CONTRATADO (horas autorizadas por el Consejo Académico),
      // no 40h×semanas. Si no se capturó, cae a la referencia derivada.
      const tieneContratadas = invHorasContratadas != null && invHorasContratadas > 0
      const horasSemanales = 40
      const horasTotales = tieneContratadas ? invHorasContratadas! : horasSemanales * semanasPeriodo
      return {
        titulo: "Carga aprobada por Consejo Académico",
        resumen: tieneContratadas
          ? `${horasTotales} horas contratadas (hasta 100 %, Art. 4f)`
          : `Hasta 100 % según resolución de vinculación (Art. 4f)`,
        descripcion:
          `Como docente invitado, su dedicación se aprueba por el Consejo Académico según los términos de su vinculación. ` +
          (tieneContratadas
            ? `Su vinculación autoriza ${horasTotales} horas para la labor experta contratada; SAGE usa esa cifra como tope de referencia. `
            : `SAGE aún no tiene registradas sus horas contratadas; mostrará una referencia institucional y permitirá el envío con cualquier carga. `) +
          `La aprobación final corresponde al Consejo Académico (SuperAdmin).`,
        tono: "flexible",
        articulo: "Art. 4f",
        horasTotales,
        horasSemanales,
        esCatedraRegional: false,
      }
    }
  }
}
