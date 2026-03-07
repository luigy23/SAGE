import type {
  AgendaSemestral,
  CursoAgenda,
  HorarioCurso,
  ActividadDocencia,
  ActividadInvestigacion,
  ActividadProyeccionSocial,
  ActividadGestion,
  Docente,
} from "@/generated/prisma/client"

export type AgendaConRelaciones = AgendaSemestral & {
  docente: Docente
  cursos: (CursoAgenda & { horarios: HorarioCurso[] })[]
  otrasActividadesDocencia: ActividadDocencia[]
  actividadesInvestigacion: ActividadInvestigacion[]
  actividadesProyeccionSocial: ActividadProyeccionSocial[]
  actividadesGestion: ActividadGestion[]
}

export type TipoActividad =
  | "docencia"
  | "investigacion"
  | "proyeccion"
  | "gestion"

export const WIZARD_STEPS = [
  { number: 1, label: "Datos Generales" },
  { number: 2, label: "Cursos" },
  { number: 3, label: "Horarios" },
  { number: 4, label: "Otras Act. Docencia" },
  { number: 5, label: "Investigacion" },
  { number: 6, label: "Proyeccion Social" },
  { number: 7, label: "Gestion" },
  { number: 8, label: "Resumen" },
] as const
