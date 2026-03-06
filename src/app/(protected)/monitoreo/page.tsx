import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ClipboardCheck } from "lucide-react"

export default function MonitoreoPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Monitoreo Agenda Academica (FO-20)</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Proximamente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            El formulario de monitoreo de agenda academica sera implementado
            en la siguiente fase.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
