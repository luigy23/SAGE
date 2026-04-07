"use client"

import { useEffect, useMemo } from "react"
import { useFormContext, useFieldArray, useWatch } from "react-hook-form"
import type { CursoGuardado } from "@/generated/prisma/client"
import type { AgendaWizardFormData } from "@/lib/schemas/agenda-schema"
import { EMPTY_CURSO, EMPTY_ACTIVIDAD } from "@/lib/schemas/agenda-schema"
import { SEDES } from "@/lib/constants"
import { getMaxHoras } from "@/lib/utils/periodo"
import { CursoCombobox } from "@/components/agenda/CursoCombobox"
import { CalculadoraActividad } from "@/components/agenda/CalculadoraActividad"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form"
import {
  Plus,
  Trash2,
  BookOpen,
  GraduationCap,
} from "lucide-react"

// ==========================================
// Días de la semana
// ==========================================
const DIAS = [
  { key: "lunes", label: "Lun", fullLabel: "Lunes" },
  { key: "martes", label: "Mar", fullLabel: "Martes" },
  { key: "miercoles", label: "Mié", fullLabel: "Miércoles" },
  { key: "jueves", label: "Jue", fullLabel: "Jueves" },
  { key: "viernes", label: "Vie", fullLabel: "Viernes" },
  { key: "sabado", label: "Sáb", fullLabel: "Sábado" },
  { key: "domingo", label: "Dom", fullLabel: "Domingo" },
] as const

type DiaKey = (typeof DIAS)[number]["key"]

// ==========================================
// Helper: parsea "08:00-10:00" → { inicio, fin }
// ==========================================
function parseHorarioString(val: string | null | undefined): {
  inicio: string
  fin: string
} {
  if (!val) return { inicio: "", fin: "" }
  const parts = val.split("-")
  return {
    inicio: parts[0]?.trim() || "",
    fin: parts[1]?.trim() || "",
  }
}

// ==========================================
// Sub-componente: Time inputs para un día activo
// ==========================================
function ActiveDayTimeInputs({
  cursoIndex,
  diaKey,
  diaLabel,
}: {
  cursoIndex: number
  diaKey: DiaKey
  diaLabel: string
}) {
  const { setValue } = useFormContext<AgendaWizardFormData>()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentValue = useWatch({ name: `cursos.${cursoIndex}.horarios.${diaKey}` as any }) as string | null | undefined
  const parsed = parseHorarioString(currentValue)

  function handleTimeChange(type: "inicio" | "fin", value: string) {
    const newInicio = type === "inicio" ? value : parsed.inicio
    const newFin = type === "fin" ? value : parsed.fin

    if (newInicio && newFin) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setValue(`cursos.${cursoIndex}.horarios.${diaKey}` as any, `${newInicio}-${newFin}`, { shouldDirty: true })
    } else {
      const partial = `${newInicio || "00:00"}-${newFin || "00:00"}`
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setValue(`cursos.${cursoIndex}.horarios.${diaKey}` as any, partial, { shouldDirty: true })
    }
  }

  const tiempoInvalido = parsed.inicio && parsed.fin && parsed.inicio >= parsed.fin

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 transition-colors">
      <span className="text-sm font-medium text-foreground min-w-[4rem]">
        {diaLabel}
      </span>
      <input
        type="time"
        value={parsed.inicio}
        onChange={(e) => handleTimeChange("inicio", e.target.value)}
        className="h-8 rounded-md border border-input bg-background px-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow"
        aria-label={`Hora inicio ${diaLabel}`}
      />
      <span className="text-xs text-muted-foreground font-medium">a</span>
      <input
        type="time"
        value={parsed.fin}
        min={parsed.inicio || undefined}
        onChange={(e) => handleTimeChange("fin", e.target.value)}
        className={`h-8 rounded-md border bg-background px-2 text-sm shadow-sm focus:outline-none focus:ring-2 transition-shadow ${
          tiempoInvalido
            ? "border-destructive focus:ring-destructive/40"
            : "border-input focus:ring-ring/40"
        }`}
        aria-label={`Hora fin ${diaLabel}`}
      />
      {tiempoInvalido && (
        <span className="text-xs font-medium text-destructive whitespace-nowrap">
          Fin debe ser posterior
        </span>
      )}
    </div>
  )
}

// ==========================================
// Sub-componente: Horario con Chips/Toggles horizontales
// ==========================================
function HorarioChipToggles({ cursoIndex }: { cursoIndex: number }) {
  const { setValue } = useFormContext<AgendaWizardFormData>()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const horarios = useWatch({ name: `cursos.${cursoIndex}.horarios` as any }) as Record<string, string | null | undefined> | undefined

  const activeDays = useMemo(() => {
    return DIAS.filter((dia) => !!horarios?.[dia.key])
  }, [horarios])

  function handleToggle(diaKey: DiaKey) {
    const isActive = !!horarios?.[diaKey]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const path = `cursos.${cursoIndex}.horarios.${diaKey}` as any

    if (isActive) {
      setValue(path, null, { shouldDirty: true })
    } else {
      setValue(path, "07:00-09:00", { shouldDirty: true })
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Horario Semanal
      </p>

      {/* Horizontal toggle chips */}
      <div className="flex flex-wrap gap-2">
        {DIAS.map((dia) => {
          const isActive = !!horarios?.[dia.key]
          return (
            <button
              key={dia.key}
              type="button"
              onClick={() => handleToggle(dia.key)}
              className={`
                inline-flex items-center rounded-full px-3.5 py-1.5 text-sm font-medium
                border transition-all duration-150 select-none
                focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                ${
                  isActive
                    ? "border-primary bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                    : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                }
              `}
              aria-pressed={isActive}
              aria-label={`${isActive ? "Desactivar" : "Activar"} ${dia.fullLabel}`}
            >
              {dia.label}
            </button>
          )
        })}
      </div>

      {/* Time inputs for active days */}
      {activeDays.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {activeDays.map((dia) => (
            <ActiveDayTimeInputs
              key={dia.key}
              cursoIndex={cursoIndex}
              diaKey={dia.key}
              diaLabel={dia.fullLabel}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ==========================================
// Sub-componente: Silent Acuerdo 048 calculator
// ==========================================
function SilentDedicacionCalc({ cursoIndex }: { cursoIndex: number }) {
  const { setValue } = useFormContext<AgendaWizardFormData>()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const horasPresenciales = useWatch({ name: `cursos.${cursoIndex}.horasPresenciales` as any }) as number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const semanas = useWatch({ name: `cursos.${cursoIndex}.semanas` as any }) as number

  useEffect(() => {
    const horas = Number(horasPresenciales) || 0
    const sem = Number(semanas) || 0
    // Acuerdo 048: ((Horas directas × 1.5 preparación) + 1 hora tutoría) × semanas
    const semanales = horas > 0 ? (horas * 1.5) + 1 : 0
    const totalLegal = semanales * sem

    setValue(`cursos.${cursoIndex}.dedicacionPeriodo`, totalLegal, { shouldValidate: true })
  }, [horasPresenciales, semanas, cursoIndex, setValue])

  // Renders nothing — purely a side-effect hook
  return null
}

// ==========================================
// Componente principal: Paso 2 — Docencia
// ==========================================

/**
 * Paso 2 — Sección 1: Docencia
 *
 * Contiene:
 * - 1.0 Cursos Asignados (useFieldArray "cursos")
 *   - 12-column grid with exact wireframe spans
 *   - Silent Acuerdo 048 dedication calculator
 *   - Horizontal chip/toggle day picker for schedule
 *   - Poka-yoke: maxPresenciales derived from modality
 *
 * - 1.2 Otras Actividades de Docencia (useFieldArray "otrasActividadesDocencia")
 */
export function StepDocencia({
  cursosGuardados,
  modalidad,
  sedeBase,
}: {
  cursosGuardados: CursoGuardado[]
  modalidad: string
  sedeBase?: string | null
}) {
  const { control, setValue, watch } = useFormContext<AgendaWizardFormData>()

  // Poka-yoke: derive physical max from modality + sede
  const { maxHoras } = getMaxHoras(modalidad, sedeBase)
  const maxPresenciales = Math.floor((maxHoras - 1) / 1.5)

  const {
    fields: cursoFields,
    append: appendCurso,
    remove: removeCurso,
  } = useFieldArray({ control, name: "cursos" })

  const {
    fields: actDocenciaFields,
    append: appendActDocencia,
    remove: removeActDocencia,
  } = useFieldArray({ control, name: "otrasActividadesDocencia" })

  function handleCursoImport(index: number, curso: CursoGuardado) {
    setValue(`cursos.${index}.numeroCurso`, curso.numeroCurso, { shouldValidate: true })
    setValue(`cursos.${index}.nombreCurso`, curso.nombreCurso, { shouldValidate: true })
    setValue(`cursos.${index}.subgrupo`, curso.subgrupo || "")
    setValue(`cursos.${index}.sede`, curso.sede || "")
    setValue(`cursos.${index}.horasPresenciales`, curso.horasPresenciales ?? 0)
    setValue(`cursos.${index}.creditos`, curso.creditos ?? 0)
    setValue(`cursos.${index}.semanas`, curso.semanas ?? 0)
  }

  return (
    <div className="space-y-8">
      {/* ==========================================
          Sección 1.0: Cursos Asignados
          ========================================== */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <CardTitle>1.0 Cursos Asignados</CardTitle>
          </div>
          <CardDescription>
            Agregue los cursos que dictará este semestre. Use el buscador (🔍)
            para importar datos de sus cursos guardados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {cursoFields.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <BookOpen className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                No hay cursos agregados. Haga clic en &ldquo;Agregar Curso&rdquo; para comenzar.
              </p>
            </div>
          )}

          {cursoFields.map((field, index) => (
            <Card
              key={field.id}
              className="bg-card border shadow-sm overflow-hidden"
            >
              {/* Card header */}
              <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {index + 1}
                  </span>
                  Curso #{index + 1}
                </h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCurso(index)}
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  title="Eliminar curso"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <CardContent className="p-4 pt-5 space-y-5">
                {/* Silent Acuerdo 048 calculator — renders nothing */}
                <SilentDedicacionCalc cursoIndex={index} />

                {/* ========== 12-COLUMN GRID ========== */}
                <div className="grid grid-cols-12 gap-x-6 gap-y-4">

                  {/* === ROW 1 === */}
                  {/* Sede (3 cols) */}
                  <div className="col-span-12 md:col-span-3">
                    <FormField
                      control={control}
                      name={`cursos.${index}.sede`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel>Sede</FormLabel>
                          <Select
                            value={f.value || ""}
                            onValueChange={f.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {SEDES.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Nombre del curso + Combobox (9 cols) */}
                  <div className="col-span-12 md:col-span-9">
                    <FormField
                      control={control}
                      name={`cursos.${index}.nombreCurso`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel>Nombre del Curso *</FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input
                                {...f}
                                placeholder="Ej: Cálculo Integral"
                              />
                            </FormControl>
                            <CursoCombobox
                              cursosGuardados={cursosGuardados}
                              selectedNombre={watch(`cursos.${index}.nombreCurso`)}
                              onSelect={(curso) =>
                                handleCursoImport(index, curso)
                              }
                            />
                          </div>
                          <FormDescription>
                            Escriba el nombre o use 🔍 para importar de guardados
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* === ROW 2 === */}
                  {/* Número de curso (5 cols) */}
                  <div className="col-span-12 md:col-span-5">
                    <FormField
                      control={control}
                      name={`cursos.${index}.numeroCurso`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel>No. Curso *</FormLabel>
                          <FormControl>
                            <Input {...f} placeholder="Ej: MAT201" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Créditos (2 cols) */}
                  <div className="col-span-12 md:col-span-2">
                    <FormField
                      control={control}
                      name={`cursos.${index}.creditos`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel>Créditos</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              max={15}
                              name={f.name}
                              ref={f.ref}
                              onBlur={f.onBlur}
                              value={f.value === 0 ? "" : f.value}
                              placeholder="0"
                              onChange={(e) => {
                                const raw = e.target.value
                                if (raw === "") { f.onChange(0); return }
                                let val = parseInt(raw, 10)
                                if (isNaN(val)) val = 0
                                if (val > 15) val = 15
                                f.onChange(val)
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Subgrupo (3 cols) — leaves 2 empty cols intentionally */}
                  <div className="col-span-12 md:col-span-3">
                    <FormField
                      control={control}
                      name={`cursos.${index}.subgrupo`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel>Subgrupo</FormLabel>
                          <FormControl>
                            <Input {...f} placeholder="Ej: A1" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* === ROW 3 === */}
                  {/* Horas presenciales (3 cols) — Poka-yoke max from modality */}
                  <div className="col-span-12 md:col-span-3">
                    <FormField
                      control={control}
                      name={`cursos.${index}.horasPresenciales`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel>Hrs. Presenciales</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              max={maxPresenciales}
                              name={f.name}
                              ref={f.ref}
                              onBlur={f.onBlur}
                              value={f.value === 0 ? "" : f.value}
                              placeholder="0"
                              onChange={(e) => {
                                const raw = e.target.value
                                if (raw === "") { f.onChange(0); return }
                                let val = parseInt(raw, 10)
                                if (isNaN(val)) val = 0
                                if (val > maxPresenciales) val = maxPresenciales
                                f.onChange(val)
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Semanas (3 cols) — leaves 6 empty cols intentionally */}
                  <div className="col-span-12 md:col-span-3">
                    <FormField
                      control={control}
                      name={`cursos.${index}.semanas`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel>Semanas</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              max={22}
                              name={f.name}
                              ref={f.ref}
                              onBlur={f.onBlur}
                              value={f.value === 0 ? "" : f.value}
                              placeholder="0"
                              onChange={(e) => {
                                const raw = e.target.value
                                if (raw === "") { f.onChange(0); return }
                                let val = parseInt(raw, 10)
                                if (isNaN(val)) val = 0
                                if (val > 22) val = 22
                                f.onChange(val)
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* === ROW 4: Horario (full width) === */}
                  <div className="col-span-12">
                    <HorarioChipToggles cursoIndex={index} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={() => appendCurso({ ...EMPTY_CURSO })}
            className="w-full border-dashed"
          >
            <Plus className="mr-2 h-4 w-4" />
            Agregar Curso
          </Button>
        </CardContent>
      </Card>

      {/* ==========================================
          Sección 1.2: Otras Actividades de Docencia
          ========================================== */}
      <Card>
        <CardHeader>
          <CardTitle>1.2 Otras Actividades de Docencia</CardTitle>
          <CardDescription>
            Actividades adicionales de docencia como tutorías, preparación de
            material, atención a estudiantes, etc.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {actDocenciaFields.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No hay actividades adicionales de docencia.
            </p>
          )}

          {actDocenciaFields.map((field, index) => (
            <div
              key={field.id}
              className="relative rounded-lg border p-4"
            >
              {/* Silent calculator — renders nothing */}
              <CalculadoraActividad
                arrayName="otrasActividadesDocencia"
                index={index}
              />

              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-muted-foreground">
                  Actividad #{index + 1}
                </h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeActDocencia(index)}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-12">
                {/* Nombre — 6 columnas */}
                <div className="sm:col-span-6">
                  <FormField
                    control={control}
                    name={`otrasActividadesDocencia.${index}.nombre`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel>Nombre *</FormLabel>
                        <FormControl>
                          <Input {...f} placeholder="Ej: Tutorías académicas" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Horas semanales — 3 columnas */}
                <div className="sm:col-span-3">
                  <FormField
                    control={control}
                    name={`otrasActividadesDocencia.${index}.horasSemanales`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel>Horas/semana *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={40}
                            step="0.5"
                            name={f.name}
                            ref={f.ref}
                            onBlur={f.onBlur}
                            value={f.value === 0 ? "" : f.value}
                            placeholder="0"
                            onChange={(e) => {
                              const raw = e.target.value
                              if (raw === "") { f.onChange(0); return }
                              let val = parseFloat(raw)
                              if (isNaN(val)) val = 0
                              if (val > 40) val = 40
                              f.onChange(val)
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Semanas — 3 columnas */}
                <div className="sm:col-span-3">
                  <FormField
                    control={control}
                    name={`otrasActividadesDocencia.${index}.semanas`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel>Semanas *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={22}
                            step={1}
                            name={f.name}
                            ref={f.ref}
                            onBlur={f.onBlur}
                            value={f.value === 0 ? "" : f.value}
                            placeholder="0"
                            onChange={(e) => {
                              const raw = e.target.value
                              if (raw === "") { f.onChange(0); return }
                              let val = parseInt(raw, 10)
                              if (isNaN(val)) val = 0
                              if (val > 22) val = 22
                              f.onChange(val)
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Descripción — 12 columnas (full width) */}
                <div className="sm:col-span-12">
                  <FormField
                    control={control}
                    name={`otrasActividadesDocencia.${index}.descripcion`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel>Descripción</FormLabel>
                        <FormControl>
                          <Input {...f} placeholder="Detalle opcional" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={() => appendActDocencia({ ...EMPTY_ACTIVIDAD, horasSemanales: 0, semanas: 0 })}
            className="w-full border-dashed"
          >
            <Plus className="mr-2 h-4 w-4" />
            Agregar Otra Actividad de Docencia
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
