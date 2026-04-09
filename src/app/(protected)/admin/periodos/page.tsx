import { getPeriodos } from "@/lib/actions/periodo-actions"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { CreatePeriodoDialog } from "@/components/admin/create-periodo-dialog"
import { PeriodoStatusDropdown } from "@/components/admin/periodo-status-dropdown"

export default async function AdminPeriodosPage() {
  const periodos = await getPeriodos()

  return (
    <div className="container mx-auto py-10 max-w-5xl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">Motor de Periodos Académicos</CardTitle>
            <CardDescription>Controla el reloj global del sistema SAGE (Apertura y Cierre de semestres).</CardDescription>
          </div>
          <CreatePeriodoDialog />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre del Periodo</TableHead>
                <TableHead>Fecha Inicio</TableHead>
                <TableHead>Fecha Fin</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periodos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                    No hay periodos creados. Dale a "Crear Período" para empezar.
                  </TableCell>
                </TableRow>
              )}
              {periodos.map((periodo) => (
                <TableRow key={periodo.id}>
                  <TableCell className="font-bold">{periodo.nombre}</TableCell>
                  <TableCell>{new Date(periodo.fechaInicio).toLocaleDateString('es-CO')}</TableCell>
                  <TableCell>{new Date(periodo.fechaFin).toLocaleDateString('es-CO')}</TableCell>
                  <TableCell>
                    <Badge
                      variant={periodo.estado === "ABIERTO" ? "default" : "destructive"}
                      className={
                        periodo.estado === "ABIERTO"
                          ? "bg-green-600 hover:bg-green-700"
                          : ""
                      }
                    >
                      {periodo.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <PeriodoStatusDropdown
                      periodoId={periodo.id}
                      currentStatus={periodo.estado}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
