import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RehabilitarAgendaDialog } from "./RehabilitarAgendaDialog"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Eye } from "lucide-react"
import type { AgendaRow } from "@/lib/actions/revision"

const estadoBadge = (estado: string): "default" | "secondary" | "destructive" | "outline" => {
  if (estado === "ENVIADO") return "default"
  if (estado === "BORRADOR") return "secondary"
  if (estado === "APROBADO") return "default"
  if (estado === "RECHAZADO") return "destructive"
  return "outline"
}

export function RevisionAgendaTable({ items }: { items: AgendaRow[] }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Docente</TableHead>
            <TableHead>Modalidad</TableHead>
            <TableHead>Programa</TableHead>
            <TableHead>Sede</TableHead>
            <TableHead>Periodo</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-center">Rehab.</TableHead>
            <TableHead>Última actualización</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                No hay agendas que coincidan con los filtros.
              </TableCell>
            </TableRow>
          )}
          {items.map((a) => (
            <TableRow key={a.id}>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{a.docente.nombre}</span>
                  <span className="text-xs text-muted-foreground">
                    {a.docente.email}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {a.docente.modalidad}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">{a.docente.programa}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {a.docente.sedeBase}
              </TableCell>
              <TableCell className="font-mono text-sm">{a.periodo}</TableCell>
              <TableCell>
                <Badge
                  variant={estadoBadge(a.estado)}
                  className={
                    a.estado === "ENVIADO"
                      ? "bg-green-600 hover:bg-green-600"
                      : a.estado === "APROBADO"
                        ? "bg-blue-600 hover:bg-blue-600"
                        : ""
                  }
                >
                  {a.estado}
                </Badge>
                {a.rehabilitada && (
                  <Badge variant="outline" className="ml-1 text-[10px]">
                    rehab
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-center tabular-nums">
                {a.rehabilitadaCount}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {format(new Date(a.updatedAt), "dd MMM yyyy HH:mm", { locale: es })}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <Button asChild variant="ghost" size="sm" className="gap-1.5">
                    <Link href={`/admin/revision/agendas/${a.id}`}>
                      <Eye className="h-3.5 w-3.5" />
                      Ver
                    </Link>
                  </Button>
                  {a.estado === "ENVIADO" && (
                    <RehabilitarAgendaDialog
                      agendaId={a.id}
                      docenteName={a.docente.nombre}
                      periodo={a.periodo}
                    />
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
