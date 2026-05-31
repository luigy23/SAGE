"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { crearPeriodoSuperadminAction } from "@/lib/actions/superadmin-periodo-actions"
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Plus, Loader2, CalendarDays } from "lucide-react"
import { toast } from "sonner"

const schema = z.object({
  nombre: z
    .string()
    .min(1, "El nombre es obligatorio.")
    .regex(/^\d{4}-[1-2]$/, "Formato inválido. Use AAAA-S (Ej: 2026-2)."),
  fechaInicio: z.string().min(1, "La fecha de inicio es obligatoria."),
})

type FormValues = z.infer<typeof schema>

interface Props {
  semanasPeriodo: number
}

export function CreatePeriodoSuperadminDialog({ semanasPeriodo }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [fechaFinCalculada, setFechaFinCalculada] = useState<string>("")
  const router = useRouter()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nombre: "", fechaInicio: "" },
  })

  const fechaInicioValue = form.watch("fechaInicio")

  useEffect(() => {
    if (!fechaInicioValue) {
      setFechaFinCalculada("")
      return
    }
    const inicio = new Date(fechaInicioValue)
    if (isNaN(inicio.getTime())) return
    const fin = new Date(inicio.getTime() + semanasPeriodo * 7 * 24 * 60 * 60 * 1000)
    setFechaFinCalculada(
      fin.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    )
  }, [fechaInicioValue, semanasPeriodo])

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = await crearPeriodoSuperadminAction({
        nombre: values.nombre,
        fechaInicio: new Date(values.fechaInicio),
      })
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      toast.success(`Período "${values.nombre}" creado. Ábrelo cuando esté listo.`)
      form.reset()
      setFechaFinCalculada("")
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Crear Período
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Nuevo Período Académico</DialogTitle>
          <DialogDescription>
            Define el semestre. La fecha de fin se calcula automáticamente a partir
            de <span className="font-mono font-semibold">{semanasPeriodo} semanas</span> (parámetro
            global actual). El período se crea como <span className="font-semibold">CERRADO</span> — ábrelo
            explícitamente cuando esté listo.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Período</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: 2026-2" className="font-mono" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                  <span className="ml-1 text-xs">({semanasPeriodo} semanas)</span>
                </span>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  "Crear Período"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
