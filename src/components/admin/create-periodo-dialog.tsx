"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { crearPeriodo } from "@/lib/actions/periodo-actions"
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
import { Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"

// =====================================================================
// ZOD SCHEMA — Validación estricta del formulario (Zod v4)
// =====================================================================
const createPeriodoSchema = z
  .object({
    nombre: z
      .string()
      .min(1, "El nombre del período es obligatorio.")
      .regex(
        /^\d{4}-[1-2]$/,
        "Formato inválido. Use el formato AAAA-S (Ej: 2026-1)."
      ),
    fechaInicio: z.string().min(1, "La fecha de inicio es obligatoria."),
    fechaFin: z.string().min(1, "La fecha de fin es obligatoria."),
  })
  .refine(
    (data) => {
      if (!data.fechaInicio || !data.fechaFin) return true
      return new Date(data.fechaFin) > new Date(data.fechaInicio)
    },
    {
      message: "La fecha de fin debe ser posterior a la fecha de inicio.",
      path: ["fechaFin"],
    }
  )

type CreatePeriodoFormValues = z.infer<typeof createPeriodoSchema>

export function CreatePeriodoDialog() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const form = useForm<CreatePeriodoFormValues>({
    resolver: zodResolver(createPeriodoSchema),
    defaultValues: {
      nombre: "",
      fechaInicio: "",
      fechaFin: "",
    },
  })

  function onSubmit(values: CreatePeriodoFormValues) {
    startTransition(async () => {
      try {
        await crearPeriodo({
          nombre: values.nombre,
          fechaInicio: new Date(values.fechaInicio),
          fechaFin: new Date(values.fechaFin),
        })
        toast.success("Período académico creado exitosamente.")
        form.reset()
        setOpen(false)
        router.refresh()
      } catch (error: any) {
        toast.error(error.message || "Error al crear el período.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button id="btn-crear-periodo">
          <Plus className="mr-2 h-4 w-4" />
          Crear Período
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Nuevo Período Académico</DialogTitle>
          <DialogDescription>
            Define un nuevo período académico. Mientras esté ABIERTO, los docentes
            podrán planificar su agenda (FO-19) para este período.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Nombre del Período */}
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Período</FormLabel>
                  <FormControl>
                    <Input
                      id="input-nombre-periodo"
                      placeholder="Ej: 2026-1"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fecha Inicio */}
            <FormField
              control={form.control}
              name="fechaInicio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de Inicio</FormLabel>
                  <FormControl>
                    <Input
                      id="input-fecha-inicio"
                      type="date"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fecha Fin */}
            <FormField
              control={form.control}
              name="fechaFin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de Fin</FormLabel>
                  <FormControl>
                    <Input
                      id="input-fecha-fin"
                      type="date"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending} id="btn-submit-periodo">
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  "Guardar Período"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
