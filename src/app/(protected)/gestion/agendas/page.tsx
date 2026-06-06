import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "lucide-react"
import {
  listAgendasParaRevisar,
  listDocentesDeMiAmbitoParaAgenda,
} from "@/lib/actions/revision"
import { getPeriodos } from "@/lib/actions/periodo-actions"
import { parseRevisionFilters } from "@/lib/types/revision"
import { RevisionFilters } from "@/components/revision/RevisionFilters"
import { RevisionPagination } from "@/components/revision/RevisionPagination"
import { RevisionAgendaTable } from "@/components/revision/RevisionAgendaTable"
import { CrearAgendaDocentePicker } from "@/components/revision/CrearAgendaDocentePicker"
import { cohortesValidas } from "@/lib/utils/periodo"

export default async function GestionAgendasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [sp, periodos] = await Promise.all([searchParams, getPeriodos()])
  const filters = parseRevisionFilters(sp)
  // listAgendasParaRevisar fuerza el scope al ámbito del actor (programa/facultad/global).
  const data = await listAgendasParaRevisar(filters)

  // Docentes del ámbito (cualquier modalidad) para la creación delegada de agendas.
  const periodoActivo = periodos.find((p) => p.estado === "ABIERTO")?.nombre ?? null
  const docentesAmbito = await listDocentesDeMiAmbitoParaAgenda(periodoActivo)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5" />
                Agendas de tu ámbito
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Solo ves las agendas de los docentes a tu cargo. Podés armarle la agenda a cualquiera
                de tu ámbito (planta y No-Planta, Acuerdo 048 Art. 4 y 6). Usa los filtros para acotar.
              </p>
            </div>
            {docentesAmbito.length > 0 && (
              <CrearAgendaDocentePicker docentes={docentesAmbito} />
            )}
          </div>
          <RevisionFilters
            periodos={periodos.map((p) => ({ nombre: p.nombre, estado: p.estado }))}
            cohortes={periodoActivo ? cohortesValidas(periodoActivo) : []}
          />
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
