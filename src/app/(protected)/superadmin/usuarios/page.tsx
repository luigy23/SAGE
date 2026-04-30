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
import { UsuarioRoleSelector } from "@/components/superadmin/usuario-role-selector"
import { UsuarioEstadoSelector } from "@/components/superadmin/usuario-estado-selector"

const ROLE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  SUPERADMIN: "default",
  ADMIN: "secondary",
  DOCENTE: "outline",
}

export default async function UsuariosPage() {
  const usuarios = await listUsuarios()

  return (
    <div className="container mx-auto py-10 max-w-6xl">
      <Card>
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-2xl font-bold">Usuarios y Roles</CardTitle>
          <CardDescription>
            Gestiona el rol (DOCENTE / ADMIN / SUPERADMIN) y el estado de cuenta
            (PENDIENTE / ACTIVO / INACTIVO) de cada usuario del sistema.
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
                  <TableHead>Email</TableHead>
                  <TableHead>Modalidad</TableHead>
                  <TableHead>Programa</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No hay usuarios registrados.
                    </TableCell>
                  </TableRow>
                )}
                {usuarios.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.nombre}</TableCell>
                    <TableCell className="font-mono text-sm">{u.cedula}</TableCell>
                    <TableCell className="text-sm">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{u.modalidad}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{u.programa}</TableCell>
                    <TableCell>
                      <UsuarioRoleSelector
                        usuarioId={u.id}
                        rol={u.rol}
                        variant={ROLE_VARIANT[u.rol] ?? "outline"}
                      />
                    </TableCell>
                    <TableCell>
                      <UsuarioEstadoSelector usuarioId={u.id} estado={u.estadoCuenta} />
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
