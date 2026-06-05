"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
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
import { crearProyectoSchema, type CrearProyectoInput, TOPE_POR_ROL } from "@/lib/schemas/proyecto-schema"
import { periodosQueAbarca, type PeriodoRango } from "@/lib/utils/periodo"
import {
  crearProyectoAction,
  enviarProyectoAction,
  actualizarProyectoAction,
} from "@/lib/actions/proyecto-actions"
import {
  ParticipantesSelector,
  type DocenteParticipante,
} from "@/components/proyectos/ParticipantesSelector"
import { FechaPicker } from "@/components/proyectos/FechaPicker"
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

export function ProyectoForm({
  creadorId,
  periodos,
  proyectoId,
  initial,
}: {
  creadorId: string
  periodos: PeriodoRango[]
  /** Si se pasa, el form edita ese proyecto (BORRADOR o RECHAZADO) en vez de crear. */
  proyectoId?: string
  initial?: {
    values: Partial<CrearProyectoInput>
    participantes: DocenteParticipante[]
  }
}) {
  const router = useRouter()
  const esEdicion = Boolean(proyectoId)
  const [pending, startTransition] = useTransition()
  const [participantes, setParticipantes] = useState<DocenteParticipante[]>(
    initial?.participantes ?? [],
  )

  function actualizarParticipantes(lista: DocenteParticipante[]) {
    setParticipantes(lista)
    form.setValue(
      "participantes",
      lista.map((p) => ({
        docenteId: p.id,
        rol: p.rol as "INVESTIGADOR_PRINCIPAL" | "COINVESTIGADOR" | "COORDINADOR" | "COGESTOR",
        horas: p.horas ?? null,
      })),
    )
  }

  const form = useForm<CrearProyectoInput>({
    resolver: zodResolver(crearProyectoSchema),
    defaultValues: {
      titulo: initial?.values.titulo ?? "",
      descripcion: initial?.values.descripcion ?? "",
      tipo: initial?.values.tipo,
      rolDocente: initial?.values.rolDocente,
      entidadConvocatoria: initial?.values.entidadConvocatoria ?? "",
      fechaInicio: initial?.values.fechaInicio,
      fechaFin: initial?.values.fechaFin,
      horasDocente: initial?.values.horasDocente ?? null,
      participantes: initial?.participantes.map((p) => ({
        docenteId: p.id,
        rol: p.rol as "INVESTIGADOR_PRINCIPAL" | "COINVESTIGADOR" | "COORDINADOR" | "COGESTOR",
        horas: p.horas ?? null,
      })),
    },
  })

  const tipoSeleccionado = useWatch({ control: form.control, name: "tipo" })
  const rolDocenteSel = useWatch({ control: form.control, name: "rolDocente" })
  const horasDocenteSel = useWatch({ control: form.control, name: "horasDocente" })
  const fechaInicioSel = useWatch({ control: form.control, name: "fechaInicio" })
  const fechaFinSel = useWatch({ control: form.control, name: "fechaFin" })
  const rolesDisponibles = tipoSeleccionado ? ROL_POR_TIPO[tipoSeleccionado] ?? [] : []
  const semestresAbarca = periodosQueAbarca(fechaInicioSel, fechaFinSel, periodos)

  function handleGuardar(data: CrearProyectoInput) {
    startTransition(async () => {
      if (proyectoId) {
        const res = await actualizarProyectoAction(proyectoId, data)
        if ("error" in res) {
          toast.error(res.error)
          return
        }
        toast.success("Cambios guardados")
        router.refresh()
        return
      }
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
      let pid = proyectoId
      if (pid) {
        const upd = await actualizarProyectoAction(pid, data)
        if ("error" in upd) {
          toast.error(upd.error)
          return
        }
      } else {
        const crearRes = await crearProyectoAction(data)
        if ("error" in crearRes) {
          toast.error(crearRes.error)
          return
        }
        pid = crearRes.id
      }
      const enviarRes = await enviarProyectoAction(pid)
      if ("error" in enviarRes) {
        toast.error(enviarRes.error)
        if (!proyectoId) router.push(`/proyectos/${pid}`)
        else router.refresh()
        return
      }
      toast.success("Proyecto enviado a revisión")
      if (proyectoId) router.refresh()
      else router.push(`/proyectos/${pid}`)
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
            form.setValue("tipo", val as CrearProyectoInput["tipo"], { shouldValidate: true })
            form.setValue("rolDocente", undefined as unknown as CrearProyectoInput["rolDocente"])
            // Los roles dependen del tipo: al cambiarlo, limpiar participantes.
            actualizarParticipantes([])
          }}
          value={tipoSeleccionado ?? ""}
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
            form.setValue("rolDocente", val as CrearProyectoInput["rolDocente"], {
              shouldValidate: true,
            })
          }
          value={rolDocenteSel ?? ""}
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

      {/* Horas propuestas del creador (≤ tope del rol). El revisor las confirma. */}
      <div className="space-y-2">
        <Label htmlFor="horasDocente">Horas propuestas para ti (semestre)</Label>
        <Input
          id="horasDocente"
          type="number"
          min={0}
          max={rolDocenteSel ? TOPE_POR_ROL[rolDocenteSel] : undefined}
          placeholder={rolDocenteSel ? `Máx ${TOPE_POR_ROL[rolDocenteSel] ?? 0}h` : "Primero elegí tu rol"}
          disabled={!rolDocenteSel}
          value={horasDocenteSel ?? ""}
          onChange={(e) =>
            form.setValue("horasDocente", e.target.value === "" ? null : Number(e.target.value), {
              shouldValidate: true,
            })
          }
          className="w-40"
        />
        <p className="text-xs text-muted-foreground">
          Estas horas se precargan en tu agenda cuando el proyecto sea aprobado. Tu jefe/decano las
          confirma o ajusta al aprobar (no pueden superar el tope del rol).
        </p>
      </div>

      {/* Nota informativa: el revisor confirma las horas al aprobar. */}
      <div className="rounded-md bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
       Las horas que propongas aquí son una sugerencia. Cuando tu jefe de programa o el decano
       apruebe el proyecto, <span className="font-medium text-foreground/80">confirmará o ajustará las horas de cada
        participante</span> (≤ el tope del rol).
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
          topes={TOPE_POR_ROL}
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
          placeholder="Ej: Colciencias, USCO Interna, Sistema general de regalías, etc. (opcional)"
          {...form.register("entidadConvocatoria")}
        />
        {form.formState.errors.entidadConvocatoria && (
          <p className="text-xs text-destructive">
            {form.formState.errors.entidadConvocatoria.message}
          </p>
        )}
      </div>

      {/* Tiempo del proyecto: fecha de inicio y fin → semestres que abarca */}
      <div className="space-y-2">
        <Label>Tiempo del proyecto</Label>
        <p className="text-xs text-muted-foreground">
          Indica desde cuándo y hasta cuándo se realizará. El sistema calcula los
          semestres que abarca; tu jefe/decano podrá ajustarlas al aprobar.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <FechaPicker
            label="Inicio"
            value={fechaInicioSel}
            onChange={(v) => form.setValue("fechaInicio", v, { shouldValidate: true })}
          />
          <FechaPicker
            label="Fin"
            value={fechaFinSel}
            onChange={(v) => form.setValue("fechaFin", v, { shouldValidate: true })}
          />
        </div>
        {form.formState.errors.fechaFin && (
          <p className="text-xs text-destructive">
            {form.formState.errors.fechaFin.message}
          </p>
        )}
        {semestresAbarca.length > 0 && (
          <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Este proyecto abarca{" "}
            <span className="font-medium text-foreground/80">
              {semestresAbarca.length} semestre{semestresAbarca.length !== 1 ? "s" : ""}
            </span>
            : {semestresAbarca.join(", ")}.
          </div>
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
          {esEdicion ? "Guardar cambios" : "Guardar borrador"}
        </Button>
        <Button
          type="button"
          disabled={pending}
          onClick={form.handleSubmit(handleEnviar)}
          className="gap-2"
        >
          <Send className="h-4 w-4" />
          {pending
            ? "Enviando..."
            : esEdicion
              ? "Reenviar a revisión"
              : "Enviar a revisión"}
        </Button>
      </div>
    </form>
  )
}
