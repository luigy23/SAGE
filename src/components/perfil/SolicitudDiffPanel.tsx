import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  CAMPOS_EDITABLES,
  ETIQUETAS_CAMPOS,
  type CampoEditable,
} from "@/lib/schemas/solicitud-perfil-schema"
import { ArrowRight } from "lucide-react"

function formatValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—"
  if (typeof v === "boolean") return v ? "Sí" : "No"
  return String(v)
}

export function SolicitudDiffPanel({
  camposAntes,
  camposDespues,
}: {
  camposAntes: Record<string, unknown>
  camposDespues: Record<string, unknown>
}) {
  const cambiados = CAMPOS_EDITABLES.filter(
    (campo) => campo in camposDespues,
  ) as CampoEditable[]

  if (cambiados.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          Esta solicitud no contiene cambios registrados.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cambios solicitados</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-medium text-muted-foreground">Campo</th>
                <th className="pb-2 font-medium text-muted-foreground">Antes</th>
                <th className="pb-2 font-medium text-muted-foreground" />
                <th className="pb-2 font-medium text-muted-foreground">
                  Después
                </th>
              </tr>
            </thead>
            <tbody>
              {cambiados.map((campo) => (
                <tr key={campo} className="border-b last:border-b-0">
                  <td className="py-2 pr-4 font-medium">
                    {ETIQUETAS_CAMPOS[campo]}
                  </td>
                  <td className="py-2 pr-4">
                    <Badge variant="outline" className="font-mono">
                      {formatValue(camposAntes[campo])}
                    </Badge>
                  </td>
                  <td className="py-2 pr-2 text-muted-foreground">
                    <ArrowRight className="h-4 w-4" />
                  </td>
                  <td className="py-2">
                    <Badge className="font-mono bg-emerald-600 hover:bg-emerald-700">
                      {formatValue(camposDespues[campo])}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
