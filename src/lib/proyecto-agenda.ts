import { EMPTY_ACTIVIDAD, type ActividadFormData } from "@/lib/schemas/agenda-schema"
import { ROL_A_ACTIVIDAD_CATALOGO } from "@/lib/schemas/proyecto-schema"
import type { ProyectoAprobadoOpcion } from "@/lib/actions/proyecto-actions"

/**
 * Inyección forzosa de PROYECTOS aprobados+activos en la agenda (Art. 11).
 *
 * Cada proyecto aprobado donde el docente participa se precarga como una actividad
 * BLOQUEADA en Investigación o Proyección Social (según su tipo), con la actividad
 * del catálogo correspondiente al rol, el `proyectoId` y las horas que el revisor
 * asignó. El docente no la edita ni la quita (es un compromiso del proyecto).
 *
 * Espeja el patrón de `inyectarConsejeriaEnActividades`. Preserva la descripción
 * previa si el proyecto ya estaba en un borrador.
 */
export function inyectarProyectosEnActividades(
  investigacion: ActividadFormData[],
  proyeccion: ActividadFormData[],
  proyectos: ProyectoAprobadoOpcion[],
): {
  actividadesInvestigacion: ActividadFormData[]
  actividadesProyeccionSocial: ActividadFormData[]
} {
  if (!proyectos || proyectos.length === 0) {
    return { actividadesInvestigacion: investigacion, actividadesProyeccionSocial: proyeccion }
  }

  const buildCard = (
    p: ProyectoAprobadoOpcion,
    previas: ActividadFormData[],
  ): ActividadFormData => {
    const previa = previas.find((a) => a.proyectoId === p.id)
    const nombre = (p.rol && ROL_A_ACTIVIDAD_CATALOGO[p.rol]?.nombre) || p.titulo
    return {
      ...EMPTY_ACTIVIDAD,
      nombre,
      descripcion: previa?.descripcion || p.titulo,
      dedicacionPeriodo: p.horasAsignadas,
      proyectoId: p.id,
    }
  }

  const inyectar = (
    actuales: ActividadFormData[],
    delTipo: ProyectoAprobadoOpcion[],
  ): ActividadFormData[] => {
    const idsForzados = new Set(delTipo.map((p) => p.id))
    // Conserva las actividades que NO son un proyecto forzado (otras del Art. 11
    // o proyectos que ya no aplican); las forzadas se reconstruyen al frente.
    const resto = actuales.filter((a) => !a.proyectoId || !idsForzados.has(a.proyectoId))
    const tarjetas = delTipo.map((p) => buildCard(p, actuales))
    return [...tarjetas, ...resto]
  }

  return {
    actividadesInvestigacion: inyectar(
      investigacion,
      proyectos.filter((p) => p.tipo === "INVESTIGACION"),
    ),
    actividadesProyeccionSocial: inyectar(
      proyeccion,
      proyectos.filter((p) => p.tipo === "PROYECCION_SOCIAL"),
    ),
  }
}
