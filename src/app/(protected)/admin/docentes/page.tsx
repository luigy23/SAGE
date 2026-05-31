import { getDocentesAdmin } from "@/lib/actions/admin-actions"
import { TeacherStatusDropdown } from "@/components/admin/teacher-status-dropdown"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getModalidadLabel } from "@/lib/utils/modalidad"
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
import Link from "next/link"
import { Eye } from "lucide-react"

function estadoBadge(estado: string) {
  const map: Record<string, { className: string; label: string }> = {
    ACTIVO:    { className: "bg-green-600 hover:bg-green-700 text-white", label: "Activo" },
    PENDIENTE: { className: "bg-yellow-500 hover:bg-yellow-600 text-white", label: "Pendiente" },
    INACTIVO:  { className: "bg-red-600 hover:bg-red-700 text-white", label: "Inactivo" },
    RECHAZADO: { className: "bg-orange-500 hover:bg-orange-600 text-white", label: "Rechazado" },
  }
  const cfg = map[estado] ?? { className: "", label: estado }
  return <Badge className={cfg.className}>{cfg.label}</Badge>
}

export default async function AdminDocentesPage() {
  const docentes = await getDocentesAdmin()

  return (
    <div className="container mx-auto py-10 max-w-7xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Gestión de Docentes</CardTitle>
          <CardDescription>
            Administra los accesos y el estado de los docentes registrados en el sistema SAGE.
            Los docentes deben ser aprobados antes de poder planificar agendas (FO-19).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Cédula</TableHead>
                  <TableHead>Facultad / Programa</TableHead>
                  <TableHead>Modalidad / Sede</TableHead>
                  <TableHead>Registro</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docentes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No hay docentes registrados en el sistema.
                    </TableCell>
                  </TableRow>
                )}
                {docentes.map((docente) => (
                  <TableRow key={docente.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <Link
                          href={`/admin/docentes/${docente.id}`}
                          className="hover:underline font-medium"
                        >
                          {docente.nombre}
                        </Link>
                        <span className="text-xs text-muted-foreground">{docente.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>{docente.cedula}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">{docente.facultad}</span>
                        <span className="text-xs text-muted-foreground">{docente.programa}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 items-start">
                        <Badge variant="outline" className="text-[10px]">
                          {getModalidadLabel(docente.modalidad)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{docente.sedeBase}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(docente.createdAt), "dd MMM yyyy", { locale: es })}
                    </TableCell>
                    <TableCell>
                      {estadoBadge(docente.estadoCuenta)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <Link href={`/admin/docentes/${docente.id}`}>
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Ver detalle</span>
                          </Link>
                        </Button>
                        <TeacherStatusDropdown
                          docenteId={docente.id}
                          currentStatus={docente.estadoCuenta}
                        />
                      </div>
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
