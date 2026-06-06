import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getAutoridadDeSesion } from "@/lib/auth/get-autoridad"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ProyectoForm } from "@/components/proyectos/ProyectoForm"
import { getPeriodos } from "@/lib/actions/periodo-actions"
import { ArrowLeft, Microscope } from "lucide-react"

export const metadata: Metadata = {
  title: "Nuevo Proyecto | SAGE",
}

export default async function NuevoProyectoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const sp = await searchParams
  const paraOtro = sp.paraOtro === "true"

  // Si quien registra tiene autoridad y vino desde la gestión, lo hace PARA otro
  // docente: no entra como participante y elige al responsable entre el equipo.
  const sesionAutoridad = await getAutoridadDeSesion()
  const creadorEsAutoridad = sesionAutoridad !== null && paraOtro

  const periodos = (await getPeriodos()).map((p) => ({
    nombre: p.nombre,
    fechaInicio: p.fechaInicio,
    fechaFin: p.fechaFin,
  }))

  // La autoridad llega desde la gestión de su ámbito; el docente, desde "mis proyectos".
  const volverHref = creadorEsAutoridad ? "/gestion/proyectos" : "/proyectos"
  const volverLabel = creadorEsAutoridad ? "Volver a la gestión de proyectos" : "Volver a mis proyectos"

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="w-fit gap-1.5">
        <Link href={volverHref}>
          <ArrowLeft className="h-4 w-4" />
          {volverLabel}
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Microscope className="h-5 w-5" />
            Registrar nuevo proyecto
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Podés guardar el formulario como borrador y enviarlo a revisión
            cuando esté completo, o enviarlo directamente.
          </p>
        </CardHeader>
        <CardContent>
          <ProyectoForm
            creadorId={session.user.id}
            periodos={periodos}
            creadorEsAutoridad={creadorEsAutoridad}
          />
        </CardContent>
      </Card>
    </div>
  )
}
