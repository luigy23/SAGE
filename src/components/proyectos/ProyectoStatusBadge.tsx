import { Badge } from "@/components/ui/badge"
import { Clock, CheckCircle2, XCircle, FileText } from "lucide-react"
import type { EstadoFormulario } from "@/generated/prisma/client"

export function ProyectoStatusBadge({
  estado,
}: {
  estado: EstadoFormulario | string
}) {
  if (estado === "APROBADO") {
    return (
      <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-700">
        <CheckCircle2 className="h-3 w-3" />
        Aprobado
      </Badge>
    )
  }
  if (estado === "RECHAZADO") {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        Rechazado
      </Badge>
    )
  }
  if (estado === "ENVIADO") {
    return (
      <Badge className="gap-1 bg-amber-500 hover:bg-amber-600">
        <Clock className="h-3 w-3" />
        En revisión
      </Badge>
    )
  }
  // BORRADOR
  return (
    <Badge variant="secondary" className="gap-1">
      <FileText className="h-3 w-3" />
      Borrador
    </Badge>
  )
}
