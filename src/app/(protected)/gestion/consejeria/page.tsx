import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getAutoridadDeSesion } from "@/lib/auth/get-autoridad"
import { getEtiquetaGestion } from "@/lib/auth/autoridad"
import { getPeriodoActivoConFechas } from "@/lib/utils/periodo-server"
import { listConsejerosDeAmbito, getCohortesDisponibles, type CohorteDisponible } from "@/lib/consejeria"
import { ConsejerosLista } from "@/components/consejeria/ConsejerosLista"
import { AsignarConsejeroDialog, type DocenteAsignable } from "@/components/consejeria/AsignarConsejeroDialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users } from "lucide-react"
import type { Prisma } from "@/generated/prisma/client"

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
  const { autoridad } = sesion
  const consejeros = await listConsejerosDeAmbito(autoridad, periodo)
  const esDecano = autoridad.tipo === "DECANO"
  const mostrarPrograma = autoridad.tipo !== "JEFE" // decano/superadmin ven varios programas
  const totalCohortes = consejeros.reduce((s, c) => s + c.cohortes.length, 0)

  // Docentes asignables como consejeros dentro del ámbito (excluye cátedra: Art. 11).
  const scopeDocente: Prisma.DocenteWhereInput =
    autoridad.tipo === "SUPERADMIN"
      ? {}
      : autoridad.tipo === "DECANO"
        ? { facultad: autoridad.ambitoValor ?? " " }
        : { programa: autoridad.ambitoValor ?? " " }

  const docentesAmbito = await prisma.docente.findMany({
    where: { ...scopeDocente, estadoCuenta: "ACTIVO", modalidad: { not: "CATEDRA" } },
    select: { id: true, nombre: true, programa: true, facultad: true },
    orderBy: { nombre: "asc" },
  })
  const docentesAsignables: DocenteAsignable[] = docentesAmbito

  // Cohortes libres por programa (la exclusividad se resuelve por programa).
  const programas = [...new Set(docentesAmbito.map((d) => d.programa))]
  const pares = await Promise.all(
    programas.map(async (p) => [p, await getCohortesDisponibles(p, periodo)] as const),
  )
  const cohortesPorPrograma: Record<string, CohorteDisponible[]> = Object.fromEntries(pares)

  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Consejeros académicos · {getEtiquetaGestion(autoridad)}
          </CardTitle>
          <AsignarConsejeroDialog
            docentes={docentesAsignables}
            cohortesPorPrograma={cohortesPorPrograma}
            mostrarPrograma={mostrarPrograma}
          />
        </div>
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
        <ConsejerosLista
          consejeros={consejeros}
          periodo={periodo}
          mostrarPrograma={mostrarPrograma}
        />
      </CardContent>
    </Card>
  )
}
