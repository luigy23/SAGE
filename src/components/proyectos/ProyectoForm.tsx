"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { crearProyectoSchema, type CrearProyectoInput } from "@/lib/schemas/proyecto-schema"
import { crearProyectoAction, enviarProyectoAction } from "@/lib/actions/proyecto-actions"
import { Send, Save } from "lucide-react"

const TIPO_OPTIONS = [
  { value: "INVESTIGACION", label: "Investigación" },
  { value: "PROYECCION_SOCIAL", label: "Proyección Social" },
] as const

const ROL_POR_TIPO: Record<string, { value: string; label: string }[]> = {
  INVESTIGACION: [
    { value: "INVESTIGADOR_PRINCIPAL", label: "Investigador Principal" },
    { value: "COINVESTIGADOR", label: "Coinvestigador" },
  ],
  PROYECCION_SOCIAL: [
    { value: "COORDINADOR", label: "Coordinador" },
    { value: "COGESTOR", label: "Cogestor" },
  ],
}

export function ProyectoForm() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const form = useForm<CrearProyectoInput>({
    resolver: zodResolver(crearProyectoSchema),
    defaultValues: {
      titulo: "",
      descripcion: "",
      tipo: undefined,
      rolDocente: undefined,
      entidadConvocatoria: "",
      periodoInicio: "",
    },
  })

  const tipoSeleccionado = form.watch("tipo")
  const rolesDisponibles = tipoSeleccionado ? ROL_POR_TIPO[tipoSeleccionado] ?? [] : []

  function handleGuardar(data: CrearProyectoInput) {
    startTransition(async () => {
      const res = await crearProyectoAction(data)
      if ("error" in res) {
        toast.error(res.error)
        return
      }
      toast.success("Proyecto guardado como borrador")
      router.push(`/proyectos/${res.id}`)
    })
  }

  function handleEnviar(data: CrearProyectoInput) {
    startTransition(async () => {
      const crearRes = await crearProyectoAction(data)
      if ("error" in crearRes) {
        toast.error(crearRes.error)
        return
      }
      const enviarRes = await enviarProyectoAction(crearRes.id)
      if ("error" in enviarRes) {
        toast.error(enviarRes.error)
        router.push(`/proyectos/${crearRes.id}`)
        return
      }
      toast.success("Proyecto enviado a revisión")
      router.push(`/proyectos/${crearRes.id}`)
    })
  }

  return (
    <form className="space-y-6">
      {/* Título */}
      <div className="space-y-2">
        <Label htmlFor="titulo">
          Título del proyecto <span className="text-destructive">*</span>
        </Label>
        <Input
          id="titulo"
          placeholder="Ej: Impacto de las TIC en la educación rural del Huila"
          {...form.register("titulo")}
        />
        {form.formState.errors.titulo && (
          <p className="text-xs text-destructive">
            {form.formState.errors.titulo.message}
          </p>
        )}
      </div>

      {/* Tipo */}
      <div className="space-y-2">
        <Label htmlFor="tipo">
          Tipo de proyecto <span className="text-destructive">*</span>
        </Label>
        <Select
          onValueChange={(val) => {
            form.setValue("tipo", val as CrearProyectoInput["tipo"])
            form.setValue("rolDocente", undefined as unknown as CrearProyectoInput["rolDocente"])
          }}
          value={form.watch("tipo") ?? ""}
        >
          <SelectTrigger id="tipo">
            <SelectValue placeholder="Seleccionar tipo" />
          </SelectTrigger>
          <SelectContent>
            {TIPO_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.tipo && (
          <p className="text-xs text-destructive">
            {form.formState.errors.tipo.message}
          </p>
        )}
      </div>

      {/* Rol docente — depende del tipo */}
      <div className="space-y-2">
        <Label htmlFor="rolDocente">
          Rol en el proyecto <span className="text-destructive">*</span>
        </Label>
        <Select
          disabled={!tipoSeleccionado}
          onValueChange={(val) =>
            form.setValue("rolDocente", val as CrearProyectoInput["rolDocente"])
          }
          value={form.watch("rolDocente") ?? ""}
        >
          <SelectTrigger id="rolDocente">
            <SelectValue
              placeholder={
                tipoSeleccionado
                  ? "Seleccionar rol"
                  : "Primero seleccioná el tipo"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {rolesDisponibles.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.rolDocente && (
          <p className="text-xs text-destructive">
            {form.formState.errors.rolDocente.message}
          </p>
        )}
      </div>

      {/* Descripción */}
      <div className="space-y-2">
        <Label htmlFor="descripcion">Descripción</Label>
        <Textarea
          id="descripcion"
          placeholder="Descripción breve del proyecto (opcional)"
          rows={4}
          {...form.register("descripcion")}
        />
        {form.formState.errors.descripcion && (
          <p className="text-xs text-destructive">
            {form.formState.errors.descripcion.message}
          </p>
        )}
      </div>

      {/* Entidad / Convocatoria */}
      <div className="space-y-2">
        <Label htmlFor="entidadConvocatoria">Entidad / Convocatoria</Label>
        <Input
          id="entidadConvocatoria"
          placeholder="Ej: Colciencias, USCO Interna, etc. (opcional)"
          {...form.register("entidadConvocatoria")}
        />
        {form.formState.errors.entidadConvocatoria && (
          <p className="text-xs text-destructive">
            {form.formState.errors.entidadConvocatoria.message}
          </p>
        )}
      </div>

      {/* Periodo de inicio */}
      <div className="space-y-2">
        <Label htmlFor="periodoInicio">Periodo de inicio</Label>
        <Input
          id="periodoInicio"
          placeholder="ej. 2026-1 (opcional)"
          {...form.register("periodoInicio")}
        />
        {form.formState.errors.periodoInicio && (
          <p className="text-xs text-destructive">
            {form.formState.errors.periodoInicio.message}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={form.handleSubmit(handleGuardar)}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          Guardar borrador
        </Button>
        <Button
          type="button"
          disabled={pending}
          onClick={form.handleSubmit(handleEnviar)}
          className="gap-2"
        >
          <Send className="h-4 w-4" />
          {pending ? "Enviando..." : "Enviar a revisión"}
        </Button>
      </div>
    </form>
  )
}
