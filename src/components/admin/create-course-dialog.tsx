"use client"

import { useState, useTransition } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
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
import { Form } from "@/components/ui/form"
import { Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  courseFormSchema,
  CourseFormBody,
  mapFormValuesToCursoPayload,
  type CourseFormValues,
} from "./course-form-shared"

export function CreateCourseDialog() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: {
      codigo: "",
      nombre: "",
      tipo: undefined,
      creditos: 1,
      creditosT: null,
      creditosP: null,
      horasSemT: null,
      horasSemP: null,
      horasSemI: null,
      componente: null,
      facultad: "",
      acuerdoOrigen: "",
    },
  })

  // Solo para deshabilitar el submit hasta que haya tipo seleccionado.
  // La reactividad real vive en useCourseFormReactivity dentro de CourseFormBody.
  const tipo = useWatch({ control: form.control, name: "tipo" })

  function onSubmit(values: CourseFormValues) {
    startTransition(async () => {
      const result = await crearCursoMaestro(mapFormValuesToCursoPayload(values))
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      toast.success("Curso creado exitosamente.")
      form.reset()
      setOpen(false)
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) form.reset()
        setOpen(o)
      }}
    >
      <DialogTrigger asChild>
        <Button id="btn-crear-curso">
          <Plus className="mr-2 h-4 w-4" />
          Crear Curso
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Nuevo Curso Maestro</DialogTitle>
          <DialogDescription>
            Agrega un nuevo curso al catálogo oficial. Los docentes podrán
            seleccionarlo al planificar su agenda (FO-19).
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="max-h-[60vh] overflow-y-auto pr-1 py-2">
              <CourseFormBody form={form} />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending || !tipo}
                id="btn-submit-curso"
              >
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
