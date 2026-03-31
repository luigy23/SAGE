import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { ClipboardCheck, Save, Send } from "lucide-react"

export default function MonitoreoPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      
      {/* Encabezado Principal */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ClipboardCheck className="h-8 w-8 text-primary" />
          Monitoreo de Agenda Académica (FO-20)
        </h1>
        <p className="text-muted-foreground">
          Reporte de ejecución de actividades planificadas en el semestre.
        </p>
      </div>

      {/* Tarjeta de Información del Docente (Precargada visualmente) */}
      <Card className="bg-muted/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Información General</CardTitle>
          <CardDescription>Estos datos se asocian automáticamente a su perfil.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label>Período Académico</Label>
            <Input disabled value="2026-1" className="bg-background" />
          </div>
          <div className="space-y-1">
            <Label>Estado del Reporte</Label>
            <Input disabled value="Borrador" className="bg-background" />
          </div>
          <div className="space-y-1">
            <Label>Fecha de Actualización</Label>
            <Input disabled value={new Date().toLocaleDateString()} className="bg-background" />
          </div>
        </CardContent>
      </Card>

      {/* Sección I: Actividades Académicas Básicas */}
      <Card>
        <CardHeader>
          <CardTitle>Sección I - Actividades Académicas Básicas</CardTitle>
          <CardDescription>
            Detalle la ejecución de sus clases teóricas, prácticas y asesorías. (Se precargará desde la FO-19).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 p-4 border rounded-lg bg-card">
            <div className="space-y-2">
              <Label htmlFor="act-basica-1">Actividades Desarrolladas</Label>
              {/* Aquí simulamos que ya se trajo el dato de la Agenda */}
              <Textarea 
                id="act-basica-1" 
                defaultValue="Curso: Arquitectura de Sistemas (Subgrupo A) - 4 horas presenciales/semana." 
                className="min-h-[80px]"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="periodo-1">Período de Ejecución</Label>
                <Input id="periodo-1" placeholder="Ej: Febrero - Junio" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="obs-1">Observaciones / Novedades</Label>
                <Input id="obs-1" placeholder="Novedades sobre la asistencia o temario..." />
              </div>
            </div>
          </div>
          
          <Button variant="outline" className="w-full border-dashed">
            + Añadir otra actividad básica manualmente
          </Button>
        </CardContent>
      </Card>

      {/* Sección II: Actividades Complementarias */}
      <Card>
        <CardHeader>
          <CardTitle>Sección II - Actividades Académicas Complementarias</CardTitle>
          <CardDescription>
            Reporte de preparación de clases, evaluación, y atención a estudiantes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           {/* Estructura vacía para que el profesor llene */}
          <div className="grid gap-4 p-4 border rounded-lg bg-card">
             <div className="space-y-2">
              <Label>Actividades Desarrolladas</Label>
              <Textarea placeholder="Describa las actividades realizadas..." className="min-h-[80px]" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                <Label>Período de Ejecución</Label>
                <Input placeholder="Ej: Semestre completo" />
              </div>
               <div className="space-y-2">
                <Label>Observaciones</Label>
                <Input placeholder="Comentarios adicionales" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botones de Acción (Guardar/Enviar) */}
      <div className="flex justify-end gap-4 pt-4">
        <Button variant="secondary" className="gap-2">
          <Save className="h-4 w-4" />
          Guardar Borrador
        </Button>
        <Button className="gap-2">
          <Send className="h-4 w-4" />
          Enviar Reporte Definitivo
        </Button>
      </div>

    </div>
  )
}
