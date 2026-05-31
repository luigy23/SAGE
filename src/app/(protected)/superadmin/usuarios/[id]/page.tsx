import { notFound } from "next/navigation"
import Link from "next/link"
import { getUsuarioSuperadmin } from "@/lib/actions/superadmin-actions"
import { UsuarioDetail } from "@/components/superadmin/usuario-detail"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

interface Props {
  params: Promise<{ id: string }>
}

export default async function SuperadminUsuarioDetailPage({ params }: Props) {
  const { id } = await params
  const usuario = await getUsuarioSuperadmin(id)

  if (!usuario) notFound()

  return (
    <div className="container mx-auto py-10 max-w-4xl">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/superadmin/usuarios">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Usuarios y Roles
          </Link>
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium">{usuario.nombre}</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{usuario.nombre}</h1>
        <p className="text-sm text-muted-foreground">{usuario.email}</p>
      </div>

      <UsuarioDetail usuario={usuario} />
    </div>
  )
}
