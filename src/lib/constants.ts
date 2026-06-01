// Sedes de la Universidad Surcolombiana
// `value` debe coincidir con el enum Prisma `Sede` en schema.prisma
// `label` es la etiqueta visual mostrada al usuario
export const SEDES = [
  { value: "NEIVA", label: "Neiva" },
  { value: "GARZON", label: "Garzón" },
  { value: "PITALITO", label: "Pitalito" },
  { value: "LA_PLATA", label: "La Plata" },
] as const

export type SedeValue = (typeof SEDES)[number]["value"]

// =============================================
// CATÁLOGO ACADÉMICO — Facultades y Programas
// Fuente de verdad única (antes duplicada en auth.ts, register-form.tsx y
// re-aplicar-form.tsx). Los valores deben coincidir con `Docente.facultad` y
// `Docente.programa` (texto). Por ahora el foco operativo es Ingeniería.
// =============================================
export const FACULTAD_PROGRAMAS: Record<string, string[]> = {
  "Ingeniería": [
    "Ingeniería Agrícola",
    "Ingeniería Agroindustrial",
    "Ingeniería Civil",
    "Ingeniería de Petróleos",
    "Ingeniería de Software",
    "Ingeniería Electrónica",
  ],
}

/** Lista plana de facultades (claves del mapa). */
export const FACULTADES: string[] = Object.keys(FACULTAD_PROGRAMAS)

/** Lista plana de todos los programas (permite roles cruzados entre facultades). */
export const PROGRAMAS: string[] = Object.values(FACULTAD_PROGRAMAS).flat()

// =============================================
// ÁMBITO DE LOS CARGOS DIRECTIVOS (Acuerdo 048 Art. 11)
// Cada cargo tiene un "ámbito" distinto (Decano→Facultad, Jefe de Programa→
// Programa, etc.). El docente debe elegir explícitamente CUÁL (no se asume).
// `enforcarCupo` marca los cargos en los que el sistema bloquea duplicidad por
// período (solo los exentos con lista oficial disponible: Decano y Jefe de
// Programa). Los demás se capturan pero su cupo no se valida aún (follow-up).
// =============================================
export type AmbitoTipo =
  | "FACULTAD"
  | "PROGRAMA"
  | "SEDE"
  | "DEPARTAMENTO"
  | "DEPENDENCIA"

export type AmbitoConfig = {
  tipo: AmbitoTipo
  /** Qué lista controlada alimenta el dropdown "¿De cuál?". */
  lista: "FACULTADES" | "PROGRAMAS"
  /** Si true, se valida unicidad de cupo por período. */
  enforcarCupo: boolean
}

/** Mapa código de cargo (TIPOS_CARGO) → configuración de ámbito. `null` = sin ámbito. */
export const CARGO_AMBITO: Record<string, AmbitoConfig | null> = {
  DECANO: { tipo: "FACULTAD", lista: "FACULTADES", enforcarCupo: true },
  JEFE_PROGRAMA: { tipo: "PROGRAMA", lista: "PROGRAMAS", enforcarCupo: true },
  COORD_INVESTIGACION: { tipo: "FACULTAD", lista: "FACULTADES", enforcarCupo: false },
  COORD_EMPRENDIMIENTO: { tipo: "FACULTAD", lista: "FACULTADES", enforcarCupo: false },
  COORD_AUTOEVALUACION: { tipo: "FACULTAD", lista: "FACULTADES", enforcarCupo: false },
  COORD_AREA: { tipo: "FACULTAD", lista: "FACULTADES", enforcarCupo: false },
  // Sin lista oficial todavía → se capturan sin dropdown ni enforcement (follow-up).
  JEFE_DEPARTAMENTO: null,
  ASESOR_VICERRECTORIA: null,
  ASESOR_RECTORIA: null,
  OTRO_COMITE: null,
}

/** Opciones del dropdown "¿De cuál?" para un código de cargo dado. */
export function opcionesAmbito(tipoCargo: string | null | undefined): string[] {
  if (!tipoCargo) return []
  const cfg = CARGO_AMBITO[tipoCargo]
  if (!cfg) return []
  return cfg.lista === "FACULTADES" ? FACULTADES : PROGRAMAS
}
