import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, PauseCircle } from "lucide-react"
import { signOutAction } from "@/lib/actions/sign-out"

/**
 * Pantalla de espera para cuentas que aún no están ACTIVO.
 *
 * - PENDIENTE: registro hecho, esperando aprobación del administrador.
 * - INACTIVO: cuenta desactivada por un administrador.
 *
 * RECHAZADO se maneja en /cuenta-rechazada. ACTIVO entra normal al sistema.
 */
export default async function CuentaPendientePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")
  if (session.user.estadoCuenta === "RECHAZADO") redirect("/cuenta-rechazada")
  if (session.user.estadoCuenta === "ACTIVO") redirect("/dashboard")

  const inactivo = session.user.estadoCuenta === "INACTIVO"

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-lg">
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              {inactivo ? (
                <PauseCircle className="h-6 w-6 shrink-0 text-amber-600" />
              ) : (
                <Clock className="h-6 w-6 shrink-0 text-amber-600" />
              )}
              <div>
                <CardTitle className="text-lg text-amber-800">
                  {inactivo ? "Cuenta desactivada" : "Cuenta en revisión"}
                </CardTitle>
                <p className="mt-0.5 text-sm text-amber-700">
                  Hola {session.user.name}.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-amber-700">
              {inactivo
                ? "Tu cuenta fue desactivada por un administrador. Si crees que es un error, comunícate con el administrador de tu programa."
                : "Tu registro fue recibido y está pendiente de aprobación por un administrador. Recibirás acceso a SAGE una vez que tu cuenta sea aprobada."}
            </p>
            <form action={signOutAction}>
              <button
                type="submit"
                className="text-sm font-medium text-amber-800 underline underline-offset-2 hover:text-amber-900"
              >
                Cerrar sesión
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
