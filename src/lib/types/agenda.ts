import type {
  AgendaSemestral,
  CursoAgenda,
  ActividadDocencia,
  ActividadInvestigacion,
  ActividadProyeccionSocial,
  ActividadGestion,
  Docente,
} from "@/generated/prisma/client"

export type AgendaConRelaciones = AgendaSemestral & {
  docente: Docente
  cursos: CursoAgenda[]
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
