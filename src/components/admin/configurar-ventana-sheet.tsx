"use client"

import { useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  configurarVentanaAgendaAction,
  configurarVentanaMonitoreoAction,
} from "@/lib/actions/periodo-actions"
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
import { Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"

const schema = z
  .object({
    desde: z.string().optional(),
    hasta: z.string().optional(),
  })
  .refine(
    (d) => {
      if (d.desde && d.hasta) return new Date(d.hasta) > new Date(d.desde)
      return true
    },
    { message: "El cierre debe ser posterior a la apertura.", path: ["hasta"] }
  )

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  periodoId: string
  periodoNombre: string
  tipo: "AGENDA" | "MONITOREO"
  initialDesde: Date | null
  initialHasta: Date | null
}

function toInputDt(d: Date | null): string {
  if (!d) return ""
  return d.toISOString().slice(0, 16)
}

export function ConfigurarVentanaSheet({
  open,
  onOpenChange,
  periodoId,
  periodoNombre,
  tipo,
  initialDesde,
  initialHasta,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const label = tipo === "AGENDA" ? "FO-19 (Agenda)" : "FO-20 (Monitoreo)"
  const action =
    tipo === "AGENDA" ? configurarVentanaAgendaAction : configurarVentanaMonitoreoAction

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { desde: toInputDt(initialDesde), hasta: toInputDt(initialHasta) },
  })

  useEffect(() => {
    if (open) {
      form.reset({ desde: toInputDt(initialDesde), hasta: toInputDt(initialHasta) })
    }
  }, [open, initialDesde, initialHasta, form])

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const desde = values.desde ? new Date(values.desde) : null
      const hasta = values.hasta ? new Date(values.hasta) : null
      const result = await action(periodoId, { desde, hasta })
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      toast.success(`Ventana ${label} actualizada.`)
      onOpenChange(false)
      router.refresh()
    })
  }

  function handleLimpiar() {
    startTransition(async () => {
      const result = await action(periodoId, { desde: null, hasta: null })
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      toast.success("Ventana limpiada.")
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[480px]">
        <SheetHeader>
          <SheetTitle>
            Ventana {label}
            <span className="ml-2 font-mono text-sm font-normal text-muted-foreground">
              {periodoNombre}
            </span>
          </SheetTitle>
          <SheetDescription>
            Define cuándo los docentes pueden diligenciar{" "}
            {tipo === "AGENDA" ? "la Agenda Semestral" : "el Monitoreo"}. El sistema
            enforza el acceso automáticamente — no se requiere apertura o cierre manual.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <FormField
              control={form.control}
              name="desde"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apertura</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="hasta"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cierre</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <SheetFooter className="mt-6 flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive sm:mr-auto"
                onClick={handleLimpiar}
                disabled={isPending}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Limpiar fechas
              </Button>
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
                  "Guardar"
                )}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
