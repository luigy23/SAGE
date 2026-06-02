/**
 * Resolutor de Autoridad Académica (Acuerdo 048/2018).
 *
 * SAGE separa DOS ejes ortogonales de permisos:
 *   1. Rol de sistema (acceso a plataforma): SUPERADMIN | ADMIN | DOCENTE — ver `rbac.ts`.
 *   2. Autoridad académica (potestad sobre agendas/monitoreos de OTROS docentes),
 *      DERIVADA DEL CARGO y acotada por un ámbito:
 *        - Jefe de Programa → ámbito PROGRAMA  (Art. 3, 4 Par.1, 6: programa/propone agendas)
 *        - Decano          → ámbito FACULTAD  (Art. 6: aprobadas por el Consejo de Facultad)
 *        - SUPERADMIN       → ámbito GLOBAL    (backstop / dueño de plataforma)
 *
 * La autoridad por cargo NO es un rol de sistema: es un DOCENTE con `cargoAdministrativo`,
 * `tipoCargo` (validado vía solicitud de perfil aprobada por un ADMIN) y `cargoAmbitoValor`.
 *
 * Reglas de seguridad (fail-closed):
 *   - Solo cuentas ACTIVO con `cargoAmbitoValor` definido obtienen autoridad por cargo.
 *   - Separación de Deberes (SoD): nadie aprueba su PROPIO formulario; sube al siguiente
 *     ámbito (Jefe→Decano→SUPERADMIN). El SUPERADMIN es terminal y queda exento del SoD
 *     para no dejar formularios atascados sin aprobador posible.
 */
import { esJefeDePrograma, esDecano } from "@/lib/utils/cargo"
import type { Rol, Modalidad } from "@/generated/prisma/client"

export type TipoAutoridad = "JEFE" | "DECANO" | "SUPERADMIN"

export type AmbitoAutoridad = "PROGRAMA" | "FACULTAD" | "GLOBAL"

export type AutoridadAcademica = {
  /** `null` = sin autoridad delegada (docente común o ADMIN operativo). */
  tipo: TipoAutoridad | null
  ambito: AmbitoAutoridad | null
  /** Programa o facultad que gobierna. `null` para GLOBAL o sin autoridad. */
  ambitoValor: string | null
}

/** Campos mínimos del actor necesarios para resolver su autoridad. */
export type DocenteAutoridadInput = {
  id: string
  rol: Rol
  estadoCuenta: string
  cargoAdministrativo: boolean
  tipoCargo: string | null
  cargoAmbitoValor: string | null
}

/** Campos mínimos del dueño de un formulario (agenda/monitoreo). */
export type FormularioOwner = {
  id: string
  programa: string
  facultad: string
}

export type AutoridadFailure = { error: string }

const MODALIDADES_PLANTA: Modalidad[] = ["PLANTA_TC", "PLANTA_MT"]

/**
 * Docentes que el Jefe DEBE crearles la agenda (Art. 4 Par.1 y Art. 6): catedráticos,
 * ocasionales, visitantes e invitados. Los de planta presentan su propia propuesta.
 */
export function esModalidadNoPlanta(modalidad: Modalidad): boolean {
  return !MODALIDADES_PLANTA.includes(modalidad)
}

/**
 * Resuelve la autoridad académica de un actor a partir de su rol y cargo.
 * Fail-closed: ante cualquier dato faltante o cuenta inactiva, retorna `tipo: null`.
 */
export function getAutoridadAcademica(
  actor: DocenteAutoridadInput,
): AutoridadAcademica {
  // SUPERADMIN: autoridad global, independiente del cargo.
  if (actor.rol === "SUPERADMIN") {
    return { tipo: "SUPERADMIN", ambito: "GLOBAL", ambitoValor: null }
  }

  // Autoridad por cargo: requiere cuenta ACTIVA y cargo administrativo declarado.
  if (actor.estadoCuenta !== "ACTIVO" || !actor.cargoAdministrativo) {
    return { tipo: null, ambito: null, ambitoValor: null }
  }

  const ambitoValor = actor.cargoAmbitoValor?.trim() || null
  if (!ambitoValor) {
    return { tipo: null, ambito: null, ambitoValor: null }
  }

  // El Decano tiene precedencia (ámbito mayor) si el texto coincidiera con ambos.
  if (esDecano(actor.tipoCargo)) {
    return { tipo: "DECANO", ambito: "FACULTAD", ambitoValor }
  }
  if (esJefeDePrograma(actor.tipoCargo)) {
    return { tipo: "JEFE", ambito: "PROGRAMA", ambitoValor }
  }

  return { tipo: null, ambito: null, ambitoValor: null }
}

/** `true` si el actor tiene cualquier autoridad delegada (Jefe, Decano o SUPERADMIN). */
export function tieneAutoridadDelegada(actor: DocenteAutoridadInput): boolean {
  return getAutoridadAcademica(actor).tipo !== null
}

/** Etiqueta de la sección de gestión en el menú, según el ámbito de autoridad. */
export function getEtiquetaGestion(autoridad: AutoridadAcademica): string {
  switch (autoridad.tipo) {
    case "SUPERADMIN":
      return "Supervisión Global"
    case "DECANO":
      return "Mi Facultad"
    case "JEFE":
      return "Mi Programa"
    default:
      return ""
  }
}

/**
 * ¿El actor tiene autoridad sobre el formulario de `owner`? Aplica SOLO el scope
 * de ámbito (no el SoD). SUPERADMIN gobierna todo; Decano su facultad; Jefe su programa.
 */
export function puedeGestionarFormulario(
  autoridad: AutoridadAcademica,
  owner: FormularioOwner,
): boolean {
  switch (autoridad.tipo) {
    case "SUPERADMIN":
      return true
    case "DECANO":
      return owner.facultad === autoridad.ambitoValor
    case "JEFE":
      return owner.programa === autoridad.ambitoValor
    default:
      return false
  }
}

/**
 * Candado para APROBAR/RECHAZAR/REHABILITAR un formulario: combina scope de ámbito
 * con Separación de Deberes. Retorna `null` si la operación es segura, o `{ error }`.
 */
export function assertPuedeAprobar(
  actor: DocenteAutoridadInput,
  owner: FormularioOwner,
): AutoridadFailure | null {
  const autoridad = getAutoridadAcademica(actor)
  if (autoridad.tipo === null) {
    return { error: "No tienes autoridad académica para revisar este formulario." }
  }
  // SoD: nadie aprueba su propio formulario (excepto el SUPERADMIN, autoridad terminal).
  if (owner.id === actor.id && autoridad.tipo !== "SUPERADMIN") {
    return {
      error:
        "No puedes aprobar tu propio formulario. Debe aprobarlo la autoridad del siguiente ámbito (tu Decano o el SuperAdmin).",
    }
  }
  if (!puedeGestionarFormulario(autoridad, owner)) {
    return {
      error:
        "Este formulario pertenece a un docente fuera de tu ámbito. Solo puedes gestionar el de tu " +
        (autoridad.ambito === "FACULTAD" ? "facultad." : "programa."),
    }
  }
  return null
}

/**
 * Candado para CREAR/EDITAR de forma delegada la agenda de OTRO docente (No-Planta).
 * Exige scope sobre el docente objetivo. La validación de modalidad No-Planta se hace
 * en la server action que conoce la modalidad del target.
 */
export function assertPuedeGestionarDe(
  actor: DocenteAutoridadInput,
  owner: FormularioOwner,
): AutoridadFailure | null {
  const autoridad = getAutoridadAcademica(actor)
  if (autoridad.tipo === null) {
    return { error: "No tienes autoridad académica para gestionar formularios de otros docentes." }
  }
  if (!puedeGestionarFormulario(autoridad, owner)) {
    return {
      error:
        "Ese docente está fuera de tu ámbito. Solo puedes gestionar los de tu " +
        (autoridad.ambito === "FACULTAD" ? "facultad." : "programa."),
    }
  }
  return null
}
