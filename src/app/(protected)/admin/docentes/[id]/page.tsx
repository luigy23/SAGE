import { notFound } from "next/navigation"
import Link from "next/link"
import { getDocenteAdmin } from "@/lib/actions/admin-actions"
import { DocenteDetail } from "@/components/admin/docente-detail"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminDocenteDetailPage({ params }: Props) {
  const { id } = await params
  const docente = await getDocenteAdmin(id)

  if (!docente) notFound()

  return (
    <div className="container mx-auto py-10 max-w-4xl">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/docentes">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Gestión de Docentes
          </Link>
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium">{docente.nombre}</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{docente.nombre}</h1>
        <p className="text-sm text-muted-foreground">{docente.email}</p>
      </div>

      <DocenteDetail docente={docente} />
    </div>
  )
}
