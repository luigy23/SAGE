import { auth } from "@/lib/auth"
import { getDocentesAdmin } from "@/lib/actions/admin-actions"
import { listUsuarios } from "@/lib/actions/superadmin-actions"
import { TeacherStatusDropdown } from "@/components/admin/teacher-status-dropdown"
import { UsuarioRoleSelector } from "@/components/superadmin/usuario-role-selector"
import { UsuarioEstadoDropdown } from "@/components/superadmin/usuario-estado-dropdown"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getModalidadLabel } from "@/lib/utils/modalidad"
import { getSedeLabel } from "@/lib/utils/sede"
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
import type { Rol } from "@/generated/prisma/client"

type Modalidad = Parameters<typeof getModalidadLabel>[0]

type Fila = {
  id: string
  nombre: string
  email: string
  cedula: string
  facultad: string
  programa: string
  modalidad: Modalidad
  sedeBase: string | null
  createdAt: Date
  estadoCuenta: string
  rol?: string
}

const ROLE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  SUPERADMIN: "default",
  ADMIN: "secondary",
  DOCENTE: "outline",
}

function estadoBadge(estado: string) {
  const map: Record<string, { className: string; label: string }> = {
    ACTIVO: { className: "bg-green-600 hover:bg-green-700 text-white", label: "Activo" },
    PENDIENTE: { className: "bg-yellow-500 hover:bg-yellow-600 text-white", label: "Pendiente" },
    INACTIVO: { className: "bg-red-600 hover:bg-red-700 text-white", label: "Inactivo" },
    RECHAZADO: { className: "bg-orange-500 hover:bg-orange-600 text-white", label: "Rechazado" },
  }
  const cfg = map[estado] ?? { className: "", label: estado }
  return <Badge className={cfg.className}>{cfg.label}</Badge>
}

/**
 * Gestión de Usuarios (unificado). El ADMIN administra el estado de cuenta de los
 * docentes; el SUPERADMIN ve a todos los usuarios y además gestiona su ROL de sistema.
 */
export default async function AdminUsuariosPage() {
  const session = await auth()
  const esSuperadmin = session?.user?.rol === "SUPERADMIN"
  // El SUPERADMIN gestiona el rol en su vista de detalle; el ADMIN ve el detalle del docente.
  const detalleHref = (uid: string) =>
    esSuperadmin ? `/superadmin/usuarios/${uid}` : `/admin/docentes/${uid}`

  const filas: Fila[] = esSuperadmin
    ? (await listUsuarios()).map((u) => ({
        id: u.id,
        nombre: u.nombre,
        email: u.email,
        cedula: u.cedula,
        facultad: u.facultad,
        programa: u.programa,
        modalidad: u.modalidad as Modalidad,
        sedeBase: u.sedeBase,
        createdAt: u.createdAt,
        estadoCuenta: u.estadoCuenta,
        rol: u.rol,
      }))
    : (await getDocentesAdmin()).map((d) => ({
        id: d.id,
        nombre: d.nombre,
        email: d.email,
        cedula: d.cedula,
        facultad: d.facultad,
        programa: d.programa,
        modalidad: d.modalidad as Modalidad,
        sedeBase: d.sedeBase,
        createdAt: d.createdAt,
        estadoCuenta: d.estadoCuenta,
      }))

  return (
    <div className="container mx-auto py-10 max-w-7xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Gestión de Usuarios</CardTitle>
          <CardDescription>
            {esSuperadmin
              ? "Administra el estado de cuenta y el rol de sistema (DOCENTE / ADMIN / SUPERADMIN) de cada usuario."
              : "Administra los accesos y el estado de los docentes. Deben ser aprobados antes de planificar agendas (FO-19)."}
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
                  {esSuperadmin && <TableHead>Rol</TableHead>}
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={esSuperadmin ? 8 : 7} className="h-24 text-center text-muted-foreground">
                      No hay usuarios registrados en el sistema.
                    </TableCell>
                  </TableRow>
                )}
                {filas.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <Link href={detalleHref(f.id)} className="hover:underline font-medium">
                          {f.nombre}
                        </Link>
                        <span className="text-xs text-muted-foreground">{f.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{f.cedula}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">{f.facultad}</span>
                        <span className="text-xs text-muted-foreground">{f.programa}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 items-start">
                        <Badge variant="outline" className="text-[10px]">
                          {getModalidadLabel(f.modalidad)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{getSedeLabel(f.sedeBase)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(f.createdAt), "dd MMM yyyy", { locale: es })}
                    </TableCell>
                    {esSuperadmin && (
                      <TableCell>
                        <UsuarioRoleSelector
                          usuarioId={f.id}
                          rol={(f.rol ?? "DOCENTE") as Rol}
                          variant={ROLE_VARIANT[f.rol ?? "DOCENTE"] ?? "outline"}
                        />
                      </TableCell>
                    )}
                    <TableCell>{estadoBadge(f.estadoCuenta)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <Link href={detalleHref(f.id)}>
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Ver detalle</span>
                          </Link>
                        </Button>
                        {esSuperadmin ? (
                          <UsuarioEstadoDropdown usuarioId={f.id} currentStatus={f.estadoCuenta} />
                        ) : (
                          <TeacherStatusDropdown docenteId={f.id} currentStatus={f.estadoCuenta} />
                        )}
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
