/**
 * Fixture del test E2E "agenda-proyecto-inyectado".
 *
 * Verifica la precarga forzosa (Art. 11): un proyecto APROBADO+activo donde el
 * docente participa aparece SOLO y BLOQUEADO en la agenda (Investigación), con
 * su rol (actividad del catálogo) y las horas que asignó el revisor.
 */

export const PERIODO_PROY = "2025-2"

export const PROYECTO_INYECTADO = {
  titulo: "Proyecto QA Inyectado en Agenda",
  tipo: "INVESTIGACION" as const,
  rol: "INVESTIGADOR_PRINCIPAL" as const,
  /** Nombre de la actividad del catálogo equivalente al rol (lo que muestra la tarjeta). */
  actividadNombre: "Investigador Principal",
  horasAsignadas: 200,
}

export const PROF_PROY = {
  email: "qa.proy.inyectado@usco.edu.co",
  password: "Test1234!",
  nombre: "QA DOCENTE PROYECTO",
  cedula: "90000060",
  modalidad: "PLANTA_TC" as const,
  sedeBase: "NEIVA" as const,
  facultad: "Facultad Proyecto QA",
  programa: "Programa Proyecto QA",
}
