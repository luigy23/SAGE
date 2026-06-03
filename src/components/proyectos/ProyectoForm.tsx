"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { format, parse } from "date-fns"
import { es } from "date-fns/locale"
import { formatFechaInicio } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { crearProyectoSchema, type CrearProyectoInput } from "@/lib/schemas/proyecto-schema"
import { crearProyectoAction, enviarProyectoAction } from "@/lib/actions/proyecto-actions"
import {
  ParticipantesSelector,
  type DocenteParticipante,
} from "@/components/proyectos/ParticipantesSelector"
import { Send, Save, CalendarIcon } from "lucide-react"

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

export function ProyectoForm({ creadorId }: { creadorId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [participantes, setParticipantes] = useState<DocenteParticipante[]>([])

  function actualizarParticipantes(lista: DocenteParticipante[]) {
    setParticipantes(lista)
    form.setValue(
      "participantes",
      lista.map((p) => ({
        docenteId: p.id,
        rol: p.rol as "INVESTIGADOR_PRINCIPAL" | "COINVESTIGADOR" | "COORDINADOR" | "COGESTOR",
      })),
    )
  }

  const form = useForm<CrearProyectoInput>({
    resolver: zodResolver(crearProyectoSchema),
    defaultValues: {
      titulo: "",
      descripcion: "",
      tipo: undefined,
      rolDocente: undefined,
      entidadConvocatoria: "",
      periodoInicio: undefined,
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
            // Los roles dependen del tipo: al cambiarlo, limpiar participantes.
            actualizarParticipantes([])
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

      {/* Participantes adicionales */}
      <div className="space-y-2">
        <Label>Otros participantes</Label>
        <p className="text-xs text-muted-foreground">
          Agregá a los demás docentes del proyecto y asigná su rol. Debe haber exactamente un{" "}
          {tipoSeleccionado === "PROYECCION_SOCIAL" ? "Coordinador" : "Investigador Principal"} en
          total (contándote a vos).
        </p>
        <ParticipantesSelector
          value={participantes}
          onChange={actualizarParticipantes}
          tipo={tipoSeleccionado}
          excluirIds={[creadorId]}
        />
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
        <Label htmlFor="periodoInicio">Fecha de inicio</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="periodoInicio"
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !form.watch("periodoInicio") && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {form.watch("periodoInicio")
                ? formatFechaInicio(form.watch("periodoInicio")!)
                : "Seleccionar fecha (opcional)"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={
                form.watch("periodoInicio")
                  ? parse(form.watch("periodoInicio")!, "yyyy-MM-dd", new Date())
                  : undefined
              }
              onSelect={(date) =>
                form.setValue(
                  "periodoInicio",
                  date ? format(date, "yyyy-MM-dd") : undefined
                )
              }
              locale={es}
              initialFocus
            />
          </PopoverContent>
        </Popover>
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
