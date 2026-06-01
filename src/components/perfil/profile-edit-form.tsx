"use client"

import { useEffect, useTransition } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { z } from "zod"
import type { Docente, SolicitudCambioPerfil } from "@/generated/prisma/client"
import { TIPOS_CARGO, MODALIDADES_ENUM } from "@/lib/schemas/profile-schema"
import { SEDES_ENUM } from "@/lib/schemas/solicitud-perfil-schema"
import { CARGO_AMBITO, opcionesAmbito } from "@/lib/constants"
import {
  crearSolicitudCambioPerfilAction,
  cancelarSolicitudCambioPerfilAction,
} from "@/lib/actions/solicitud-perfil"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft,
  Send,
  Loader2,
  ShieldAlert,
  GraduationCap,
  Briefcase,
  FolderOpen,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

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

const formSchema = z.object({
  modalidad: z.enum(MODALIDADES_ENUM),
  programa: z.string().trim().min(1, "Obligatorio.").max(200),
  facultad: z.string().trim().min(1, "Obligatorio.").max(200),
  sedeBase: z.enum(SEDES_ENUM),
  celular: z.string().trim().max(30).optional().nullable(),
  doctorado: z.boolean(),
  tituloDoctorado: z.string().max(200).optional().nullable(),
  cargoAdministrativo: z.boolean(),
  tipoCargo: z.string().optional().nullable(),
  cargoAmbitoValor: z.string().optional().nullable(),
  semanasVinculacion: z.number().int().min(1).max(22).nullable().optional(),
  motivoSolicitud: z.string().max(500).optional(),
})

type FormValues = z.infer<typeof formSchema>

type ExtendedDocente = Docente & {
  tipoCargo?: string | null
  tituloDoctorado?: string | null
  semanasVinculacion?: number | null
  celular?: string | null
}

export function ProfileEditForm({
  docente, maxSemanas,
  solicitudActiva,
  ultimaSolicitud,
}: {
  docente: ExtendedDocente; maxSemanas: number
  solicitudActiva: SolicitudCambioPerfil | null
  ultimaSolicitud: SolicitudCambioPerfil | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [cancelPending, startCancelTransition] = useTransition()

  const tienePendiente = solicitudActiva !== null
  const ultimoRechazo =
    !tienePendiente && ultimaSolicitud?.estado === "RECHAZADO"
      ? ultimaSolicitud
      : null
  const ultimoAprobado =
    !tienePendiente && ultimaSolicitud?.estado === "APROBADO"
      ? ultimaSolicitud
      : null

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      modalidad: docente.modalidad as FormValues["modalidad"],
      programa: docente.programa,
      facultad: docente.facultad,
      sedeBase: docente.sedeBase as FormValues["sedeBase"],
      celular: docente.celular ?? "",
      doctorado: docente.doctorado,
      tituloDoctorado: docente.tituloDoctorado ?? "",
      cargoAdministrativo: docente.cargoAdministrativo,
      tipoCargo: docente.tipoCargo ?? "",
      cargoAmbitoValor: docente.cargoAmbitoValor ?? "",
      semanasVinculacion: docente.semanasVinculacion ?? undefined,
      motivoSolicitud: "",
    },
  })

  const watchedModalidad = useWatch({ control: form.control, name: "modalidad" })
  const watchedDoctorado = useWatch({ control: form.control, name: "doctorado" })
  const watchedCargo = useWatch({
    control: form.control,
    name: "cargoAdministrativo",
  })
  const watchedTipoCargo = useWatch({ control: form.control, name: "tipoCargo" })

  const ambitoCfg = watchedTipoCargo ? CARGO_AMBITO[watchedTipoCargo] ?? null : null
  const ambitoOpciones = opcionesAmbito(watchedTipoCargo)
  const isCatedra = watchedModalidad === "CATEDRA"
  const isModalidadTemporal = MODALIDADES_TEMPORALES.has(watchedModalidad ?? "")

  useEffect(() => {
    if (isCatedra) {
      form.setValue("cargoAdministrativo", false, { shouldValidate: true })
    }
  }, [isCatedra, form])

  useEffect(() => {
    if (!watchedDoctorado) {
      form.setValue("tituloDoctorado", "", { shouldValidate: true })
    }
  }, [watchedDoctorado, form])

  useEffect(() => {
    if (!watchedCargo) {
      form.setValue("tipoCargo", "", { shouldValidate: true })
      form.setValue("cargoAmbitoValor", "", { shouldValidate: true })
    }
  }, [watchedCargo, form])

  function onSubmit(data: FormValues) {
    if (tienePendiente) return
    startTransition(async () => {
      const result = await crearSolicitudCambioPerfilAction({
        modalidad: data.modalidad,
        programa: data.programa,
        facultad: data.facultad,
        sedeBase: data.sedeBase,
        celular: data.celular?.trim() ? data.celular.trim() : null,
        cargoAdministrativo: data.cargoAdministrativo,
        tipoCargo: data.cargoAdministrativo ? data.tipoCargo || null : null,
        cargoAmbitoValor:
          data.cargoAdministrativo && data.tipoCargo && CARGO_AMBITO[data.tipoCargo]
            ? data.cargoAmbitoValor || null
            : null,
        doctorado: data.doctorado,
        tituloDoctorado: data.doctorado ? (data.tituloDoctorado || null) : null,
        semanasVinculacion: data.semanasVinculacion ?? null,
        motivoSolicitud: data.motivoSolicitud?.trim() || undefined,
      })

      if ("error" in result) {
        toast.error(result.error)
      } else {
        toast.success("Solicitud enviada. Espera la revisión del admin.")
        router.push("/perfil/solicitudes")
        router.refresh()
      }
    })
  }

  function handleCancelar() {
    if (!solicitudActiva) return
    startCancelTransition(async () => {
      const res = await cancelarSolicitudCambioPerfilAction(solicitudActiva.id)
      if ("error" in res) {
        toast.error(res.error)
      } else {
        toast.success("Solicitud cancelada.")
        router.refresh()
      }
    })
  }

  const disabled = tienePendiente || isPending

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link href="/perfil">
            <ArrowLeft className="h-4 w-4" />
            Volver al perfil
          </Link>
        </Button>

        {/* Estado de solicitudes */}
        {tienePendiente && solicitudActiva && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Solicitud en revisión
              </p>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                Tu solicitud del{" "}
                {new Date(solicitudActiva.createdAt).toLocaleDateString("es-CO", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}{" "}
                está pendiente de aprobación. No puedes enviar otra hasta que el
                admin la resuelva.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/perfil/solicitudes/${solicitudActiva.id}`}>
                    Ver solicitud
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelar}
                  disabled={cancelPending}
                  className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400"
                >
                  {cancelPending ? "Cancelando..." : "Cancelar solicitud"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {ultimoRechazo && (
          <div className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
            <div>
              <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                Tu última solicitud fue rechazada
              </p>
              {ultimoRechazo.observacionesAdmin && (
                <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                  <span className="font-medium">Motivo:</span>{" "}
                  {ultimoRechazo.observacionesAdmin}
                </p>
              )}
              <p className="mt-2 text-xs text-red-700/80 dark:text-red-400/80">
                Puedes corregir los datos abajo y enviar una nueva solicitud.
              </p>
            </div>
          </div>
        )}

        {ultimoAprobado && (
          <div className="flex items-start gap-3 rounded-lg border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                Tu última solicitud fue aprobada
              </p>
              <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400">
                Los cambios ya se reflejan en tu perfil.
              </p>
            </div>
          </div>
        )}

        {/* Identidad (no editable) */}
        <Card>
          <CardHeader>
            <CardTitle>Identidad</CardTitle>
            <CardDescription>
              Nombre, cédula y email no se pueden cambiar desde aquí.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-medium text-muted-foreground">Nombre</dt>
                <dd>{docente.nombre}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">Cédula</dt>
                <dd>{docente.cedula}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">Email</dt>
                <dd>{docente.email}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">
                  Estado de cuenta
                </dt>
                <dd>
                  <Badge variant="secondary">{docente.estadoCuenta}</Badge>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Datos académicos editables vía solicitud */}
        <Card>
          <CardHeader>
            <CardTitle>Datos académicos</CardTitle>
            <CardDescription>
              Estos cambios se envían como solicitud y requieren aprobación del
              administrador antes de aplicarse a tu perfil.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="programa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Programa *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      disabled={disabled}
                      placeholder="Ej: Ingeniería de Sistemas"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="facultad"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Facultad *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      disabled={disabled}
                      placeholder="Ej: Ingeniería"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sedeBase"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sede *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={disabled}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar sede" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SEDES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="celular"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Celular</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      disabled={disabled}
                      placeholder="Ej: 3001234567"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Modalidad */}
        <Card>
          <CardHeader>
            <CardTitle>Modalidad de Vinculación</CardTitle>
            <CardDescription>
              El tipo de vinculación contractual determina los límites
              legales de carga horaria (Art. 4, Acuerdo 048).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="modalidad"
              render={({ field }) => (
                <FormItem className="max-w-sm">
                  <FormLabel>Modalidad *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={disabled}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar modalidad" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MODALIDADES.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isModalidadTemporal && (
              <FormField
                control={form.control}
                name="semanasVinculacion"
                render={({ field }) => (
                  <FormItem className="max-w-sm animate-in fade-in slide-in-from-top-2">
                    <FormLabel>Semanas de vinculación</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={maxSemanas}
                        placeholder={`Ej: ${maxSemanas}`}
                        disabled={disabled}
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          if (!e.target.value) return field.onChange(null)
                          const clamped = Math.min(Math.max(parseInt(e.target.value, 10), 1), maxSemanas)
                          e.target.value = String(clamped)
                          field.onChange(clamped)
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      
                      Semanas de su contrato en este período (1–{maxSemanas}). Opcional — si se omite, SAGE usa {maxSemanas} semanas como referencia.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        {isCatedra && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Restricción Estatutaria — Modalidad Cátedra
              </p>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                El Acuerdo 048 de 2018 prohíbe a los docentes catedráticos
                desempeñar cargos administrativos (Art. 10) o tener proyectos
                activos asignados a su carga laboral (Art. 3 Par. 1).
              </p>
            </div>
          </div>
        )}

        {/* Condiciones académicas */}
        <Card>
          <CardHeader>
            <CardTitle>Condiciones Académicas</CardTitle>
            <CardDescription>
              Flags normativos del Acuerdo 048 que afectan el cálculo de
              la carga académica semestral.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="doctorado"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      <GraduationCap
                        className={cn(
                          "h-5 w-5",
                          field.value ? "text-emerald-600" : "text-muted-foreground",
                        )}
                      />
                      <div className="space-y-0.5">
                        <FormLabel className="text-base cursor-pointer">
                          Doctorado
                        </FormLabel>
                        <FormDescription>
                          Art. 4 Par. 3 — Vinculación obligatoria a grupo de investigación
                        </FormDescription>
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={disabled}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {watchedDoctorado && (
                <FormField
                  control={form.control}
                  name="tituloDoctorado"
                  render={({ field }) => (
                    <FormItem className="animate-in fade-in slide-in-from-top-2 ml-14">
                      <FormLabel>Área del doctorado</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej: Ingeniería de Sistemas"
                          maxLength={200}
                          disabled={disabled}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <Separator />

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="cargoAdministrativo"
                render={({ field }) => (
                  <FormItem
                    className={cn(
                      "flex items-center justify-between rounded-lg border p-4 transition-colors",
                      isCatedra && "opacity-50 border-dashed",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Briefcase
                        className={cn(
                          "h-5 w-5",
                          field.value && !isCatedra
                            ? "text-emerald-600"
                            : "text-muted-foreground",
                        )}
                      />
                      <div className="space-y-0.5">
                        <FormLabel className="text-base cursor-pointer">
                          Cargo Administrativo
                        </FormLabel>
                        <FormDescription>
                          {isCatedra
                            ? "Estatutariamente inhabilitado para modalidad Cátedra"
                            : "Art. 10 — Gestión no puede exceder 20% del tiempo laboral"}
                        </FormDescription>
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isCatedra || disabled}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {watchedCargo && !isCatedra && (
                <FormField
                  control={form.control}
                  name="tipoCargo"
                  render={({ field }) => (
                    <FormItem className="animate-in fade-in slide-in-from-top-2 ml-14">
                      <FormLabel>Tipo de cargo</FormLabel>
                      <Select
                        onValueChange={(v) => {
                          field.onChange(v)
                          // Al cambiar de cargo, el ámbito previo deja de ser válido.
                          form.setValue("cargoAmbitoValor", "", { shouldValidate: true })
                        }}
                        value={field.value || ""}
                        disabled={disabled}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full sm:max-w-xs">
                            <SelectValue placeholder="Seleccione el cargo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TIPOS_CARGO.map((cargo) => (
                            <SelectItem key={cargo.value} value={cargo.value}>
                              {cargo.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* "¿De cuál?" — ámbito específico del cargo. No se asume nada. */}
              {watchedCargo && !isCatedra && ambitoCfg && (
                <FormField
                  control={form.control}
                  name="cargoAmbitoValor"
                  render={({ field }) => (
                    <FormItem className="animate-in fade-in slide-in-from-top-2 ml-14">
                      <FormLabel>Programa / Facultad</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                        disabled={disabled}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full sm:max-w-xs">
                            <SelectValue placeholder={ambitoCfg.tipo === "FACULTAD" ? "Seleccionar facultad" : "Seleccionar programa"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ambitoOpciones.map((op) => (
                            <SelectItem key={op} value={op}>{op}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Indica específicamente cuál corresponde a tu cargo.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <Separator />

            <div className="flex items-start justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <FolderOpen
                  className={cn(
                    "h-5 w-5 shrink-0",
                    docente.proyectosActivos ? "text-emerald-600" : "text-muted-foreground",
                  )}
                />
                <div className="space-y-0.5">
                  <p className="text-base font-medium">Proyectos Activos</p>
                  <p className="text-sm text-muted-foreground">
                    Art. 3 Par. 1 — Se activa automáticamente cuando un proyecto es aprobado.{" "}
                    <Link href="/proyectos" className="underline underline-offset-2 hover:text-foreground">
                      Gestioná tus proyectos →
                    </Link>
                  </p>
                </div>
              </div>
              <Badge variant={docente.proyectosActivos ? "default" : "secondary"}>
                {docente.proyectosActivos ? "Sí" : "No"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Motivo de la solicitud */}
        <Card>
          <CardHeader>
            <CardTitle>Motivo del cambio</CardTitle>
            <CardDescription>
              Opcional. Explica brevemente por qué pides el cambio. Ayuda al
              admin a aprobar la solicitud más rápido.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="motivoSolicitud"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      disabled={disabled}
                      rows={3}
                      maxLength={500}
                      placeholder="Ej: Cambio de programa por reasignación del Decano…"
                    />
                  </FormControl>
                  <FormDescription>
                    {(field.value?.length ?? 0)}/500
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button asChild variant="outline" type="button">
            <Link href="/perfil">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={disabled} className="gap-2">
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isPending ? "Enviando…" : "Enviar solicitud para revisión"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
