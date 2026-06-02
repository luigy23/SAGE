"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Save, Plane } from "lucide-react"
import { actualizarTerminosInvitadoAction } from "@/lib/actions/invitado-actions"

/**
 * Captura de los términos OPERATIVOS de la vinculación del invitado (Art. 4f) por
 * el Jefe/Decano al crear su agenda. Al guardar, se recarga la página para que el
 * tope de la agenda (= horas contratadas) se recalcule. El estado "Autorizado por
 * el Consejo Académico" es de solo lectura aquí (lo gestiona el SUPERADMIN).
 */
export function TerminosInvitadoForm({
  docenteId,
  invObjeto,
  invFechaDesde,
  invFechaHasta,
  invHorasContratadas,
  invAutorizadoCA,
}: {
  docenteId: string
  invObjeto: string
  invFechaDesde: string
  invFechaHasta: string
  invHorasContratadas: number | null
  invAutorizadoCA: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [objeto, setObjeto] = useState(invObjeto)
  const [desde, setDesde] = useState(invFechaDesde)
  const [hasta, setHasta] = useState(invFechaHasta)
  const [horas, setHoras] = useState<string>(
    invHorasContratadas != null ? String(invHorasContratadas) : "",
  )

  function handleSave() {
    startTransition(async () => {
      const res = await actualizarTerminosInvitadoAction(docenteId, {
        invObjeto: objeto.trim() || null,
        invFechaDesde: desde || null,
        invFechaHasta: hasta || null,
        invHorasContratadas: horas.trim() === "" ? null : Number(horas),
      })
      if ("error" in res) {
        toast.error(res.error)
      } else {
        toast.success("Términos de la invitación guardados. El tope se actualizó.")
        router.refresh()
      }
    })
  }

  return (
    <Card className="border-blue-300 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Plane className="h-4 w-4" />
          Términos de la invitación (Art. 4f)
        </CardTitle>
        <CardDescription>
          Define qué vino a hacer, su duración (puede ser de días) y las horas contratadas, que
          son la base del 100% y el tope de la agenda. La autorización del Consejo Académico la
          confirma el SuperAdmin.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Objeto de la invitación</Label>
          <Input
            value={objeto}
            onChange={(e) => setObjeto(e.target.value)}
            placeholder="Ej: Seminario doctoral en IA, módulo de 3 días"
            maxLength={500}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Desde</Label>
            <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Hasta</Label>
            <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Horas contratadas (tope)</Label>
            <Input
              type="number"
              min={1}
              max={4000}
              value={horas}
              onChange={(e) => setHoras(e.target.value)}
              placeholder="Ej: 30"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            Consejo Académico:
            <Badge variant={invAutorizadoCA ? "default" : "secondary"}>
              {invAutorizadoCA ? "Autorizado" : "Pendiente (lo confirma el SuperAdmin)"}
            </Badge>
          </span>
          <Button onClick={handleSave} disabled={isPending} size="sm" className="gap-2">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isPending ? "Guardando…" : "Guardar términos"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
