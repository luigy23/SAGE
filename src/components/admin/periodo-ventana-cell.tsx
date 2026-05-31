"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ConfigurarVentanaSheet } from "./configurar-ventana-sheet"
import { Settings } from "lucide-react"

export type VentanaEstado = "SIN_CONFIGURAR" | "PROXIMA" | "ABIERTA" | "CERRADA"

interface Props {
  periodoId: string
  periodoNombre: string
  tipo: "AGENDA" | "MONITOREO"
  initialDesde: Date | null
  initialHasta: Date | null
  estado: VentanaEstado
  label: string
}

function formatFechaCorta(d: Date): string {
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "short" })
}

function EstadoText({ estado, desde, hasta }: { estado: VentanaEstado; desde: Date | null; hasta: Date | null }) {
  if (estado === "ABIERTA" && hasta) {
    return (
      <span className="text-green-600 dark:text-green-400 font-medium">
        ● Abierta hasta {formatFechaCorta(hasta)}
      </span>
    )
  }
  if (estado === "PROXIMA" && desde) {
    return (
      <span className="text-blue-600 dark:text-blue-400">
        ◷ Abre {formatFechaCorta(desde)}
      </span>
    )
  }
  if (estado === "CERRADA" && hasta) {
    return (
      <span className="text-muted-foreground">
        ○ Cerró {formatFechaCorta(hasta)}
      </span>
    )
  }
  return <span className="text-muted-foreground">○ Sin configurar</span>
}

export function PeriodoVentanaCell({
  periodoId,
  periodoNombre,
  tipo,
  initialDesde,
  initialHasta,
  estado,
  label,
}: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="flex items-center gap-1">
        <span className="text-xs">
          <EstadoText estado={estado} desde={initialDesde} hasta={initialHasta} />
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={() => setOpen(true)}
          title={`Configurar ventana ${label}`}
        >
          <Settings className="h-3 w-3" />
        </Button>
      </div>
      <ConfigurarVentanaSheet
        open={open}
        onOpenChange={setOpen}
        periodoId={periodoId}
        periodoNombre={periodoNombre}
        tipo={tipo}
        initialDesde={initialDesde}
        initialHasta={initialHasta}
      />
    </>
  )
}
