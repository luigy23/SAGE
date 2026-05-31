import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { SolicitudEstadoBadge } from "@/components/perfil/SolicitudEstadoBadge"
import { SolicitudDiffPanel } from "@/components/perfil/SolicitudDiffPanel"

export default async function MiSolicitudDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const { id } = await params
  const solicitud = await prisma.solicitudCambioPerfil.findUnique({
    where: { id },
  })
  if (!solicitud || solicitud.docenteId !== session.user.id) notFound()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="gap-2 w-fit">
        <Link href="/perfil/solicitudes">
          <ArrowLeft className="h-4 w-4" />
          Volver a mis solicitudes
        </Link>
      </Button>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle>
              Solicitud del{" "}
              {new Date(solicitud.createdAt).toLocaleDateString("es-CO", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </CardTitle>
            {solicitud.revisadoEn && (
              <p className="mt-1 text-xs text-muted-foreground">
                Revisada el{" "}
                {new Date(solicitud.revisadoEn).toLocaleDateString("es-CO", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
          <SolicitudEstadoBadge estado={solicitud.estado} />
        </CardHeader>
        <CardContent className="space-y-3">
          {solicitud.motivoSolicitud && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Motivo del docente
              </p>
              <p className="text-sm">{solicitud.motivoSolicitud}</p>
            </div>
          )}
          {solicitud.estado === "RECHAZADO" && solicitud.observacionesAdmin && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
              <p className="text-xs font-medium text-red-900 dark:text-red-200">
                Motivo del rechazo
              </p>
              <p className="text-sm text-red-800 dark:text-red-300">
                {solicitud.observacionesAdmin}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <SolicitudDiffPanel
        camposAntes={solicitud.camposAntes as Record<string, unknown>}
        camposDespues={solicitud.camposDespues as Record<string, unknown>}
      />
    </div>
  )
}
