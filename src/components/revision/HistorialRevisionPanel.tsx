import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Pencil, History } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

type Rehabilitacion = {
  id: string
  motivo: string
  observaciones: string | null
  estadoOriginal: string
  fecha: Date
  rehabilitadoPor: string
}

type Edicion = {
  id: string
  accion: string
  campo: string | null
  observaciones: string | null
  fecha: Date
  editorId: string
}

type Actor = { id: string; nombre: string; rol: string }

export function HistorialRevisionPanel({
  rehabilitaciones,
  ediciones,
  actores,
}: {
  rehabilitaciones: Rehabilitacion[]
  ediciones: Edicion[]
  actores: Actor[]
}) {
  const byId = new Map(actores.map((a) => [a.id, a]))

  // Mezcla cronológica
  const eventos = [
    ...rehabilitaciones.map((r) => ({
      kind: "rehab" as const,
      fecha: r.fecha,
      data: r,
    })),
    ...ediciones.map((e) => ({
      kind: "edit" as const,
      fecha: e.fecha,
      data: e,
    })),
  ].sort((a, b) => b.fecha.getTime() - a.fecha.getTime())

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" />
          Historial de revisión
          <Badge variant="outline" className="ml-auto text-xs">
            {eventos.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {eventos.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Sin eventos de revisión registrados.
          </p>
        ) : (
          <ol className="space-y-3">
            {eventos.map((ev) => {
              const actor = byId.get(
                ev.kind === "rehab" ? ev.data.rehabilitadoPor : ev.data.editorId,
              )
              return (
                <li
                  key={`${ev.kind}-${ev.data.id}`}
                  className="rounded-md border bg-muted/30 p-3 text-sm"
                >
                  <div className="mb-1 flex items-center gap-2">
                    {ev.kind === "rehab" ? (
                      <RefreshCw className="h-3.5 w-3.5 text-yellow-600" />
                    ) : (
                      <Pencil className="h-3.5 w-3.5 text-blue-600" />
                    )}
                    <span className="font-medium">
                      {ev.kind === "rehab" ? "Rehabilitación" : "Edición admin"}
                    </span>
                    {ev.kind === "edit" && (
                      <Badge variant="outline" className="text-[10px]">
                        {ev.data.accion}
                      </Badge>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {format(new Date(ev.fecha), "dd MMM yyyy HH:mm", { locale: es })}
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Por:{" "}
                    <span className="font-medium text-foreground">
                      {actor?.nombre ?? "—"}
                    </span>{" "}
                    {actor && (
                      <Badge variant="outline" className="ml-1 text-[10px]">
                        {actor.rol}
                      </Badge>
                    )}
                  </div>

                  {ev.kind === "rehab" && (
                    <>
                      <p className="mt-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          Motivo:
                        </span>{" "}
                        {ev.data.motivo}
                      </p>
                      {ev.data.observaciones && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {ev.data.observaciones}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        Estado anterior:{" "}
                        <span className="font-mono">{ev.data.estadoOriginal}</span>
                      </p>
                    </>
                  )}

                  {ev.kind === "edit" && (
                    <>
                      {ev.data.campo && (
                        <p className="mt-1 text-xs">
                          Campo:{" "}
                          <span className="font-mono">{ev.data.campo}</span>
                        </p>
                      )}
                      {ev.data.observaciones && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {ev.data.observaciones}
                        </p>
                      )}
                    </>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
