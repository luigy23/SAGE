"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Pencil } from "lucide-react"
import { toast } from "sonner"
import { updateParametroGlobal } from "@/lib/actions/superadmin-actions"

type Parametro = {
  id: string
  clave: string
  valor: string
  tipo: string
  descripcion: string | null
  articuloOrigen: string | null
}

export function EditParametroDialog({ parametro }: { parametro: Parametro }) {
  const [open, setOpen] = useState(false)
  const [valor, setValor] = useState(parametro.valor)
  const [pending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      const res = await updateParametroGlobal(parametro.id, valor)
      if ("error" in res) {
        toast.error(res.error)
      } else {
        toast.success(`"${parametro.clave}" actualizado`)
        setOpen(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar parámetro</DialogTitle>
          <DialogDescription>
            <span className="font-mono text-xs">{parametro.clave}</span>
            {parametro.articuloOrigen && (
              <span className="ml-2 text-xs">— {parametro.articuloOrigen}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {parametro.descripcion && (
            <p className="text-sm text-muted-foreground">{parametro.descripcion}</p>
          )}

          <div className="space-y-2">
            <Label htmlFor="valor">Valor ({parametro.tipo})</Label>
            <Input
              id="valor"
              type={parametro.tipo === "int" || parametro.tipo === "float" ? "number" : "text"}
              step={parametro.tipo === "float" ? "any" : undefined}
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              autoFocus
            />
            {parametro.tipo === "bool" && (
              <p className="text-xs text-muted-foreground">
                Use exactamente <code>true</code> o <code>false</code>.
              </p>
            )}
          </div>

          <div className="rounded-md border bg-muted/30 p-3 text-xs">
            <p className="font-semibold">Antes</p>
            <p className="font-mono">{parametro.valor}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={pending || valor === parametro.valor}>
            {pending ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
