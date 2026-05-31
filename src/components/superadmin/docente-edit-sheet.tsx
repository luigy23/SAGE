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
  ShieldCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  editarDocenteSuperadminSchema,
  type EditarDocenteSuperadminInput,
} from "@/lib/schemas/superadmin-docente-schema"
import { TIPOS_CARGO } from "@/lib/schemas/profile-schema"
import { editarDocenteSuperadminAction } from "@/lib/actions/superadmin-docente-edit"

const MODALIDADES = [
  { value: "PLANTA_TC", label: "Tiempo Completo Planta" },
  { value: "OCASIONAL_TC", label: "Tiempo Completo Ocasional" },
  { value: "PLANTA_MT", label: "Medio Tiempo Planta" },
  { value: "OCASIONAL_MT", label: "Medio Tiempo Ocasional" },
  { value: "CATEDRA", label: "Cátedra" },
  { value: "VISITANTE_TC", label: "Visitante Tiempo Completo" },
  { value: "VISITANTE_MT", label: "Visitante Medio Tiempo" },
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
  proyectosActivos: boolean
  semanasVinculacion?: number | null
  perfilVerificado: boolean
}

export function DocenteEditSheet({ usuario }: { usuario: Usuario }) {
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
      proyectosActivos: usuario.proyectosActivos,
      semanasVinculacion: usuario.semanasVinculacion ?? undefined,
      perfilVerificado: usuario.perfilVerificado,
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
        proyectosActivos: usuario.proyectosActivos,
        semanasVinculacion: usuario.semanasVinculacion ?? undefined,
        perfilVerificado: usuario.perfilVerificado,
      })
    }
  }, [open, usuario, form])

  const modalidad = useWatch({ control: form.control, name: "modalidad" })
  const doctorado = useWatch({ control: form.control, name: "doctorado" })
  const cargoAdministrativo = useWatch({
    control: form.control,
    name: "cargoAdministrativo",
  })

  const isCatedra = modalidad === "CATEDRA"
  const isModalidadTemporal = MODALIDADES_TEMPORALES.has(modalidad ?? "")

  // UI Lock — CATEDRA fuerza false
  useEffect(() => {
    if (isCatedra) {
      form.setValue("cargoAdministrativo", false, { shouldValidate: true })
      form.setValue("proyectosActivos", false, { shouldValidate: true })
      form.setValue("tipoCargo", "", { shouldValidate: true })
    }
  }, [isCatedra, form])

  // Si no hay doctorado, limpiar título
  useEffect(() => {
    if (!doctorado) form.setValue("tituloDoctorado", "", { shouldValidate: true })
  }, [doctorado, form])

  // Si no hay cargo, limpiar tipoCargo
  useEffect(() => {
    if (!cargoAdministrativo)
      form.setValue("tipoCargo", "", { shouldValidate: true })
  }, [cargoAdministrativo, form])

  function onSubmit(data: EditarDocenteSuperadminInput) {
    startTransition(async () => {
      const res = await editarDocenteSuperadminAction(usuario.id, {
        ...data,
        celular: data.celular?.trim() ? data.celular.trim() : null,
        tituloDoctorado: data.tituloDoctorado?.trim() || null,
        tipoCargo: data.tipoCargo?.trim() || null,
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
                inmediatamente. El email es inmutable. Para cambiar rol o
                estado de la cuenta usa los controles dedicados.
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
                    No editable (identificador único).
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
                  <Input {...form.register("facultad")} />
                </Field>
                <Field label="Programa" error={errors.programa?.message} required>
                  <Input {...form.register("programa")} />
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
                {isModalidadTemporal && (
                  <Field
                    label="Semanas de vinculación"
                    error={errors.semanasVinculacion?.message}
                  >
                    <Input
                      type="number"
                      min={1}
                      max={22}
                      {...form.register("semanasVinculacion", {
                        setValueAs: (v) =>
                          v === "" || v === null || v === undefined
                            ? null
                            : Number(v),
                      })}
                    />
                  </Field>
                )}
              </div>

              {isCatedra && (
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 dark:border-amber-800 dark:bg-amber-950">
                  <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    Modalidad Cátedra: cargo administrativo y proyectos activos
                    quedan deshabilitados automáticamente (Art. 10 y Art. 3 Par. 1).
                  </p>
                </div>
              )}
            </section>

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
                    : "Art. 10 — Gestión ≤ 20% del tiempo"
                }
                checked={cargoAdministrativo}
                disabled={isCatedra}
                onChange={(v) =>
                  form.setValue("cargoAdministrativo", v, { shouldValidate: true })
                }
              />
              {cargoAdministrativo && !isCatedra && (
                <div className="ml-7">
                  <Field
                    label="Tipo de cargo"
                    error={errors.tipoCargo?.message}
                    required
                  >
                    <Select
                      value={form.watch("tipoCargo") ?? ""}
                      onValueChange={(v) =>
                        form.setValue("tipoCargo", v, { shouldValidate: true })
                      }
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

            <Separator />

            {/* Flag administrativo */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Marca administrativa
              </h3>
              <SwitchRow
                icon={<ShieldCheck className="h-4 w-4" />}
                label="Perfil verificado"
                description="Si está apagado, el docente debe confirmar sus datos en /perfil/editar antes de usar el sistema."
                checked={form.watch("perfilVerificado") ?? false}
                onChange={(v) =>
                  form.setValue("perfilVerificado", v, { shouldValidate: true })
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
