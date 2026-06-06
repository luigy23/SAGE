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
import { crearProyectoSchema, type CrearProyectoInput, ROL_LIDER } from "@/lib/schemas/proyecto-schema"
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

/** Une una lista en español: ["a","b","c"] → "a, b y c". */
function unirEspanol(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ""
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`
}

export function ProyectoForm({
  creadorId,
  periodos,
  proyectoId,
  initial,
  creadorEsAutoridad = false,
}: {
  creadorId: string
  periodos: PeriodoRango[]
  /** Si se pasa, el form edita ese proyecto (BORRADOR o RECHAZADO) en vez de crear. */
  proyectoId?: string
  initial?: {
    values: Partial<CrearProyectoInput>
    participantes: DocenteParticipante[]
  }
  /** El que registra es autoridad (decano/jefe/superadmin) → lo hace PARA otro docente:
   *  no entra como participante y elige al responsable entre el equipo. */
  creadorEsAutoridad?: boolean
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
      participantes: initial?.participantes.map((p) => ({
        docenteId: p.id,
        rol: p.rol as "INVESTIGADOR_PRINCIPAL" | "COINVESTIGADOR" | "COORDINADOR" | "COGESTOR",
      })),
    },
  })

  const tipoSeleccionado = useWatch({ control: form.control, name: "tipo" })
  const fechaInicioSel = useWatch({ control: form.control, name: "fechaInicio" })
  const fechaFinSel = useWatch({ control: form.control, name: "fechaFin" })
  const semestresAbarca = periodosQueAbarca(fechaInicioSel, fechaFinSel, periodos)
  // El rol del creador es el LÍDER del tipo (IP / Coordinador); no se elige.
  const rolCreadorLabel =
    tipoSeleccionado === "PROYECCION_SOCIAL" ? "Coordinador" : tipoSeleccionado ? "Investigador Principal" : null

  // Duración real del proyecto (inclusiva) en días y semanas, para no confundir
  // "tocar un semestre" con "durar todo el semestre".
  const diasProyecto =
    fechaInicioSel && fechaFinSel
      ? Math.max(1, Math.round((Date.parse(fechaFinSel) - Date.parse(fechaInicioSel)) / 86_400_000) + 1)
      : 0
  const semanasProyecto = diasProyecto > 0 ? Math.max(1, Math.ceil(diasProyecto / 7)) : 0

  function handleGuardar(data: CrearProyectoInput) {
    startTransition(async () => {
      const payload = { ...data, esParaOtro: creadorEsAutoridad }
      if (proyectoId) {
        const res = await actualizarProyectoAction(proyectoId, payload)
        if ("error" in res) {
          toast.error(res.error)
          return
        }
        toast.success("Cambios guardados")
        router.refresh()
        return
      }
      const res = await crearProyectoAction(payload)
      if ("error" in res) {
        toast.error(res.error)
        return
      }
      toast.success("Proyecto guardado como borrador")
      router.push(creadorEsAutoridad ? `/gestion/proyectos/${res.id}/editar` : `/proyectos/${res.id}`)
    })
  }

  function handleEnviar(data: CrearProyectoInput) {
    startTransition(async () => {
      let pid = proyectoId
      const payload = { ...data, esParaOtro: creadorEsAutoridad }
      if (pid) {
        const upd = await actualizarProyectoAction(pid, payload)
        if ("error" in upd) {
          toast.error(upd.error)
          return
        }
      } else {
        const crearRes = await crearProyectoAction(payload)
        if ("error" in crearRes) {
          toast.error(crearRes.error)
          return
        }
        pid = crearRes.id
      }
      const enviarRes = await enviarProyectoAction(pid)
      if ("error" in enviarRes) {
        toast.error(enviarRes.error)
        if (!proyectoId) router.push(creadorEsAutoridad ? `/gestion/proyectos/${pid}/editar` : `/proyectos/${pid}`)
        else router.refresh()
        return
      }
      toast.success("Proyecto enviado a revisión")
      if (proyectoId) router.refresh()
      else router.push(creadorEsAutoridad ? `/gestion/proyectos/${pid}/editar` : `/proyectos/${pid}`)
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
            const t = val as "INVESTIGACION" | "PROYECCION_SOCIAL"
            form.setValue("tipo", t, { shouldValidate: true })
            // Profesor: él es el líder del tipo (no se elige). Autoridad: el líder
            // se designa entre los participantes, así que no se fija acá.
            form.setValue(
              "rolDocente",
              creadorEsAutoridad ? undefined : ROL_LIDER[t],
              { shouldValidate: true },
            )
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

      {/* Rol del creador — fijo: es el líder del proyecto (solo si es profesor) */}
      {!creadorEsAutoridad && rolCreadorLabel && (
        <div className="space-y-2">
          <Label>Tu rol en el proyecto</Label>
          <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
            <span className="font-medium">{rolCreadorLabel}</span>
            <span className="text-xs text-muted-foreground">
              · quien registra el proyecto es su responsable principal
            </span>
          </div>
        </div>
      )}

      {/* Aviso: la autoridad registra el proyecto para otro docente */}
      {creadorEsAutoridad && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300">
          Estás registrando este proyecto <span className="font-medium">para otro docente</span>. No
          quedás como participante: agrega al equipo y designá al{" "}
          {tipoSeleccionado === "PROYECCION_SOCIAL" ? "Coordinador" : "Investigador Principal"} responsable.
        </div>
      )}

      {/* Equipo / participantes */}
      <div className="space-y-2">
        <Label>{creadorEsAutoridad ? "Equipo del proyecto" : "Otros participantes"}</Label>
        <p className="text-xs text-muted-foreground">
          {creadorEsAutoridad ? (
            <>
              Agrega a los docentes y asigná sus roles. Debe haber exactamente un{" "}
              {tipoSeleccionado === "PROYECCION_SOCIAL" ? "Coordinador" : "Investigador Principal"}.
            </>
          ) : (
            <>
              Agregá a los demás docentes del proyecto. Entran como{" "}
              {tipoSeleccionado === "PROYECCION_SOCIAL" ? "Cogestores" : "Coinvestigadores"}; el único{" "}
              {tipoSeleccionado === "PROYECCION_SOCIAL" ? "Coordinador" : "Investigador Principal"} sos vos.
            </>
          )}
        </p>
        <ParticipantesSelector
          value={participantes}
          onChange={actualizarParticipantes}
          tipo={tipoSeleccionado}
          excluirIds={[creadorId]}
          permitirLider={creadorEsAutoridad}
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
        <Label htmlFor="entidadConvocatoria">
          Entidad / Convocatoria <span className="text-destructive">*</span>
        </Label>
        <Input
          id="entidadConvocatoria"
          placeholder="Ej: Colciencias, USCO Interna, Sistema general de regalías, etc."
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
          Indica desde cuándo y hasta cuándo se realizará. El sistema identifica en qué
          semestres caen esas fechas; tu jefe/decano podrá ajustarlas al aprobar.
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
        {diasProyecto > 0 && (
          <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground space-y-0.5">
            <p>
              Duración:{" "}
              <span className="font-medium text-foreground/80">
                {diasProyecto} día{diasProyecto !== 1 ? "s" : ""}
                {semanasProyecto >= 1 && ` (~${semanasProyecto} semana${semanasProyecto !== 1 ? "s" : ""})`}
              </span>
              .
            </p>
            {semestresAbarca.length > 0 && (
              <p>
                {semestresAbarca.length === 1
                  ? "Las fechas caen en el semestre "
                  : "Las fechas se reparten entre los semestres "}
                <span className="font-medium text-foreground/80">{unirEspanol(semestresAbarca)}</span>.
              </p>
            )}
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
