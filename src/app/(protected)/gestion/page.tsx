import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, ClipboardCheck, Microscope, UserCog, Users } from "lucide-react"
import { getProyectosParaGestion } from "@/lib/actions/proyecto-actions"
import { listSolicitudesParaGestion } from "@/lib/actions/solicitud-perfil"

/**
 * Tablero de la autoridad académica: pendientes de su ámbito de un vistazo.
 * Los contadores de Proyectos y Solicitudes (lo más sensible) salen de las
 * acciones scoped; Agendas y Monitoreos enlazan a su listado.
 */
export default async function GestionHubPage() {
  const [proyectos, solicitudes] = await Promise.all([
    getProyectosParaGestion({ estado: "ENVIADO", perPage: 1 }),
    listSolicitudesParaGestion({ estado: "ENVIADO", perPage: 1 }),
  ])

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <HubCard
        icon={<Calendar className="h-4 w-4" />}
        titulo="Agendas (FO-19)"
        descripcion="Planeación semestral de tus docentes."
        href="/gestion/agendas"
      />
      <HubCard
        icon={<ClipboardCheck className="h-4 w-4" />}
        titulo="Monitoreos (FO-20)"
        descripcion="Auditoría de ejecución del semestre."
        href="/gestion/monitoreos"
      />
      <HubCard
        icon={<Microscope className="h-4 w-4" />}
        titulo="Proyectos"
        descripcion="Aprueba y asigna horas a los proyectos."
        href="/gestion/proyectos"
        pendientes={proyectos.total}
      />
      <HubCard
        icon={<UserCog className="h-4 w-4" />}
        titulo="Solicitudes de perfil"
        descripcion="Cambios de datos de tus docentes."
        href="/gestion/perfiles"
        pendientes={solicitudes.total}
      />
      <HubCard
        icon={<Users className="h-4 w-4" />}
        titulo="Consejeros"
        descripcion="Consejería académica por cohorte (Art. 11)."
        href="/gestion/consejeria"
      />
    </div>
  )
}

function HubCard({
  icon,
  titulo,
  descripcion,
  href,
  pendientes,
}: {
  icon: React.ReactNode
  titulo: string
  descripcion: string
  href: string
  pendientes?: number
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {titulo}
        </CardTitle>
        {pendientes !== undefined && pendientes > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            {pendientes} en revisión
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{descripcion}</p>
        <Button asChild size="sm" className="w-full">
          <Link href={href}>Ver listado</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
