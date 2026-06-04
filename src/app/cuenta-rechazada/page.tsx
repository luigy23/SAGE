import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { XCircle } from "lucide-react"
import { ReAplicarForm } from "./re-aplicar-form"

export default async function CuentaRechazadaPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")
  if (session.user.estadoCuenta !== "RECHAZADO") redirect("/dashboard")

  const docente = await prisma.docente.findUnique({
    where: { id: session.user.id },
    select: {
      nombre: true,
      email: true,
      facultad: true,
      programa: true,
      modalidad: true,
      sedeBase: true,
      celular: true,
    },
  })

  if (!docente) redirect("/auth/login")

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Aviso de rechazo */}
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <XCircle className="h-6 w-6 text-red-600 shrink-0" />
              <div>
                <CardTitle className="text-red-800 text-lg">Solicitud rechazada</CardTitle>
                <p className="text-sm text-red-600 mt-0.5">
                  Hola {docente.nombre}, tu solicitud de acceso fue rechazada por el administrador.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-700">
              Podés actualizar tu información institucional y reenviar la solicitud para una nueva evaluación.
              Al enviar, tu sesión se cerrará y deberás esperar la aprobación del administrador.
            </p>
          </CardContent>
        </Card>

        {/* Datos actuales (solo lectura) */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Datos de tu cuenta</CardTitle>
              <Badge className="bg-orange-500 text-white">Rechazado</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Nombre</dt>
                <dd className="font-medium">{docente.nombre}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="font-medium truncate">{docente.email}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Formulario de re-aplicación */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Actualizar información y reenviar</CardTitle>
            <p className="text-sm text-muted-foreground">
              Revisa y corrige tus datos institucionales antes de reenviar la solicitud.
            </p>
          </CardHeader>
          <CardContent>
            <ReAplicarForm
              current={{
                facultad: docente.facultad,
                programa: docente.programa,
                modalidad: docente.modalidad,
                sedeBase: docente.sedeBase,
                celular: docente.celular,
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
