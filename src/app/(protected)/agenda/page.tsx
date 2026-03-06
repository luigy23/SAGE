import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Calendar } from "lucide-react"

export default function AgendaPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Agenda Semestral (FO-19)</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Proximamente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            El formulario de planificacion de agenda semestral sera
            implementado en la siguiente fase.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
