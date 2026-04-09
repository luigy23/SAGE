import { getCursosMaestros } from "@/lib/actions/curso-maestro-actions"
import { CreateCourseDialog } from "@/components/admin/create-course-dialog"
import { CourseStatusToggle } from "@/components/admin/course-status-toggle"
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

export default async function AdminCursosPage() {
  const cursos = await getCursosMaestros()

  return (
    <div className="container mx-auto py-10 max-w-6xl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold">Catálogo Maestro de Cursos</CardTitle>
            <CardDescription>
              Gestiona el inventario oficial de cursos de la Universidad Surcolombiana.
              Los docentes seleccionarán de este catálogo al planificar su agenda (FO-19).
            </CardDescription>
          </div>
          <CreateCourseDialog />
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="text-center">Créditos</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Registro</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cursos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No hay cursos registrados en el catálogo. Usa el botón &quot;Crear Curso&quot; para agregar el primero.
                    </TableCell>
                  </TableRow>
                )}
                {cursos.map((curso) => (
                  <TableRow key={curso.id} className={!curso.estado ? "opacity-50" : ""}>
                    <TableCell className="font-mono font-medium">{curso.codigo}</TableCell>
                    <TableCell className="font-medium">{curso.nombre}</TableCell>
                    <TableCell className="text-center">{curso.creditos}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          curso.tipo === "TEORICO"
                            ? "border-blue-300 text-blue-700 bg-blue-50"
                            : "border-purple-300 text-purple-700 bg-purple-50"
                        }
                      >
                        {curso.tipo === "TEORICO" ? "Teórico" : "Teórico - Práctico"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(curso.createdAt), "dd MMM yyyy", { locale: es })}
                    </TableCell>
                    <TableCell className="text-center">
                      <CourseStatusToggle cursoId={curso.id} currentEstado={curso.estado} />
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
