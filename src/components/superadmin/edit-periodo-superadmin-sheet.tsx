"use client"

import { useTransition, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { editarPeriodoSuperadminAction } from "@/lib/actions/superadmin-periodo-actions"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Loader2, CalendarDays } from "lucide-react"
import { toast } from "sonner"

const schema = z.object({
  fechaInicio: z.string().min(1, "La fecha de inicio es obligatoria."),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  periodo: {
    id: string
    nombre: string
    fechaInicio: Date
  }
  semanasPeriodo: number
}

function toInputDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

export function EditPeriodoSuperadminSheet({ open, onOpenChange, periodo, semanasPeriodo }: Props) {
  const [isPending, startTransition] = useTransition()
  const [fechaFinCalculada, setFechaFinCalculada] = useState<string>("")
  const router = useRouter()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fechaInicio: toInputDate(periodo.fechaInicio) },
  })

  const fechaInicioValue = form.watch("fechaInicio")

  useEffect(() => {
    if (open) {
      form.reset({ fechaInicio: toInputDate(periodo.fechaInicio) })
    }
  }, [open, periodo.fechaInicio, form])

  useEffect(() => {
    if (!fechaInicioValue) { setFechaFinCalculada(""); return }
    const inicio = new Date(fechaInicioValue)
    if (isNaN(inicio.getTime())) return
    const fin = new Date(inicio.getTime() + semanasPeriodo * 7 * 24 * 60 * 60 * 1000)
    setFechaFinCalculada(
      fin.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    )
  }, [fechaInicioValue, semanasPeriodo])

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const fechaInicio = new Date(values.fechaInicio)
      const fechaFin = new Date(fechaInicio.getTime() + semanasPeriodo * 7 * 24 * 60 * 60 * 1000)
      const result = await editarPeriodoSuperadminAction(periodo.id, { fechaInicio, fechaFin })
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      toast.success("Fechas del período actualizadas.")
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[480px]">
        <SheetHeader>
          <SheetTitle>Editar Período <span className="font-mono">{periodo.nombre}</span></SheetTitle>
          <SheetDescription>
            Modifica la fecha de inicio. La fecha de fin se recalcula a partir de{" "}
            <span className="font-mono font-semibold">{semanasPeriodo} semanas</span>.
            Solo disponible si no hay agendas enviadas o aprobadas.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <FormField
              control={form.control}
              name="fechaInicio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de Inicio del Semestre</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {fechaFinCalculada && (
              <div className="flex items-start gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Fecha de fin calculada:{" "}
                  <span className="font-medium text-foreground">{fechaFinCalculada}</span>
                </span>
              </div>
            )}

            <SheetFooter className="mt-6 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar Cambios"
                )}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
