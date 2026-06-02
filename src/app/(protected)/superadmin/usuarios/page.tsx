import { getSedeLabel } from "@/lib/utils/sede"
import { listUsuarios } from "@/lib/actions/superadmin-actions"
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
import { Button } from "@/components/ui/button"
import { UsuarioRoleSelector } from "@/components/superadmin/usuario-role-selector"
import { UsuarioEstadoDropdown } from "@/components/superadmin/usuario-estado-dropdown"
import { getModalidadLabel } from "@/lib/utils/modalidad"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"
import { Eye } from "lucide-react"

const ROLE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  SUPERADMIN: "default",
  ADMIN: "secondary",
  DOCENTE: "outline",
}

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

export default async function UsuariosPage() {
  const usuarios = await listUsuarios()

  return (
    <div className="container mx-auto py-10 max-w-7xl">
      <Card>
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-2xl font-bold">Usuarios y Roles</CardTitle>
          <CardDescription>
            Gestiona el rol (DOCENTE / ADMIN / SUPERADMIN) y el estado de cuenta de cada usuario.
            Jerarquía: SUPERADMIN &gt; ADMIN &gt; DOCENTE.
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
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      No hay usuarios registrados.
                    </TableCell>
                  </TableRow>
                )}
                {usuarios.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <Link
                          href={`/superadmin/usuarios/${u.id}`}
                          className="hover:underline font-medium"
                        >
                          {u.nombre}
                        </Link>
                        <span className="text-xs text-muted-foreground">{u.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{u.cedula}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">{u.facultad}</span>
                        <span className="text-xs text-muted-foreground">{u.programa}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 items-start">
                        <Badge variant="outline" className="text-[10px]">
                          {getModalidadLabel(u.modalidad as any)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{getSedeLabel(u.sedeBase)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(u.createdAt), "dd MMM yyyy", { locale: es })}
                    </TableCell>
                    <TableCell>
                      <UsuarioRoleSelector
                        usuarioId={u.id}
                        rol={u.rol}
                        variant={ROLE_VARIANT[u.rol] ?? "outline"}
                      />
                    </TableCell>
                    <TableCell>
                      {estadoBadge(u.estadoCuenta)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <Link href={`/superadmin/usuarios/${u.id}`}>
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Ver detalle</span>
                          </Link>
                        </Button>
                        <UsuarioEstadoDropdown usuarioId={u.id} currentStatus={u.estadoCuenta} />
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
