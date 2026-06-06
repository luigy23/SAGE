"use client"

import { useEffect, useState, useTransition } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Pencil,
  ShieldAlert,
  Loader2,
  Save,
  GraduationCap,
  Briefcase,
  FolderOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  editarDocenteSuperadminSchema,
  type EditarDocenteSuperadminInput,
} from "@/lib/schemas/superadmin-docente-schema"
import { TIPOS_CARGO } from "@/lib/schemas/profile-schema"
import { CARGO_AMBITO, FACULTADES, FACULTAD_PROGRAMAS } from "@/lib/constants"
import { editarDocenteSuperadminAction } from "@/lib/actions/superadmin-docente-edit"
import { getMaxHoras } from "@/lib/utils/periodo"

const MODALIDADES = [
  { value: "PLANTA_TC", label: "Tiempo Completo Planta" },
  { value: "OCASIONAL_TC", label: "Tiempo Completo Ocasional" },
  { value: "PLANTA_MT", label: "Medio Tiempo Planta" },
  { value: "OCASIONAL_MT", label: "Medio Tiempo Ocasional" },
  { value: "CATEDRA", label: "Cátedra" },
  { value: "VISITANTE_TC", label: "Visitante Tiempo Completo" },
  { value: "VISITANTE_MT", label: "Visitante Medio Tiempo" },
  { value: "CATEDRA_VISITANTE_TC", label: "Cátedra Visitante Tiempo Completo" },
  { value: "CATEDRA_VISITANTE_MT", label: "Cátedra Visitante Medio Tiempo" },
  { value: "INVITADO", label: "Invitado" },
] as const

const SEDES = [
  { value: "NEIVA", label: "Neiva" },
  { value: "PITALITO", label: "Pitalito" },
  { value: "GARZON", label: "Garzón" },
  { value: "LA_PLATA", label: "La Plata" },
] as const

const MODALIDADES_TEMPORALES = new Set([
  "OCASIONAL_TC",
  "OCASIONAL_MT",
  "VISITANTE_TC",
  "VISITANTE_MT",
  "CATEDRA_VISITANTE_TC",
  "CATEDRA_VISITANTE_MT",
  "INVITADO",
])

type Usuario = {
  id: string
  nombre: string
  cedula: string
  email: string
  celular: string | null
  modalidad: string
  sedeBase: string
  facultad: string
  programa: string
  doctorado: boolean
  tituloDoctorado?: string | null
  cargoAdministrativo: boolean
  tipoCargo: string | null
  cargoAmbitoValor: string | null
  proyectosActivos: boolean
  semanasVinculacion?: number | null
  vinculacionDesde?: Date | null
  vinculacionHasta?: Date | null
  invObjeto?: string | null
  invFechaDesde?: Date | null
  invFechaHasta?: Date | null
  invHorasContratadas?: number | null
  invAutorizadoCA?: boolean
}

/** Convierte una fecha (Date | ISO string | null) al formato yyyy-mm-dd del input date. */
function toDateInput(v: Date | string | null | undefined): string {
  if (!v) return ""
  const d = typeof v === "string" ? new Date(v) : v
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10)
}

/** Semanas base por modalidad (valores parametrizados, resueltos en el server). */
export type SemanasBase = {
  planta: number
  catedra: number
  ocasional: number
  visitante: number
}

export function DocenteEditSheet({
  usuario,
  semanasBase,
}: {
  usuario: Usuario
  semanasBase: SemanasBase
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const form = useForm<EditarDocenteSuperadminInput>({
    resolver: zodResolver(editarDocenteSuperadminSchema),
    defaultValues: {
      nombre: usuario.nombre,
      cedula: usuario.cedula,
      celular: usuario.celular ?? "",
      modalidad: usuario.modalidad as EditarDocenteSuperadminInput["modalidad"],
      programa: usuario.programa,
      facultad: usuario.facultad,
      sedeBase: usuario.sedeBase as EditarDocenteSuperadminInput["sedeBase"],
      doctorado: usuario.doctorado,
      tituloDoctorado: usuario.tituloDoctorado ?? "",
      cargoAdministrativo: usuario.cargoAdministrativo,
      tipoCargo: usuario.tipoCargo ?? "",
      cargoAmbitoValor: usuario.cargoAmbitoValor ?? "",
      proyectosActivos: usuario.proyectosActivos,
      semanasVinculacion: usuario.semanasVinculacion ?? undefined,
      vinculacionDesde: toDateInput(usuario.vinculacionDesde),
      vinculacionHasta: toDateInput(usuario.vinculacionHasta),
      invObjeto: usuario.invObjeto ?? "",
      invFechaDesde: toDateInput(usuario.invFechaDesde),
      invFechaHasta: toDateInput(usuario.invFechaHasta),
      invHorasContratadas: usuario.invHorasContratadas ?? undefined,
      invAutorizadoCA: usuario.invAutorizadoCA ?? false,
    },
  })

  // Reset cuando se vuelve a abrir el sheet con datos posiblemente actualizados
  useEffect(() => {
    if (open) {
      form.reset({
        nombre: usuario.nombre,
        cedula: usuario.cedula,
        celular: usuario.celular ?? "",
        modalidad: usuario.modalidad as EditarDocenteSuperadminInput["modalidad"],
        programa: usuario.programa,
        facultad: usuario.facultad,
        sedeBase: usuario.sedeBase as EditarDocenteSuperadminInput["sedeBase"],
        doctorado: usuario.doctorado,
        tituloDoctorado: usuario.tituloDoctorado ?? "",
        cargoAdministrativo: usuario.cargoAdministrativo,
        tipoCargo: usuario.tipoCargo ?? "",
        cargoAmbitoValor: usuario.cargoAmbitoValor ?? "",
        proyectosActivos: usuario.proyectosActivos,
        semanasVinculacion: usuario.semanasVinculacion ?? undefined,
        vinculacionDesde: toDateInput(usuario.vinculacionDesde),
        vinculacionHasta: toDateInput(usuario.vinculacionHasta),
      })
    }
  }, [open, usuario, form])

  const modalidad = useWatch({ control: form.control, name: "modalidad" })
  const doctorado = useWatch({ control: form.control, name: "doctorado" })
  const cargoAdministrativo = useWatch({
    control: form.control,
    name: "cargoAdministrativo",
  })
  const tipoCargoW = useWatch({ control: form.control, name: "tipoCargo" })
  const programaW = useWatch({ control: form.control, name: "programa" })
  const facultadW = useWatch({ control: form.control, name: "facultad" })
  const ambitoCfg = tipoCargoW ? CARGO_AMBITO[tipoCargoW] ?? null : null
  // El ámbito de un cargo es SIEMPRE el propio del docente: jefe → su programa,
  // decano/coordinador → su facultad. Una sola opción posible, no se puede elegir otra.
  const programaActual = programaW || usuario.programa
  const facultadActual = facultadW || usuario.facultad

  const sedeBaseW = useWatch({ control: form.control, name: "sedeBase" })

  const isCatedra = modalidad === "CATEDRA"
  const isInvitado = modalidad === "INVITADO"
  const isModalidadTemporal = MODALIDADES_TEMPORALES.has(modalidad ?? "")
  // Temporales con rango de contrato (ocasional/visitante/cátedra visitante); INVITADO usa inv*.
  const isTemporalNoInvitado = isModalidadTemporal && !isInvitado

  // Parámetros EFECTIVOS para las características del docente (modalidad + sede).
  // Semanas base por modalidad (parametrizadas en Parámetros Globales) y horas/semana
  // (Modalidades; la cátedra depende de la sede: 16 Neiva / 19 regionales).
  const semanasEfectivas = (() => {
    switch (modalidad) {
      case "CATEDRA":
        return semanasBase.catedra
      case "OCASIONAL_TC":
      case "OCASIONAL_MT":
        return semanasBase.ocasional
      case "VISITANTE_TC":
      case "VISITANTE_MT":
      case "CATEDRA_VISITANTE_TC":
      case "CATEDRA_VISITANTE_MT":
        return semanasBase.visitante
      default:
        return semanasBase.planta // PLANTA / INVITADO
    }
  })()
  const horasSemanaEfectivas = modalidad ? getMaxHoras(modalidad, sedeBaseW).maxHoras : 0

  // CÁTEDRA (Art. 10) e INVITADO (Art. 4f) no pueden tener cargo administrativo.
  const bloqueaCargo = isCatedra || isInvitado

  // UI Lock — sin cargo administrativo fuerza vacío los campos del cargo.
  useEffect(() => {
    if (bloqueaCargo) {
      form.setValue("cargoAdministrativo", false, { shouldValidate: true })
      form.setValue("tipoCargo", "", { shouldValidate: true })
      form.setValue("cargoAmbitoValor", "", { shouldValidate: true })
    }
  }, [bloqueaCargo, form])

  // CÁTEDRA además no puede tener proyectos activos (Art. 3 Par. 1); el invitado sí.
  useEffect(() => {
    if (isCatedra) form.setValue("proyectosActivos", false, { shouldValidate: true })
  }, [isCatedra, form])

  // Si no hay doctorado, limpiar título
  useEffect(() => {
    if (!doctorado) form.setValue("tituloDoctorado", "", { shouldValidate: true })
  }, [doctorado, form])

  // Forzar el ámbito del cargo al propio del docente (su programa o su facultad),
  // nunca otro. Si el cargo no maneja ámbito, no hace nada.
  useEffect(() => {
    const cfg = tipoCargoW ? CARGO_AMBITO[tipoCargoW] ?? null : null
    if (cfg) {
      form.setValue(
        "cargoAmbitoValor",
        cfg.tipo === "PROGRAMA" ? programaActual : facultadActual,
        { shouldValidate: true },
      )
    }
  }, [tipoCargoW, programaActual, facultadActual, form])

  // Si no hay cargo, limpiar tipoCargo y ámbito
  useEffect(() => {
    if (!cargoAdministrativo) {
      form.setValue("tipoCargo", "", { shouldValidate: true })
      form.setValue("cargoAmbitoValor", "", { shouldValidate: true })
    }
  }, [cargoAdministrativo, form])

  function onSubmit(data: EditarDocenteSuperadminInput) {
    startTransition(async () => {
      const res = await editarDocenteSuperadminAction(usuario.id, {
        ...data,
        celular: data.celular?.trim() ? data.celular.trim() : null,
        tituloDoctorado: data.tituloDoctorado?.trim() || null,
        tipoCargo: data.tipoCargo?.trim() || null,
        cargoAmbitoValor: data.cargoAmbitoValor?.trim() || null,
        semanasVinculacion: data.semanasVinculacion ?? null,
      })
      if ("error" in res) {
        toast.error(res.error)
      } else {
        toast.success("Datos actualizados.")
        setOpen(false)
        router.refresh()
      }
    })
  }

  const errors = form.formState.errors

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Pencil className="h-3.5 w-3.5" />
          Editar datos
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl overflow-y-auto p-0"
      >
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
          <SheetHeader className="p-6 pb-4">
            <SheetTitle>Editar datos del docente</SheetTitle>
            <SheetDescription>
              Edición directa con privilegios de SUPERADMIN. Los cambios se
              aplican de inmediato y quedan en la auditoría.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
            <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="text-xs text-amber-800 dark:text-amber-300">
                Esta acción no pasa por el flujo de solicitud — se persiste
                inmediatamente. La cédula es el identificador único de identidad.
                El correo y la contraseña se cambian con «Cambiar credenciales»;
                el rol y el estado de la cuenta, con sus controles dedicados.
              </div>
            </div>

            {/* Identidad */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Identidad
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Nombre" error={errors.nombre?.message} required>
                  <Input {...form.register("nombre")} />
                </Field>
                <Field label="Cédula" error={errors.cedula?.message} required>
                  <Input {...form.register("cedula")} className="font-mono" />
                </Field>
                <Field label="Celular" error={errors.celular?.message}>
                  <Input
                    {...form.register("celular")}
                    placeholder="3001234567"
                  />
                </Field>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input value={usuario.email} disabled className="bg-muted" />
                  <p className="text-[10px] text-muted-foreground">
                    Se cambia desde «Cambiar credenciales».
                  </p>
                </div>
              </div>
            </section>

            <Separator />

            {/* Programa / Sede / Modalidad */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Vinculación académica
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Facultad" error={errors.facultad?.message} required>
                  <Select
                    value={facultadW ?? ""}
                    onValueChange={(v) => {
                      form.setValue("facultad", v, { shouldValidate: true })
                      if (!FACULTAD_PROGRAMAS[v]?.includes(programaW ?? "")) {
                        form.setValue("programa", "", { shouldValidate: true })
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar facultad" />
                    </SelectTrigger>
                    <SelectContent>
                      {FACULTADES.map((f) => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Programa" error={errors.programa?.message} required>
                  <Select
                    value={programaW ?? ""}
                    onValueChange={(v) => form.setValue("programa", v, { shouldValidate: true })}
                    disabled={!facultadW}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={facultadW ? "Seleccionar programa" : "Elige una facultad primero"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(FACULTAD_PROGRAMAS[facultadW ?? ""] ?? []).map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Sede" error={errors.sedeBase?.message} required>
                  <Select
                    value={form.watch("sedeBase")}
                    onValueChange={(v) =>
                      form.setValue(
                        "sedeBase",
                        v as EditarDocenteSuperadminInput["sedeBase"],
                        { shouldValidate: true },
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEDES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Modalidad" error={errors.modalidad?.message} required>
                  <Select
                    value={form.watch("modalidad")}
                    onValueChange={(v) =>
                      form.setValue(
                        "modalidad",
                        v as EditarDocenteSuperadminInput["modalidad"],
                        { shouldValidate: true },
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODALIDADES.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              {/* Duración del contrato — solo ocasional/visitante/cátedra-visitante.
                  El INVITADO NO usa semanas: su base son las horas contratadas (abajo). */}
              {isTemporalNoInvitado && (
                <div className="space-y-3 rounded-md border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900 dark:bg-blue-950/30">
                  <p className="text-xs text-muted-foreground">
                    Duración del contrato. <span className="font-medium text-foreground/80">Lo principal son las fechas</span>:
                    SAGE deriva solo las semanas que caen en cada período (soporta contratos
                    multi-semestre, p. ej. un ocasional de ~11 meses).
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Inicio del contrato" error={errors.vinculacionDesde?.message}>
                      <Input type="date" {...form.register("vinculacionDesde")} />
                    </Field>
                    <Field label="Fin del contrato" error={errors.vinculacionHasta?.message}>
                      <Input type="date" {...form.register("vinculacionHasta")} />
                    </Field>
                  </div>
                  <Field
                    label="Semanas (alternativa — solo si no tenés las fechas exactas)"
                    error={errors.semanasVinculacion?.message}
                  >
                    <Input
                      type="number"
                      min={1}
                      max={22}
                      className="sm:w-44"
                      placeholder="Ej: 16"
                      {...form.register("semanasVinculacion", {
                        setValueAs: (v) =>
                          v === "" || v === null || v === undefined ? null : Number(v),
                      })}
                    />
                  </Field>
                </div>
              )}

              {/* Resumen de parámetros EFECTIVOS para las características del docente */}
              {modalidad && (
                <div className="rounded-md border bg-muted/30 p-3 text-xs">
                  <p className="font-medium text-foreground">Parámetros fijados para este docente</p>
                  {isInvitado ? (
                    <p className="mt-1 text-muted-foreground">
                      El invitado se rige por <span className="font-medium text-foreground/80">horas contratadas</span> (su 100%),
                      no por semanas. Defínelas abajo en la sección de invitación.
                    </p>
                  ) : (
                    <>
                      <p className="mt-1 text-muted-foreground">
                        <span className="font-mono font-medium text-foreground/80">{semanasEfectivas}</span> semanas ·{" "}
                        <span className="font-mono font-medium text-foreground/80">{horasSemanaEfectivas}</span> h/semana
                        {isTemporalNoInvitado && " (base; las reales se derivan del rango del contrato)"}
                        .
                      </p>
                      {isCatedra && (
                        <p className="mt-1 text-muted-foreground">
                          La cátedra usa <span className="font-medium text-foreground/80">16 h/sem en Neiva</span> y{" "}
                          <span className="font-medium text-foreground/80">19 en sedes regionales</span> (por eso varía con la sede).
                        </p>
                      )}
                      <p className="mt-1 text-[11px] text-muted-foreground/80">
                        Las semanas se configuran en <span className="font-medium">Parámetros Globales</span> y las horas/semana en{" "}
                        <span className="font-medium">Modalidades</span>.
                      </p>
                    </>
                  )}
                </div>
              )}
            </section>

            {isInvitado && (
              <>
                <Separator />
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Datos de invitación (Art. 4f)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Términos que autoriza el Consejo Académico. Las horas contratadas son la base
                    del 100% (tope de la agenda); las fechas registran la duración real (puede ser
                    de días). La aprobación de la agenda del invitado la hace el SuperAdmin.
                  </p>
                  <Field label="Objeto de la invitación" error={errors.invObjeto?.message}>
                    <Input
                      {...form.register("invObjeto")}
                      placeholder="Ej: Seminario doctoral en IA, módulo de 3 días"
                      maxLength={500}
                    />
                  </Field>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Field label="Desde" error={errors.invFechaDesde?.message}>
                      <Input type="date" {...form.register("invFechaDesde")} />
                    </Field>
                    <Field label="Hasta" error={errors.invFechaHasta?.message}>
                      <Input type="date" {...form.register("invFechaHasta")} />
                    </Field>
                    <Field label="Horas contratadas" error={errors.invHorasContratadas?.message}>
                      <Input
                        type="number"
                        min={1}
                        max={4000}
                        placeholder="Ej: 120"
                        value={form.watch("invHorasContratadas") ?? ""}
                        onChange={(e) => {
                          const raw = e.target.value
                          // Tope al máximo legal (4000) y mínimo 1; evita números absurdos.
                          const n =
                            raw === "" ? null : Math.min(4000, Math.max(1, Math.floor(Number(raw) || 0)))
                          form.setValue("invHorasContratadas", n, { shouldValidate: true })
                        }}
                      />
                    </Field>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Las <span className="font-medium text-foreground/80">horas contratadas</span> son el 100% de la
                    agenda del invitado (su tope). El invitado <span className="font-medium text-foreground/80">no</span> usa
                    semanas de vinculación: su duración son las fechas de arriba (pueden ser días).
                  </p>
                  <SwitchRow
                    icon={<ShieldAlert className="h-4 w-4" />}
                    label="Autorizado por el Consejo Académico"
                    description="Art. 4f — autorización expresa del CA para la vinculación"
                    checked={form.watch("invAutorizadoCA") ?? false}
                    onChange={(v) =>
                      form.setValue("invAutorizadoCA", v, { shouldValidate: true })
                    }
                  />
                </section>
              </>
            )}

            <Separator />

            {/* Condiciones académicas */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Condiciones académicas
              </h3>

              <SwitchRow
                icon={<GraduationCap className="h-4 w-4" />}
                label="Doctorado"
                description="Art. 4 Par. 3 — Vinculación a grupo de investigación"
                checked={doctorado}
                onChange={(v) => form.setValue("doctorado", v, { shouldValidate: true })}
              />
              {doctorado && (
                <div className="ml-7">
                  <Field
                    label="Área del doctorado"
                    error={errors.tituloDoctorado?.message}
                  >
                    <Input
                      {...form.register("tituloDoctorado")}
                      placeholder="Ej: Ingeniería de Sistemas"
                      maxLength={200}
                    />
                  </Field>
                </div>
              )}

              <SwitchRow
                icon={<Briefcase className="h-4 w-4" />}
                label="Cargo administrativo"
                description={
                  isCatedra
                    ? "Inhabilitado para Cátedra"
                    : isInvitado
                      ? "Inhabilitado para Invitado"
                      : "Art. 10 — Gestión ≤ 20% del tiempo"
                }
                checked={cargoAdministrativo}
                disabled={bloqueaCargo}
                onChange={(v) =>
                  form.setValue("cargoAdministrativo", v, { shouldValidate: true })
                }
              />
              {cargoAdministrativo && !bloqueaCargo && (
                <div className="ml-7">
                  <Field
                    label="Tipo de cargo"
                    error={errors.tipoCargo?.message}
                    required
                  >
                    <Select
                      value={form.watch("tipoCargo") ?? ""}
                      onValueChange={(v) => {
                        form.setValue("tipoCargo", v, { shouldValidate: true })
                        form.setValue("cargoAmbitoValor", "", { shouldValidate: true })
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona el cargo" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_CARGO.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  {ambitoCfg && (
                    <Field
                      label="Programa / Facultad"
                      error={errors.cargoAmbitoValor?.message}
                    >
                      <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                        {(ambitoCfg.tipo === "PROGRAMA" ? programaActual : facultadActual) || "—"}
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({ambitoCfg.tipo === "FACULTAD" ? "su propia facultad" : "su propio programa"}, )
                        </span>
                      </div>
                    </Field>
                  )}
                </div>
              )}

              <SwitchRow
                icon={<FolderOpen className="h-4 w-4" />}
                label="Proyectos activos"
                description={
                  isCatedra
                    ? "Inhabilitado para Cátedra"
                    : "Art. 3 Par. 1 — Reduce mínimo de docencia"
                }
                checked={form.watch("proyectosActivos")}
                disabled={isCatedra}
                onChange={(v) =>
                  form.setValue("proyectosActivos", v, { shouldValidate: true })
                }
              />
            </section>
          </div>

          <div className="border-t p-4 flex items-center justify-between gap-3">
            <Badge variant="outline" className="text-[10px] font-normal">
              Acción auditada
            </Badge>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending} className="gap-2">
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isPending ? "Guardando…" : "Guardar cambios"}
              </Button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

// ─────────────────────────────────────────────────────────────
// Helpers visuales locales
// ─────────────────────────────────────────────────────────────

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </div>
  )
}

function SwitchRow({
  icon,
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  icon: React.ReactNode
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border p-3",
        disabled && "opacity-60 border-dashed",
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={cn(
            "shrink-0",
            checked && !disabled
              ? "text-emerald-600"
              : "text-muted-foreground",
          )}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  )
}
