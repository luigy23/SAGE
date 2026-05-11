import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "lucide-react"
import { listAgendasParaRevisar } from "@/lib/actions/revision"
import { parseRevisionFilters } from "@/lib/types/revision"
import { RevisionFilters } from "@/components/revision/RevisionFilters"
import { RevisionPagination } from "@/components/revision/RevisionPagination"
import { RevisionAgendaTable } from "@/components/revision/RevisionAgendaTable"

export default async function RevisionAgendasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const filters = parseRevisionFilters(sp)
  const data = await listAgendasParaRevisar(filters)

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            Agendas para revisar
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Lista paginada de agendas. Por defecto se muestran las que están en estado{" "}
            <span className="font-mono">ENVIADO</span>.
          </p>
        </div>
        <RevisionFilters />
      </CardHeader>
      <CardContent className="space-y-4">
        <RevisionAgendaTable items={data.items} />
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
