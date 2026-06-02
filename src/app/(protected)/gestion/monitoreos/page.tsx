import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ClipboardCheck } from "lucide-react"
import { listMonitoreosParaRevisar } from "@/lib/actions/revision"
import { getPeriodos } from "@/lib/actions/periodo-actions"
import { parseRevisionFilters } from "@/lib/types/revision"
import { RevisionFilters } from "@/components/revision/RevisionFilters"
import { RevisionPagination } from "@/components/revision/RevisionPagination"
import { RevisionMonitoreoTable } from "@/components/revision/RevisionMonitoreoTable"

export default async function GestionMonitoreosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [sp, periodos] = await Promise.all([searchParams, getPeriodos()])
  const filters = parseRevisionFilters(sp)
  const data = await listMonitoreosParaRevisar(filters)

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardCheck className="h-5 w-5" />
            Monitoreos de tu ámbito
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Solo ves los monitoreos de los docentes a tu cargo. Usa los filtros para acotar por estado, periodo, modalidad o sede.
          </p>
        </div>
        <RevisionFilters periodos={periodos.map((p) => ({ nombre: p.nombre, estado: p.estado }))} />
      </CardHeader>
      <CardContent className="space-y-4">
        <RevisionMonitoreoTable items={data.items} basePath="/gestion/monitoreos" />
        <RevisionPagination
          page={data.page}
          perPage={data.perPage}
          total={data.total}
          totalPages={data.totalPages}
        />
      </CardContent>
    </Card>
  )
}
