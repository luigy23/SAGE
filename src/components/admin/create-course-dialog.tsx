"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { crearCursoMaestro } from "@/lib/actions/curso-maestro-actions"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"

// =====================================================================
// ZOD SCHEMA — Validación estricta del formulario
// =====================================================================
const createCourseSchema = z.object({
  codigo: z
    .string()
    .min(1, "El código es obligatorio.")
    .max(20, "Máximo 20 caracteres."),
  nombre: z
    .string()
    .min(1, "El nombre es obligatorio.")
    .max(150, "Máximo 150 caracteres."),
  creditos: z
    .number({ message: "Debe ser un número válido." })
    .int({ message: "Debe ser un número entero." })
    .min(1, "Mínimo 1 crédito.")
    .max(12, "Máximo 12 créditos."),
  tipo: z.enum(["TEORICO", "TEORICO_PRACTICO"], {
    message: "Selecciona el tipo de curso.",
  }),
})

type CreateCourseFormValues = z.infer<typeof createCourseSchema>

export function CreateCourseDialog() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const form = useForm<CreateCourseFormValues>({
    resolver: zodResolver(createCourseSchema),
    defaultValues: {
      codigo: "",
      nombre: "",
      creditos: 1,
      tipo: undefined,
    },
  })

  function onSubmit(values: CreateCourseFormValues) {
    startTransition(async () => {
      try {
        await crearCursoMaestro(values)
        toast.success("Curso creado exitosamente.")
        form.reset()
        setOpen(false)
        router.refresh()
      } catch (error: any) {
        toast.error(error.message || "Error al crear el curso.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button id="btn-crear-curso">
          <Plus className="mr-2 h-4 w-4" />
          Crear Curso
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Nuevo Curso Maestro</DialogTitle>
          <DialogDescription>
            Agrega un nuevo curso al catálogo oficial. Los docentes podrán
            seleccionarlo al planificar su agenda (FO-19).
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Código */}
            <FormField
              control={form.control}
              name="codigo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código</FormLabel>
                  <FormControl>
                    <Input
                      id="input-codigo-curso"
                      placeholder="Ej: MAT101"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Nombre */}
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Curso</FormLabel>
                  <FormControl>
                    <Input
                      id="input-nombre-curso"
                      placeholder="Ej: Cálculo Diferencial"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Créditos */}
            <FormField
              control={form.control}
              name="creditos"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Créditos</FormLabel>
                  <FormControl>
                    <Input
                      id="input-creditos-curso"
                      type="number"
                      min={1}
                      max={12}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tipo de Curso */}
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Curso</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger id="select-tipo-curso">
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="TEORICO">Teórico</SelectItem>
                      <SelectItem value="TEORICO_PRACTICO">
                        Teórico - Práctico
                      </SelectItem>
                    </SelectContent>
                  </Select>
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
              <Button type="submit" disabled={isPending} id="btn-submit-curso">
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  "Guardar Curso"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
