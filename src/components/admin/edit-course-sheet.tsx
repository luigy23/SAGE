"use client"

import { useEffect, useState, useTransition } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { actualizarCursoMaestro } from "@/lib/actions/curso-maestro-actions"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Form } from "@/components/ui/form"
import { Pencil, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  courseFormSchema,
  CourseFormBody,
  cursoToFormDefaults,
  mapFormValuesToCursoPayload,
  type CourseFormValues,
  type CursoLike,
} from "./course-form-shared"

interface EditCourseSheetProps {
  curso: CursoLike & { id: string }
}

export function EditCourseSheet({ curso }: EditCourseSheetProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: cursoToFormDefaults(curso),
  })

  // Re-sincroniza el form si el curso prop cambia mientras el sheet está montado
  // (p. ej. tras refrescar la lista). En condiciones normales esto es no-op.
  useEffect(() => {
    if (open) return
    form.reset(cursoToFormDefaults(curso))
  }, [curso, open, form])

  const tipo = useWatch({ control: form.control, name: "tipo" })

  function onSubmit(values: CourseFormValues) {
    startTransition(async () => {
      const result = await actualizarCursoMaestro(
        curso.id,
        mapFormValuesToCursoPayload(values)
      )
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      toast.success("Curso actualizado.")
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) form.reset(cursoToFormDefaults(curso))
        setOpen(o)
      }}
    >
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Editar ${curso.nombre}`}
          title="Editar"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[640px] flex flex-col gap-0 p-0"
      >
        <SheetHeader className="border-b">
          <SheetTitle>Editar Curso Maestro</SheetTitle>
          <SheetDescription>
            Modifica los datos del curso{" "}
            <span className="font-mono font-medium">{curso.codigo}</span>. Los
            cambios se reflejarán en futuros selectores de agenda.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 min-h-0"
          >
            <div className="flex-1 overflow-y-auto p-4">
              <CourseFormBody form={form} />
            </div>

            <SheetFooter className="border-t flex-row justify-end gap-2 sm:gap-2">
              <SheetClose asChild>
                <Button type="button" variant="outline" disabled={isPending}>
                  Cancelar
                </Button>
              </SheetClose>
              <Button
                type="submit"
                disabled={isPending || !tipo}
                id="btn-submit-edit-curso"
              >
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
