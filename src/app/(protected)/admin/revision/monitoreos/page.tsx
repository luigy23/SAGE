import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ClipboardCheck } from "lucide-react"
import { listMonitoreosParaRevisar } from "@/lib/actions/revision"
import { parseRevisionFilters } from "@/lib/types/revision"
import { RevisionFilters } from "@/components/revision/RevisionFilters"
import { RevisionPagination } from "@/components/revision/RevisionPagination"
import { RevisionMonitoreoTable } from "@/components/revision/RevisionMonitoreoTable"

export default async function RevisionMonitoreosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const filters = parseRevisionFilters(sp)
  const data = await listMonitoreosParaRevisar(filters)

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardCheck className="h-5 w-5" />
            Monitoreos para revisar
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Lista paginada de monitoreos. Por defecto se muestran los que están en estado{" "}
            <span className="font-mono">ENVIADO</span>.
          </p>
        </div>
        <RevisionFilters />
      </CardHeader>
      <CardContent className="space-y-4">
        <RevisionMonitoreoTable items={data.items} />
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
