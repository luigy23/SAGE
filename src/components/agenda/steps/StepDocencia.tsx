"use client"

import { useEffect, useMemo } from "react"
import { useFormContext, useFieldArray, useWatch } from "react-hook-form"
import type { AgendaWizardFormData } from "@/lib/schemas/agenda-schema"
import { EMPTY_CURSO, EMPTY_ACTIVIDAD } from "@/lib/schemas/agenda-schema"
import { SEDES } from "@/lib/constants"
import {
  CursoMaestroSelector,
  type CursoMaestroOption,
} from "@/components/agenda/CursoMaestroSelector"
import type { ActividadCatalogoOption } from "@/components/agenda/ActividadCatalogoSelector"
import { ActividadCardRow } from "@/components/agenda/ActividadCardRow"
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
// Sub-componente: Tarjeta de un curso con selector de catálogo
// ==========================================
function CursoCardRow({
  index,
  cursosMaestros,
  semanasPeriodo,
  onSelect,
  onClear,
  onRemove,
}: {
  index: number
  cursosMaestros: CursoMaestroOption[]
  semanasPeriodo: number
  onSelect: (curso: CursoMaestroOption) => void
  onClear: () => void
  onRemove: () => void
}) {
  const { control } = useFormContext<AgendaWizardFormData>()
  const numeroCurso = useWatch({ name: `cursos.${index}.numeroCurso` }) as string
  const nombreCurso = useWatch({ name: `cursos.${index}.nombreCurso` }) as string
  const creditos = useWatch({ name: `cursos.${index}.creditos` }) as number
  const horasPresenciales = useWatch({ name: `cursos.${index}.horasPresenciales` }) as number
  const semanas = useWatch({ name: `cursos.${index}.semanas` }) as number
  const dedicacionPeriodo = useWatch({ name: `cursos.${index}.dedicacionPeriodo` }) as number

  const selected = !!numeroCurso

  return (
    <Card className="bg-card border shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {index + 1}
          </span>
          {selected ? nombreCurso : `Curso #${index + 1}`}
        </h4>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
          title="Eliminar curso"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <CardContent className="p-4 pt-5 space-y-5">
        {/* Silent Acuerdo 048 calculator — renders nothing */}
        <SilentDedicacionCalc cursoIndex={index} />

        {/* Selector del catálogo maestro (siempre visible) */}
        <div className="space-y-2">
          <FormLabel>Curso del Catálogo Oficial *</FormLabel>
          <CursoMaestroSelector
            cursosMaestros={cursosMaestros}
            selectedCodigo={numeroCurso}
            onSelect={onSelect}
            onClear={onClear}
          />
          <FormDescription>
            La denominación, créditos y horas presenciales se toman automáticamente del catálogo (Acuerdo 033/2024 y CA 009/2026).
          </FormDescription>
        </div>

        {/* Resumen de horas calculadas — solo si hay curso seleccionado */}
        {selected && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-md border bg-muted/30 p-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Créditos</p>
              <p className="font-semibold tabular-nums">{creditos}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Hrs. presenciales/sem</p>
              <p className="font-semibold tabular-nums">{horasPresenciales}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Semanas</p>
              <p className="font-semibold tabular-nums">{semanas}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total semestre (Art. 048)</p>
              <p className="font-semibold tabular-nums text-primary">
                {Math.round((dedicacionPeriodo || 0) * 10) / 10}h
              </p>
            </div>
          </div>
        )}

        {/* Campos editables: subgrupo, sede, semanas, horario */}
        {selected && (
          <div className="grid grid-cols-12 gap-x-6 gap-y-4">
            <div className="col-span-12 md:col-span-4">
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

            <div className="col-span-12 md:col-span-4">
              <FormField
                control={control}
                name={`cursos.${index}.sede`}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel>Sede donde se dicta</FormLabel>
                    <Select value={f.value || ""} onValueChange={f.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
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
            </div>

            <div className="col-span-12 md:col-span-4">
              <FormField
                control={control}
                name={`cursos.${index}.semanas`}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel>Semanas del periodo</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={semanasPeriodo}
                        name={f.name}
                        ref={f.ref}
                        onBlur={f.onBlur}
                        value={f.value === 0 ? "" : f.value}
                        placeholder={String(semanasPeriodo)}
                        onChange={(e) => {
                          const raw = e.target.value
                          if (raw === "") { f.onChange(0); return }
                          let val = parseInt(raw, 10)
                          if (isNaN(val)) val = 0
                          if (val > semanasPeriodo) val = semanasPeriodo
                          f.onChange(val)
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="col-span-12">
              <HorarioChipToggles cursoIndex={index} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
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
  cursosMaestros,
  catalogoActividades,
  semanasPeriodo,
}: {
  cursosMaestros: CursoMaestroOption[]
  catalogoActividades: ActividadCatalogoOption[]
  modalidad: string
  sedeBase?: string | null
  semanasPeriodo: number
}) {
  const { control, setValue } = useFormContext<AgendaWizardFormData>()

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

  function handleCursoMaestroSelect(index: number, curso: CursoMaestroOption) {
    const horasPresenciales = (curso.horasSemT ?? 0) + (curso.horasSemP ?? 0)
    setValue(`cursos.${index}.numeroCurso`, curso.codigo, { shouldValidate: true })
    setValue(`cursos.${index}.nombreCurso`, curso.nombre, { shouldValidate: true })
    setValue(`cursos.${index}.creditos`, curso.creditos)
    setValue(`cursos.${index}.horasPresenciales`, horasPresenciales)
    // Default semestral: parametrizable por SUPERADMIN (semanas_periodo). Acuerdo 048 Art. 4 = 22.
    setValue(`cursos.${index}.semanas`, semanasPeriodo)
  }

  function handleCursoMaestroClear(index: number) {
    setValue(`cursos.${index}.numeroCurso`, "", { shouldValidate: true })
    setValue(`cursos.${index}.nombreCurso`, "", { shouldValidate: true })
    setValue(`cursos.${index}.creditos`, 0)
    setValue(`cursos.${index}.horasPresenciales`, 0)
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
            <CursoCardRow
              key={field.id}
              index={index}
              cursosMaestros={cursosMaestros}
              semanasPeriodo={semanasPeriodo}
              onSelect={(curso) => handleCursoMaestroSelect(index, curso)}
              onClear={() => handleCursoMaestroClear(index)}
              onRemove={() => removeCurso(index)}
            />
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
            <ActividadCardRow
              key={field.id}
              index={index}
              arrayName="otrasActividadesDocencia"
              catalogo={catalogoActividades}
              categoria="DOCENCIA"
              semanasPeriodo={semanasPeriodo}
              onRemove={() => removeActDocencia(index)}
            />
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
