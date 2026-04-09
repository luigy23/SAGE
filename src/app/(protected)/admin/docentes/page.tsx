import { getDocentesAdmin } from "@/lib/actions/admin-actions"
import { TeacherStatusDropdown } from "@/components/admin/teacher-status-dropdown"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export default async function AdminDocentesPage() {
  const docentes = await getDocentesAdmin()

  return (
    <div className="container mx-auto py-10 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Gestión de Docentes</CardTitle>
          <CardDescription>
            Administra los accesos y el estado de los docentes registrados en el sistema SAGE.
            Los docentes en estado PENDIENTE no pueden planificar agendas (FO-19).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Cédula</TableHead>
                  <TableHead>Modalidad / Sede</TableHead>
                  <TableHead>Registro</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docentes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No hay docentes registrados en el sistema.
                    </TableCell>
                  </TableRow>
                )}
                {docentes.map((docente) => (
                  <TableRow key={docente.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{docente.nombre}</span>
                        <span className="text-xs text-muted-foreground">{docente.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>{docente.cedula}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 items-start">
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {docente.modalidad.replace("_", " ")}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{docente.sedeBase}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(docente.createdAt), "dd MMM yyyy", { locale: es })}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          docente.estadoCuenta === "ACTIVO" 
                            ? "default" 
                            : docente.estadoCuenta === "PENDIENTE" 
                              ? "secondary" 
                              : "destructive"
                        }
                        className={
                          docente.estadoCuenta === "ACTIVO" 
                            ? "bg-green-600 hover:bg-green-700" 
                            : docente.estadoCuenta === "PENDIENTE"
                              ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                              : ""
                        }
                      >
                        {docente.estadoCuenta}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <TeacherStatusDropdown 
                        docenteId={docente.id} 
                        currentStatus={docente.estadoCuenta} 
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
