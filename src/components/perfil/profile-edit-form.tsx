"use client"

import { useEffect, useState, useTransition } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import type { Docente } from "@/generated/prisma/client"
import { profileSchema, TIPOS_CARGO, type ProfileFormData } from "@/lib/schemas/profile-schema"
import { updateProfileAction } from "@/lib/actions/profile-actions"
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
import {
  ArrowLeft,
  Save,
  Loader2,
  ShieldAlert,
  GraduationCap,
  Briefcase,
  FolderOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"

const MODALIDADES = [
  { value: "PLANTA_TC", label: "Tiempo Completo Planta" },
  { value: "OCASIONAL_TC", label: "Tiempo Completo Ocasional" },
  { value: "PLANTA_MT", label: "Medio Tiempo Planta" },
  { value: "OCASIONAL_MT", label: "Medio Tiempo Ocasional" },
  { value: "CATEDRA", label: "Cátedra" },
  { value: "VISITANTE", label: "Visitante" },
  { value: "INVITADO", label: "Invitado" },
] as const

/**
 * ProfileEditForm — Client Component implementing Lock #1 (UI Lock)
 * of the Triple-Lock architecture.
 *
 * When modalidad === "CATEDRA":
 * 1. Physically disables cargoAdministrativo and proyectosActivos switches
 * 2. Forces both values to false via setValue
 * 3. Shows a statutory warning banner
 */
// Fix TypeScript complaining about missing tipoCargo until prisma is generated
type ExtendedDocente = Docente & { tipoCargo?: string | null }

export function ProfileEditForm({ docente }: { docente: ExtendedDocente }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      modalidad: docente.modalidad as ProfileFormData["modalidad"],
      doctorado: docente.doctorado,
      cargoAdministrativo: docente.cargoAdministrativo,
      tipoCargo: docente.tipoCargo || "",
      proyectosActivos: docente.proyectosActivos,
    },
  })

  // Watch modalidad reactively for the UI lock
  const watchedModalidad = useWatch({
    control: form.control,
    name: "modalidad",
  })
  
  const watchedCargoAdministrativo = useWatch({
    control: form.control,
    name: "cargoAdministrativo",
  })

  const isCatedra = watchedModalidad === "CATEDRA"

  // =========================================================
  // Lock #1: Frontend UI Lock
  // When modalidad switches to CATEDRA, force-disable the flags
  // Also clear conditional fields when disabled.
  // =========================================================
  useEffect(() => {
    if (isCatedra) {
      form.setValue("cargoAdministrativo", false, { shouldValidate: true })
      form.setValue("proyectosActivos", false, { shouldValidate: true })
    }
  }, [isCatedra, form])

  // Clear tipoCargo when cargoAdministrativo is disabled
  useEffect(() => {
    if (!watchedCargoAdministrativo) {
      form.setValue("tipoCargo", "", { shouldValidate: true })
    }
  }, [watchedCargoAdministrativo, form])

  async function onSubmit(data: ProfileFormData) {
    startTransition(async () => {
      const result = await updateProfileAction(data)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Perfil actualizado exitosamente.")
        router.push("/perfil")
        router.refresh()
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Back button */}
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link href="/perfil">
            <ArrowLeft className="h-4 w-4" />
            Volver al perfil
          </Link>
        </Button>

        {/* ── Datos no editables (información) ── */}
        <Card>
          <CardHeader>
            <CardTitle>Datos del Docente</CardTitle>
            <CardDescription>
              Estos datos son de solo lectura. Para modificarlos, contacte
              a la administración.
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
                <dt className="font-medium text-muted-foreground">Sede</dt>
                <dd>
                  <Badge variant="secondary">{docente.sedeBase}</Badge>
                </dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">Facultad</dt>
                <dd>{docente.facultad}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">Programa</dt>
                <dd>{docente.programa}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* ── Modalidad de vinculación ── */}
        <Card>
          <CardHeader>
            <CardTitle>Modalidad de Vinculación</CardTitle>
            <CardDescription>
              El tipo de vinculación contractual determina los límites
              legales de carga horaria (Art. 4, Acuerdo 048).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="modalidad"
              render={({ field }) => (
                <FormItem className="max-w-sm">
                  <FormLabel>Modalidad *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
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
          </CardContent>
        </Card>

        {/* ── CATEDRA statutory warning ── */}
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
                Estos campos han sido deshabilitados automáticamente.
              </p>
            </div>
          </div>
        )}

        {/* ── Condiciones Académicas (flags) ── */}
        <Card>
          <CardHeader>
            <CardTitle>Condiciones Académicas</CardTitle>
            <CardDescription>
              Flags normativos del Acuerdo 048 que afectan el cálculo de
              la carga académica semestral.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Doctorado */}
            <FormField
              control={form.control}
              name="doctorado"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <GraduationCap className={cn(
                      "h-5 w-5",
                      field.value ? "text-emerald-600" : "text-muted-foreground"
                    )} />
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
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Separator />

            {/* Cargo Administrativo */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="cargoAdministrativo"
                render={({ field }) => (
                  <FormItem className={cn(
                    "flex items-center justify-between rounded-lg border p-4 transition-colors",
                    isCatedra && "opacity-50 border-dashed"
                  )}>
                    <div className="flex items-center gap-3">
                      <Briefcase className={cn(
                        "h-5 w-5",
                        field.value && !isCatedra ? "text-emerald-600" : "text-muted-foreground"
                      )} />
                      <div className="space-y-0.5">
                        <FormLabel className="text-base cursor-pointer">
                          Cargo Administrativo
                        </FormLabel>
                        <FormDescription>
                          {isCatedra
                            ? "Estatutariamente inhabilitado para modalidad Cátedra"
                            : "Art. 10 — Gestión no puede exceder 20% del tiempo laboral"
                          }
                        </FormDescription>
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isCatedra}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchedCargoAdministrativo && !isCatedra && (
                <FormField
                  control={form.control}
                  name="tipoCargo"
                  render={({ field }) => (
                    <FormItem className="animate-in fade-in slide-in-from-top-2 ml-14">
                      <FormLabel>Tipo de cargo</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value || ""}
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
            </div>

            <Separator />

            {/* Proyectos Activos */}
            <FormField
              control={form.control}
              name="proyectosActivos"
              render={({ field }) => (
                <FormItem className={cn(
                  "flex items-center justify-between rounded-lg border p-4 transition-colors",
                  isCatedra && "opacity-50 border-dashed"
                )}>
                  <div className="flex items-center gap-3">
                    <FolderOpen className={cn(
                      "h-5 w-5",
                      field.value && !isCatedra ? "text-emerald-600" : "text-muted-foreground"
                    )} />
                    <div className="space-y-0.5">
                      <FormLabel className="text-base cursor-pointer">
                        Proyectos Activos
                      </FormLabel>
                      <FormDescription>
                        {isCatedra
                          ? "Estatutariamente inhabilitado para modalidad Cátedra"
                          : "Art. 3 Par. 1 — Reduce el mínimo de horas de docencia"
                        }
                      </FormDescription>
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isCatedra}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* ── Submit button ── */}
        <div className="flex items-center justify-end gap-3">
          <Button
            asChild
            variant="outline"
            type="button"
          >
            <Link href="/perfil">Cancelar</Link>
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="gap-2"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isPending ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
