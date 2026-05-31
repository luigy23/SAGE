import Link from "next/link"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { listSolicitudesDocente } from "@/lib/actions/solicitud-perfil"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SolicitudEstadoBadge } from "@/components/perfil/SolicitudEstadoBadge"
import {
  CAMPOS_EDITABLES,
  ETIQUETAS_CAMPOS,
} from "@/lib/schemas/solicitud-perfil-schema"
import { ArrowLeft, FileEdit, Inbox } from "lucide-react"

export default async function MisSolicitudesPerfilPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const solicitudes = await listSolicitudesDocente(session.user.id)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mis solicitudes de cambio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Historial de cambios al perfil enviados para aprobación del admin.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link href="/perfil/editar">
            <FileEdit className="h-4 w-4" />
            Editar perfil
          </Link>
        </Button>
      </div>

      <Button asChild variant="ghost" size="sm" className="gap-2 w-fit">
        <Link href="/perfil">
          <ArrowLeft className="h-4 w-4" />
          Volver al perfil
        </Link>
      </Button>

      {solicitudes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Aún no has enviado ninguna solicitud de cambio.
            </p>
            <Button asChild size="sm">
              <Link href="/perfil/editar">Editar perfil</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {solicitudes.map((s) => {
            const cambios = s.camposDespues as Record<string, unknown>
            const camposCambiados = CAMPOS_EDITABLES.filter((c) => c in cambios)
            return (
              <Card key={s.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                  <div className="space-y-1">
                    <CardTitle className="text-base">
                      Solicitud del{" "}
                      {new Date(s.createdAt).toLocaleDateString("es-CO", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </CardTitle>
                    <div className="flex flex-wrap gap-1.5">
                      {camposCambiados.length === 0 ? (
                        <span className="text-xs text-muted-foreground">
                          Sin cambios registrados
                        </span>
                      ) : (
                        camposCambiados.map((c) => (
                          <Badge key={c} variant="outline" className="text-xs">
                            {ETIQUETAS_CAMPOS[c]}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                  <SolicitudEstadoBadge estado={s.estado} />
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {s.estado === "RECHAZADO" && s.observacionesAdmin && (
                    <p className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                      <span className="font-medium">Motivo:</span>{" "}
                      {s.observacionesAdmin}
                    </p>
                  )}
                  <div className="flex justify-end">
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/perfil/solicitudes/${s.id}`}>Ver detalle</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
