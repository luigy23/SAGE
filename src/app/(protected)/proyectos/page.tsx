import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getProyectosDocente } from "@/lib/actions/proyecto-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ProyectoStatusBadge } from "@/components/proyectos/ProyectoStatusBadge"
import { Plus, Inbox, Microscope } from "lucide-react"
import { formatFechaInicio } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Mis Proyectos | SAGE",
}

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

export default async function MisProyectosPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proyectos: any[] = await getProyectosDocente(session.user.id)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mis proyectos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Proyectos de investigación y proyección social registrados.
          </p>
        </div>
        <Button asChild size="sm" className="gap-2">
          <Link href="/proyectos/nuevo">
            <Plus className="h-4 w-4" />
            Nuevo proyecto
          </Link>
        </Button>
      </div>

      {proyectos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Todavía no tenés proyectos registrados.
            </p>
            <Button asChild size="sm">
              <Link href="/proyectos/nuevo">Registrar proyecto</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {proyectos.map((p) => (
            <Card key={p.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Microscope className="h-4 w-4 shrink-0 text-muted-foreground" />
                    {p.titulo}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {TIPO_LABEL[p.tipo] ?? p.tipo} ·{" "}
                    {ROL_LABEL[p.rolDocente] ?? p.rolDocente}
                    {p.periodoInicio ? ` · ${formatFechaInicio(p.periodoInicio)}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Creado el{" "}
                    {new Date(p.createdAt).toLocaleDateString("es-CO", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <ProyectoStatusBadge estado={p.estado} />
              </CardHeader>
              <CardContent className="flex justify-end pt-0">
                <Button asChild size="sm" variant="ghost">
                  <Link href={`/proyectos/${p.id}`}>Ver detalle</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
