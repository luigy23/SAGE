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

// ============================================================
// Diccionarios canónicos (fuente única)
// ============================================================

const LABELS_CORTOS: Record<Modalidad, string> = {
  PLANTA_TC: "Tiempo Completo Planta",
  PLANTA_MT: "Medio Tiempo Planta",
  OCASIONAL_TC: "Tiempo Completo Ocasional",
  OCASIONAL_MT: "Medio Tiempo Ocasional",
  CATEDRA: "Cátedra",
  VISITANTE: "Visitante",
  INVITADO: "Invitado",
}

const LABELS_LARGOS: Record<Modalidad, string> = {
  PLANTA_TC: "Tiempo Completo de Planta",
  PLANTA_MT: "Medio Tiempo de Planta",
  OCASIONAL_TC: "Ocasional de Tiempo Completo",
  OCASIONAL_MT: "Ocasional de Medio Tiempo",
  CATEDRA: "Docente Catedrático",
  VISITANTE: "Docente Visitante",
  INVITADO: "Docente Invitado",
}

/** Sedes regionales que autorizan 19 h/sem para cátedra (Art. 4d). */
const SEDES_REGIONALES_CATEDRA: Sede[] = ["PITALITO", "GARZON", "LA_PLATA"]

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
      const esRegional = sede !== null && SEDES_REGIONALES_CATEDRA.includes(sede)
      const horasSemanales = esRegional ? 19 : 16
      const horasTotales = horasSemanales * semanasPeriodo
      const articulo = esRegional ? "Art. 4d — sede regional" : "Art. 4d"
      const contextoSede = esRegional
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

    // ───── VISITANTE — flexible por contrato ─────
    case "VISITANTE": {
      const horasSemanales = 40
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
      const horasSemanales = 40
      const horasTotales = horasSemanales * semanasPeriodo
      return {
        titulo: "Carga aprobada por Consejo Académico",
        resumen: `Hasta 100 % según resolución de vinculación (Art. 4f)`,
        descripcion:
          `Como docente invitado, su dedicación se aprueba por el Consejo Académico según los términos de su vinculación. ` +
          `SAGE muestra ${horasTotales} horas como referencia institucional y permite el envío con cualquier carga registrada. ` +
          `El jefe de programa validará el detalle durante el monitoreo.`,
        tono: "flexible",
        articulo: "Art. 4f",
        horasTotales,
        horasSemanales,
        esCatedraRegional: false,
      }
    }
  }
}
