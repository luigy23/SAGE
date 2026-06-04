import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ProyectoForm } from "@/components/proyectos/ProyectoForm"
import { getPeriodos } from "@/lib/actions/periodo-actions"
import { ArrowLeft, Microscope } from "lucide-react"

export const metadata: Metadata = {
  title: "Nuevo Proyecto | SAGE",
}

export default async function NuevoProyectoPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const periodos = (await getPeriodos()).map((p) => ({
    nombre: p.nombre,
    fechaInicio: p.fechaInicio,
    fechaFin: p.fechaFin,
  }))

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="w-fit gap-1.5">
        <Link href="/proyectos">
          <ArrowLeft className="h-4 w-4" />
          Volver a mis proyectos
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
          <ProyectoForm creadorId={session.user.id} periodos={periodos} />
        </CardContent>
      </Card>
    </div>
  )
}
