import { listParametrosModalidad } from "@/lib/actions/superadmin-actions"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EditModalidadDialog } from "@/components/superadmin/edit-modalidad-dialog"
import { getModalidadLabel } from "@/lib/utils/modalidad"

export default async function ParametrosModalidadPage() {
  const params = await listParametrosModalidad()

  return (
    <div className="container mx-auto py-10 max-w-6xl">
      <Card>
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-2xl font-bold">Parámetros por Modalidad</CardTitle>
          <CardDescription>
            Carga horaria, mínimos de docencia y restricciones especiales por tipo de
            vinculación docente. Acuerdo 048/2018 — Art. 3, Art. 4 y Art. 10.
            Cambios visibles tras 60 segundos (cache TTL).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Modalidad</TableHead>
                  <TableHead>Sede</TableHead>
                  <TableHead className="text-center">Sem.</TableHead>
                  <TableHead className="text-center">Sem./año</TableHead>
                  <TableHead className="text-center">Estricto</TableHead>
                  <TableHead className="text-center">Mín. Doc.</TableHead>
                  <TableHead className="text-center">Mín. Doc. (proy.)</TableHead>
                  <TableHead className="text-center">Máx Inv/PS sem.</TableHead>
                  <TableHead className="text-center">Activo</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {params.map((p) => (
                  <TableRow key={p.id} className={!p.activo ? "opacity-50" : ""}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{p.modalidad}</span>
                        <span className="text-xs text-muted-foreground">
                          {getModalidadLabel(p.modalidad)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {p.sedeAplicable ? (
                        <Badge variant="outline">{p.sedeAplicable}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Todas</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      {p.horasSemanalMax}
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      {p.horasSemestralMax ?? (
                        <span
                          className="text-xs text-muted-foreground"
                          title="Derivado: h/sem × semanas del período"
                        >
                          {p.horasSemanalMax}×sem
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {p.horasSemestralEstricto ? "✓" : "—"}
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      {p.minDocencia ?? "—"}
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      {p.minDocenciaConProyectos ?? "—"}
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      {p.maxInvProySocSemanal ?? "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      {p.activo ? "✓" : "✗"}
                    </TableCell>
                    <TableCell className="text-right">
                      <EditModalidadDialog parametro={p} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
