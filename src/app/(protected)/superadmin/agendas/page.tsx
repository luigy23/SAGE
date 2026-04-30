import { listAgendasParaRehabilitar } from "@/lib/actions/superadmin-actions"
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
import { RehabilitarAgendaDialog } from "@/components/superadmin/rehabilitar-agenda-dialog"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export default async function AgendasPage() {
  const agendas = await listAgendasParaRehabilitar("ENVIADO")

  return (
    <div className="container mx-auto py-10 max-w-6xl">
      <Card>
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-2xl font-bold">Rehabilitar Agendas Enviadas</CardTitle>
          <CardDescription>
            Devuelve una agenda en estado <Badge variant="outline">ENVIADO</Badge> al
            estado <Badge variant="outline">BORRADOR</Badge> para que el docente pueda
            corregirla. La acción queda registrada con motivo, fecha y SuperAdmin
            responsable. Solo se muestran las últimas 100.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Docente</TableHead>
                  <TableHead>Modalidad</TableHead>
                  <TableHead>Programa</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-center">Rehab. previas</TableHead>
                  <TableHead>Última actualización</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agendas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      No hay agendas enviadas para mostrar.
                    </TableCell>
                  </TableRow>
                )}
                {agendas.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{a.docente.nombre}</span>
                        <span className="text-xs text-muted-foreground">
                          {a.docente.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {a.docente.modalidad}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{a.docente.programa}</TableCell>
                    <TableCell className="font-mono text-sm">{a.periodo}</TableCell>
                    <TableCell>
                      <Badge
                        variant="default"
                        className={
                          a.estado === "ENVIADO"
                            ? "bg-green-600 hover:bg-green-600"
                            : ""
                        }
                      >
                        {a.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {a.rehabilitadaCount}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(a.updatedAt), "dd MMM yyyy HH:mm", { locale: es })}
                    </TableCell>
                    <TableCell className="text-right">
                      <RehabilitarAgendaDialog
                        agendaId={a.id}
                        docenteName={a.docente.nombre}
                        periodo={a.periodo}
                      />
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
