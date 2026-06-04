import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getSedeLabel } from "@/lib/utils/sede"
import {
  getSolicitudParaGestion,
  puedeAprobarSolicitudGestion,
} from "@/lib/actions/solicitud-perfil"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, GraduationCap, ShieldAlert } from "lucide-react"
import { SolicitudEstadoBadge } from "@/components/perfil/SolicitudEstadoBadge"
import { SolicitudDiffPanel } from "@/components/perfil/SolicitudDiffPanel"
import { AprobarSolicitudPerfilButton } from "@/components/revision/AprobarSolicitudPerfilButton"
import { RechazarSolicitudPerfilDialog } from "@/components/revision/RechazarSolicitudPerfilDialog"
import { getModalidadLabel } from "@/lib/utils/modalidad"

export const metadata: Metadata = {
  title: "Revisar solicitud | Gestión SAGE",
}

export default async function GestionSolicitudDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const solicitud = await getSolicitudParaGestion(id)
  if (!solicitud) notFound()

  const puedeAprobar = await puedeAprobarSolicitudGestion(solicitud.camposDespues)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild variant="ghost" size="sm" className="w-fit gap-1.5">
          <Link href="/gestion/perfiles">
            <ArrowLeft className="h-4 w-4" />
            Volver al listado
          </Link>
        </Button>
        {solicitud.estado === "ENVIADO" && (
          <div className="flex flex-wrap items-center gap-2">
            {puedeAprobar ? (
              <AprobarSolicitudPerfilButton
                solicitudId={solicitud.id}
                docenteName={solicitud.docente.nombre}
              />
            ) : (
              <span className="flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
                <ShieldAlert className="h-3.5 w-3.5" />
                Toca el cargo administrativo: lo aprueba el SuperAdmin
              </span>
            )}
            <RechazarSolicitudPerfilDialog
              solicitudId={solicitud.id}
              docenteName={solicitud.docente.nombre}
              triggerSize="default"
            />
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              {solicitud.docente.nombre}
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Solicitud creada el {new Date(solicitud.createdAt).toLocaleString("es-CO")}
            </p>
            {solicitud.revisadoEn && (
              <p className="text-xs text-muted-foreground">
                Revisada el {new Date(solicitud.revisadoEn).toLocaleString("es-CO")}
              </p>
            )}
          </div>
          <SolicitudEstadoBadge estado={solicitud.estado} />
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Cédula</dt>
              <dd>{solicitud.docente.cedula}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Email</dt>
              <dd>{solicitud.docente.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Facultad</dt>
              <dd>{solicitud.docente.facultad}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Programa</dt>
              <dd>{solicitud.docente.programa}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Modalidad</dt>
              <dd>{getModalidadLabel(solicitud.docente.modalidad)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Sede</dt>
              <dd>{getSedeLabel(solicitud.docente.sedeBase)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {solicitud.motivoSolicitud && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Motivo del docente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{solicitud.motivoSolicitud}</p>
          </CardContent>
        </Card>
      )}

      {solicitud.estado === "RECHAZADO" && solicitud.observacionesAdmin && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
          <p className="text-xs font-medium text-red-900 dark:text-red-200">Motivo del rechazo</p>
          <p className="text-sm text-red-800 dark:text-red-300">
            {solicitud.observacionesAdmin}
          </p>
        </div>
      )}

      <SolicitudDiffPanel
        camposAntes={solicitud.camposAntes as Record<string, unknown>}
        camposDespues={solicitud.camposDespues as Record<string, unknown>}
      />
    </div>
  )
}
