import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getAutoridadDeSesion } from "@/lib/auth/get-autoridad"
import { getEtiquetaGestion } from "@/lib/auth/autoridad"
import { getPeriodoActivoConFechas } from "@/lib/utils/periodo-server"
import { listConsejerosDeAmbito } from "@/lib/consejeria"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Inbox } from "lucide-react"

export const metadata: Metadata = {
  title: "Consejeros | Gestión SAGE",
}

/**
 * Consejería Académica (Art. 11) — vista de solo lectura para la autoridad:
 *  - Decano: consejeros de TODA su facultad.
 *  - Jefe de Programa: consejeros de su programa.
 *  - SUPERADMIN: todos.
 * Muestra cada consejero con sus cohortes activas ("semestre X de Y") en el período actual.
 */
export default async function GestionConsejeriaPage() {
  const sesion = await getAutoridadDeSesion()
  if (!sesion) redirect("/dashboard")

  const periodoInfo = await getPeriodoActivoConFechas()

  if (!periodoInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Consejeros académicos
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            No hay un período académico activo en este momento.
          </p>
        </CardHeader>
      </Card>
    )
  }

  const periodo = periodoInfo.nombre
  const consejeros = await listConsejerosDeAmbito(sesion.autoridad, periodo)
  const esDecano = sesion.autoridad.tipo === "DECANO"
  const totalCohortes = consejeros.reduce((s, c) => s + c.cohortes.length, 0)

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5" />
          Consejeros académicos · {getEtiquetaGestion(sesion.autoridad)}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {esDecano
            ? "Docentes que ejercen consejería en los programas de tu facultad"
            : "Docentes que ejercen consejería en tu programa"}{" "}
          durante el período{" "}
          <Badge variant="secondary" className="ml-1 text-xs">{periodo}</Badge>.
          {consejeros.length > 0 && (
            <>
              {" "}
              <span className="text-foreground">{consejeros.length}</span> consejero(s) ·{" "}
              <span className="text-foreground">{totalCohortes}</span> cohorte(s).
            </>
          )}
        </p>
      </CardHeader>
      <CardContent>
        {consejeros.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No hay consejeros activos en tu ámbito para el período {periodo}.
            </p>
          </div>
        ) : (
          <ul className="divide-y rounded-md border">
            {consejeros.map((c) => (
              <li key={c.docenteId} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{c.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    {esDecano ? `${c.programa} · ${c.facultad}` : c.programa}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  {c.cohortes.map((co) => (
                    <Badge key={co.cohorte} variant="outline" className="font-normal">
                      Cohorte <span className="ml-1 font-mono font-medium">{co.cohorte}</span>
                      <span className="ml-1 text-muted-foreground">
                        · sem {co.semestreActual} de {co.semestresCompromiso}
                      </span>
                    </Badge>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
