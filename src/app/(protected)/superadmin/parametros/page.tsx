import { listParametrosGlobales } from "@/lib/actions/superadmin-actions"
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
import { EditParametroDialog } from "@/components/superadmin/edit-parametro-dialog"

export default async function ParametrosGlobalesPage() {
  const params = await listParametrosGlobales()

  return (
    <div className="container mx-auto py-10 max-w-5xl">
      <Card>
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-2xl font-bold">Parámetros Globales</CardTitle>
          <CardDescription>
            Valores normativos por defecto que rigen el cálculo de la Agenda Semestral (FO-19).
            Cualquier cambio se propaga al cabo de máximo un minuto (cache TTL 60s).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clave</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {params.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No hay parámetros configurados. Ejecuta `npx prisma db seed`.
                    </TableCell>
                  </TableRow>
                )}
                {params.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono font-medium text-sm">
                      {p.clave}
                    </TableCell>
                    <TableCell className="font-bold tabular-nums">
                      {p.valor}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs uppercase">
                        {p.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-md">
                      {p.descripcion ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.articuloOrigen ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <EditParametroDialog parametro={p} />
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
