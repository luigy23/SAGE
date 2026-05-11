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
import { RehabilitarMonitoreoDialog } from "./RehabilitarMonitoreoDialog"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Eye } from "lucide-react"
import type { MonitoreoRow } from "@/lib/actions/revision"

const estadoBadge = (estado: string): "default" | "secondary" | "destructive" | "outline" => {
  if (estado === "ENVIADO") return "default"
  if (estado === "BORRADOR") return "secondary"
  if (estado === "APROBADO") return "default"
  if (estado === "RECHAZADO") return "destructive"
  return "outline"
}

export function RevisionMonitoreoTable({ items }: { items: MonitoreoRow[] }) {
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
                No hay monitoreos que coincidan con los filtros.
              </TableCell>
            </TableRow>
          )}
          {items.map((m) => (
            <TableRow key={m.id}>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{m.docente.nombre}</span>
                  <span className="text-xs text-muted-foreground">
                    {m.docente.email}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {m.docente.modalidad}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">{m.docente.programa}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {m.docente.sedeBase}
              </TableCell>
              <TableCell className="font-mono text-sm">{m.periodo}</TableCell>
              <TableCell>
                <Badge
                  variant={estadoBadge(m.estado)}
                  className={
                    m.estado === "ENVIADO"
                      ? "bg-green-600 hover:bg-green-600"
                      : m.estado === "APROBADO"
                        ? "bg-blue-600 hover:bg-blue-600"
                        : ""
                  }
                >
                  {m.estado}
                </Badge>
                {m.rehabilitada && (
                  <Badge variant="outline" className="ml-1 text-[10px]">
                    rehab
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-center tabular-nums">
                {m.rehabilitadaCount}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {format(new Date(m.updatedAt), "dd MMM yyyy HH:mm", { locale: es })}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <Button asChild variant="ghost" size="sm" className="gap-1.5">
                    <Link href={`/admin/revision/monitoreos/${m.id}`}>
                      <Eye className="h-3.5 w-3.5" />
                      Ver
                    </Link>
                  </Button>
                  {m.estado === "ENVIADO" && (
                    <RehabilitarMonitoreoDialog
                      monitoreoId={m.id}
                      docenteName={m.docente.nombre}
                      periodo={m.periodo}
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
