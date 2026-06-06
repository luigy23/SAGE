import { getCursosMaestros } from "@/lib/actions/curso-maestro-actions"
import { CreateCourseDialog } from "@/components/admin/create-course-dialog"
import { CourseStatusToggle } from "@/components/admin/course-status-toggle"
import { ImportCursosDialog } from "@/components/admin/import-cursos-dialog"
import { EditCourseSheet } from "@/components/admin/edit-course-sheet"
import { DeleteCourseButton } from "@/components/admin/delete-course-button"
import { Badge } from "@/components/ui/badge"
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
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"

function formatHrsSemPresenciales(curso: {
  tipo: "TEORICO" | "TEORICO_PRACTICO" | "PRACTICO"
  horasSemT: number | null
  horasSemP: number | null
}) {
  const t = curso.horasSemT
  const p = curso.horasSemP
  if (curso.tipo === "TEORICO") return t != null ? String(t) : "—"
  if (curso.tipo === "PRACTICO") return p != null ? String(p) : "—"
  // TEORICO_PRACTICO
  if (t == null && p == null) return "—"
  return `${t ?? 0} + ${p ?? 0}`
}

export default async function AdminCursosPage() {
  const cursos = await getCursosMaestros()

  return (
    <div className="container mx-auto py-10 max-w-7xl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold">Catálogo Maestro de Cursos</CardTitle>
            <CardDescription>
              Gestiona el inventario oficial de cursos de la Universidad Surcolombiana.
              Los docentes seleccionarán de este catálogo al planificar su agenda (FO-19).
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <ImportCursosDialog />
            <CreateCourseDialog />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Facultad</TableHead>
                  <TableHead className="text-center" title="Horas presenciales semanales (Teóricas + Prácticas)">
                    Hrs/Sem (T+P)
                  </TableHead>
                  <TableHead className="text-center">Créditos</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cursos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No hay cursos registrados en el catálogo. Usa el botón &quot;Crear Curso&quot; para agregar el primero.
                    </TableCell>
                  </TableRow>
                )}
                {cursos.map((curso) => {
                  const enUso = curso._count.cursosAgenda
                  return (
                    <TableRow key={curso.id} className={!curso.estado ? "opacity-50" : ""}>
                      <TableCell className="font-mono font-medium">{curso.codigo}</TableCell>
                      <TableCell className="font-medium whitespace-normal min-w-[200px]">
                        <div className="inline-flex items-center gap-2">
                          <span>{curso.nombre}</span>
                          {enUso > 0 && (
                            <Badge
                              variant="outline"
                              className="text-xs font-normal text-muted-foreground border-muted-foreground/30"
                              title={`${enUso} ${enUso === 1 ? "agenda" : "agendas"} FO-19 referencian este curso`}
                            >
                              {enUso} {enUso === 1 ? "agenda" : "agendas"}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            curso.tipo === "TEORICO"
                              ? "border-blue-300 text-blue-700 bg-blue-50"
                              : curso.tipo === "PRACTICO"
                                ? "border-green-300 text-green-700 bg-green-50"
                                : "border-purple-300 text-purple-700 bg-purple-50"
                          }
                        >
                          {curso.tipo === "TEORICO"
                            ? "Teórico"
                            : curso.tipo === "PRACTICO"
                              ? "Práctico"
                              : "Teórico - Práctico"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {curso.facultad ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-center font-mono text-sm">
                        {formatHrsSemPresenciales(curso)}
                      </TableCell>
                      <TableCell className="text-center">{curso.creditos}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <CourseStatusToggle cursoId={curso.id} currentEstado={curso.estado} />
                          <EditCourseSheet curso={curso} />
                          <DeleteCourseButton
                            cursoId={curso.id}
                            cursoCodigo={curso.codigo}
                            cursoNombre={curso.nombre}
                            cursosAgendaCount={enUso}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
