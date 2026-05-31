import { Suspense } from "react"
import { getAuditoriaLogs, getAuditoriaStats } from "@/lib/actions/auditoria-actions"
import { parseAuditoriaFilters } from "@/lib/types/auditoria"
import { AuditoriaStats } from "@/components/superadmin/auditoria/AuditoriaStats"
import { AuditoriaFilters } from "@/components/superadmin/auditoria/AuditoriaFilters"
import { AuditoriaTable } from "@/components/superadmin/auditoria/AuditoriaTable"
import { RevisionPagination } from "@/components/revision/RevisionPagination"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ShieldAlert } from "lucide-react"

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const filters = parseAuditoriaFilters(sp)

  const [data, stats] = await Promise.all([
    getAuditoriaLogs(filters),
    getAuditoriaStats(),
  ])

  return (
    <div className="container mx-auto py-10 max-w-7xl space-y-6">
      <div className="flex items-center gap-3">
        <ShieldAlert className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold">Auditoría del Sistema</h1>
          <p className="text-sm text-muted-foreground">
            Registro inmutable de todas las acciones administrativas
          </p>
        </div>
      </div>

      <Suspense>
        <AuditoriaStats stats={stats} />
      </Suspense>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Eventos</CardTitle>
          <CardDescription>
            {data.total === 0
              ? "Sin resultados para los filtros aplicados."
              : `${data.total} evento${data.total !== 1 ? "s" : ""} encontrado${data.total !== 1 ? "s" : ""}`}
          </CardDescription>
          <Suspense>
            <AuditoriaFilters />
          </Suspense>
        </CardHeader>
        <CardContent className="space-y-4">
          <AuditoriaTable items={data.items} />
          {data.totalPages > 1 && (
            <RevisionPagination
              page={data.page}
              perPage={data.perPage}
              total={data.total}
              totalPages={data.totalPages}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
