import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, UserPlus, Pencil } from "lucide-react"
import {
  listAgendasParaRevisar,
  listDocentesNoPlantaDeMiAmbito,
} from "@/lib/actions/revision"
import { getPeriodos } from "@/lib/actions/periodo-actions"
import { parseRevisionFilters } from "@/lib/types/revision"
import { RevisionFilters } from "@/components/revision/RevisionFilters"
import { RevisionPagination } from "@/components/revision/RevisionPagination"
import { RevisionAgendaTable } from "@/components/revision/RevisionAgendaTable"
import { getModalidadLabel } from "@/lib/utils/modalidad"

export default async function GestionAgendasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [sp, periodos] = await Promise.all([searchParams, getPeriodos()])
  const filters = parseRevisionFilters(sp)
  // listAgendasParaRevisar fuerza el scope al ámbito del actor (programa/facultad/global).
  const data = await listAgendasParaRevisar(filters)

  // Docentes No-Planta del ámbito (vacío para SUPERADMIN global): base de la
  // creación delegada. El período activo determina el estado de su agenda.
  const periodoActivo = periodos.find((p) => p.estado === "ABIERTO")?.nombre ?? null
  const noPlanta = await listDocentesNoPlantaDeMiAmbito(periodoActivo)

  return (
    <div className="space-y-6">
      {noPlanta.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserPlus className="h-5 w-5" />
              Crear agendas de docentes No-Planta
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Eres responsable de armar la agenda de los catedráticos, ocasionales, visitantes e
              invitados de tu ámbito (Acuerdo 048, Art. 4 y 6).
              {periodoActivo ? (
                <> Período activo: <span className="font-mono font-medium">{periodoActivo}</span>.</>
              ) : (
                <> No hay período activo configurado.</>
              )}
            </p>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border divide-y">
              {noPlanta.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{d.nombre}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {getModalidadLabel(d.modalidad)} · {d.programa}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.agenda ? (
                      <Badge
                        variant="outline"
                        className={
                          d.agenda.estado === "APROBADO"
                            ? "border-green-500 text-green-700"
                            : d.agenda.estado === "ENVIADO"
                              ? "border-yellow-500 text-yellow-700"
                              : d.agenda.estado === "RECHAZADO"
                                ? "border-red-500 text-red-700"
                                : ""
                        }
                      >
                        {d.agenda.estado}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Sin agenda</Badge>
                    )}
                    <Button asChild size="sm" variant="outline" className="gap-1.5">
                      <Link href={`/gestion/agendas/nueva/${d.id}`}>
                        {d.agenda && d.agenda.estado === "BORRADOR" ? (
                          <>
                            <Pencil className="h-3.5 w-3.5" />
                            Continuar
                          </>
                        ) : d.agenda ? (
                          <>
                            <Calendar className="h-3.5 w-3.5" />
                            Ver
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-3.5 w-3.5" />
                            Crear
                          </>
                        )}
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

    <Card>
      <CardHeader className="space-y-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            Agendas de tu ámbito
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Solo ves las agendas de los docentes a tu cargo. Usa los filtros para acotar por estado, periodo, modalidad o sede.
          </p>
        </div>
        <RevisionFilters periodos={periodos.map((p) => ({ nombre: p.nombre, estado: p.estado }))} />
      </CardHeader>
      <CardContent className="space-y-4">
        <RevisionAgendaTable items={data.items} basePath="/gestion/agendas" />
        <RevisionPagination
          page={data.page}
          perPage={data.perPage}
          total={data.total}
          totalPages={data.totalPages}
        />
      </CardContent>
    </Card>
    </div>
  )
}
