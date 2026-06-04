import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ProyectoStatusBadge } from "@/components/proyectos/ProyectoStatusBadge"

const TIPO_LABEL: Record<string, string> = {
  INVESTIGACION: "Investigación",
  PROYECCION_SOCIAL: "Proyección Social",
}

const ROL_LABEL: Record<string, string> = {
  INVESTIGADOR_PRINCIPAL: "Investigador Principal",
  COINVESTIGADOR: "Coinvestigador",
  COORDINADOR: "Coordinador",
  COGESTOR: "Cogestor",
}

/** Roles líder que anclan el proyecto a un programa/facultad. */
const LIDER_ROLES = ["INVESTIGADOR_PRINCIPAL", "COORDINADOR"]

type ItemProyecto = {
  id: string
  titulo: string
  tipo: string
  estado: string
  createdAt: Date | string
  periodoInicio?: string | null
  participantes: {
    rol: string
    docente: { nombre: string; programa: string; facultad: string }
  }[]
}

/**
 * Fila de la lista de revisión de proyectos. Muestra al LÍDER del proyecto
 * (Investigador Principal / Coordinador), que es quien lo ancla a un ámbito.
 * Compartida por la ruta de admin y la de gestión (cambia `basePath`).
 */
export function ProyectoRevisionListItem({
  proyecto,
  basePath,
}: {
  proyecto: ItemProyecto
  basePath: string
}) {
  const lider = proyecto.participantes.find((p) => LIDER_ROLES.includes(p.rol))
  const nombre = lider?.docente.nombre ?? "—"
  const ambito = [lider?.docente.programa, lider?.docente.facultad]
    .filter(Boolean)
    .join(" · ")

  return (
    <li className="flex flex-wrap items-center gap-3 p-3">
      <div className="flex-1 min-w-0">
        <p className="font-medium">{nombre}</p>
        {ambito && <p className="text-xs text-muted-foreground">{ambito}</p>}
        <p className="mt-0.5 text-sm">{proyecto.titulo}</p>
        <p className="text-xs text-muted-foreground">
          {TIPO_LABEL[proyecto.tipo] ?? proyecto.tipo}
          {lider ? ` · ${ROL_LABEL[lider.rol] ?? lider.rol}` : ""}
        </p>
        <p className="text-xs text-muted-foreground">
          {new Date(proyecto.createdAt).toLocaleDateString("es-CO", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <ProyectoStatusBadge estado={proyecto.estado} />
        <Button asChild size="sm" variant="outline">
          <Link href={`${basePath}/${proyecto.id}`}>Revisar</Link>
        </Button>
      </div>
    </li>
  )
}
