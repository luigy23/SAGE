"use client"

import { useState, useCallback } from "react"
import { useFormContext, useFieldArray, Controller } from "react-hook-form"
import type { CursoGuardado } from "@/generated/prisma/client"
import type { AgendaWizardFormData } from "@/lib/schemas/agenda-schema"
import { EMPTY_CURSO, EMPTY_ACTIVIDAD } from "@/lib/schemas/agenda-schema"
import { SEDES } from "@/lib/constants"
import { CursoCombobox } from "@/components/agenda/CursoCombobox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
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
import { Separator } from "@/components/ui/separator"
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react"

// ==========================================
// Días de la semana para el sub-formulario de horarios
// ==========================================
const DIAS = [
  { key: "lunes", label: "Lun" },
  { key: "martes", label: "Mar" },
  { key: "miercoles", label: "Mié" },
  { key: "jueves", label: "Jue" },
  { key: "viernes", label: "Vie" },
  { key: "sabado", label: "Sáb" },
  { key: "domingo", label: "Dom" },
] as const

type DiaKey = (typeof DIAS)[number]["key"]

// ==========================================
// Helper: parsea "08:00-10:00" → { inicio, fin, activo }
// ==========================================
function parseHorarioString(val: string | null | undefined): {
  activo: boolean
  inicio: string
  fin: string
} {
  if (!val) return { activo: false, inicio: "", fin: "" }
  const parts = val.split("-")
  return {
    activo: true,
    inicio: parts[0]?.trim() || "",
    fin: parts[1]?.trim() || "",
  }
}

// ==========================================
// Sub-componente: Horario por día (Checkbox + Time inputs)
// ==========================================
function HorarioDiaControl({
  cursoIndex,
  diaKey,
  diaLabel,
}: {
  cursoIndex: number
  diaKey: DiaKey
  diaLabel: string
}) {
  const { setValue, watch } = useFormContext<AgendaWizardFormData>()

  // Leer valor actual del campo RHF (path dinámico requiere `as any`)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentValue = watch(`cursos.${cursoIndex}.horarios.${diaKey}` as any) as string | null | undefined
  const parsed = parseHorarioString(currentValue)

  const [activo, setActivo] = useState(parsed.activo)
  const [inicio, setInicio] = useState(parsed.inicio)
  const [fin, setFin] = useState(parsed.fin)

  // Concatena tiempos y escribe en RHF con formato "HH:MM-HH:MM"
  const updateField = useCallback(
    (newActivo: boolean, newInicio: string, newFin: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const path = `cursos.${cursoIndex}.horarios.${diaKey}` as any
      if (!newActivo) {
        setValue(path, null, { shouldDirty: true })
      } else if (newInicio && newFin) {
        setValue(path, `${newInicio}-${newFin}`, { shouldDirty: true })
      }
    },
    [setValue, cursoIndex, diaKey]
  )

  function handleToggle(checked: boolean) {
    setActivo(checked)
    if (!checked) {
      setInicio("")
      setFin("")
    }
    updateField(checked, checked ? inicio : "", checked ? fin : "")
  }

  function handleInicioChange(val: string) {
    setInicio(val)
    // Si la nueva hora de inicio es >= la hora de fin actual, resetear fin
    if (fin && val >= fin) {
      setFin("")
      updateField(activo, val, "")
    } else {
      updateField(activo, val, fin)
    }
  }

  function handleFinChange(val: string) {
    setFin(val)
    updateField(activo, inicio, val)
  }

  // Detectar estado inválido para feedback visual
  const tiempoInvalido = activo && inicio && fin && inicio >= fin

  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={`horario-${cursoIndex}-${diaKey}`}
        checked={activo}
        onCheckedChange={(checked) => handleToggle(!!checked)}
        aria-label={`Activar horario de ${diaLabel}`}
      />
      <Label
        htmlFor={`horario-${cursoIndex}-${diaKey}`}
        className="w-10 text-xs font-medium"
      >
        {diaLabel}
      </Label>
      {activo && (
        <>
          <input
            type="time"
            value={inicio}
            onChange={(e) => handleInicioChange(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            aria-label={`Hora inicio ${diaLabel}`}
          />
          <span className="text-xs text-muted-foreground">a</span>
          <input
            type="time"
            value={fin}
            min={inicio || undefined}
            onChange={(e) => handleFinChange(e.target.value)}
            className={`h-8 rounded-md border bg-background px-2 text-xs shadow-sm focus:outline-none focus:ring-1 ${
              tiempoInvalido
                ? "border-destructive focus:ring-destructive"
                : "border-input focus:ring-ring"
            }`}
            aria-label={`Hora fin ${diaLabel}`}
          />
          {tiempoInvalido && (
            <span className="text-xs font-medium text-destructive">
              Fin debe ser posterior
            </span>
          )}
        </>
      )}
    </div>
  )
}

// ==========================================
// Sub-componente: Formulario de horarios de un curso
// ==========================================
function HorarioCursoSubform({ cursoIndex }: { cursoIndex: number }) {
  const [collapsed, setCollapsed] = useState(true)

  return (
    <div className="mt-3 rounded-md border border-dashed p-3">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <span>📅 Horario semanal</span>
        {collapsed ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronUp className="h-3.5 w-3.5" />
        )}
      </button>
      {!collapsed && (
        <div className="mt-3 grid gap-2">
          {DIAS.map((dia) => (
            <HorarioDiaControl
              key={dia.key}
              cursoIndex={cursoIndex}
              diaKey={dia.key}
              diaLabel={dia.label}
            />
          ))}
        </div>
      )}
    </div>
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
 *   - CursoCombobox para importar de cursos guardados
 *   - Inputs para cada campo del CursoAgenda
 *   - Sub-formulario colapsable de horarios por día
 *
 * - 1.2 Otras Actividades de Docencia (useFieldArray "otrasActividadesDocencia")
 *   - Campos: nombre, descripcion, dedicacionPeriodo
 *
 * Todos los sub-componentes usan useFormContext (no reciben form como prop).
 */
export function StepDocencia({
  cursosGuardados,
}: {
  cursosGuardados: CursoGuardado[]
}) {
  const { control, setValue, watch } = useFormContext<AgendaWizardFormData>()

  // Field arrays para cursos y actividades de docencia
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

  // Handler para cuando se selecciona un curso desde el Combobox
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
          <CardTitle>1.0 Cursos Asignados</CardTitle>
          <CardDescription>
            Agregue los cursos que dictará este semestre. Use el buscador (🔍)
            para importar datos de sus cursos guardados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {cursoFields.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No hay cursos agregados. Haga clic en &ldquo;Agregar Curso&rdquo; para comenzar.
            </p>
          )}

          {cursoFields.map((field, index) => (
            <div
              key={field.id}
              className="relative rounded-lg border bg-card p-4 shadow-sm"
            >
              {/* Header del curso con botón eliminar */}
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-muted-foreground">
                  Curso #{index + 1}
                </h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCurso(index)}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  title="Eliminar curso"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Grid de campos del curso */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Nombre del curso + Combobox */}
                <div className="sm:col-span-2">
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

                {/* Número de curso */}
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

                {/* Subgrupo */}
                <FormField
                  control={control}
                  name={`cursos.${index}.subgrupo`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>Subgrupo</FormLabel>
                      <FormControl>
                        <Input {...f} placeholder="Ej: A1" />
                      </FormControl>
                      <FormDescription>Opcional</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Sede */}
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

                {/* Horas presenciales */}
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
                          max={40}
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
                            if (val > 40) val = 40
                            f.onChange(val)
                            // Smart Default: auto-calcular dedicación = (horas * 2) * semanas
                            const semanas = watch(`cursos.${index}.semanas`) || 0
                            if (semanas > 0) {
                              setValue(`cursos.${index}.dedicacionPeriodo`, (val * 2) * semanas)
                            }
                          }}
                        />
                      </FormControl>
                      <FormDescription>Máx. 40h semanales</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Créditos */}
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

                {/* Semanas */}
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
                            // Smart Default: auto-calcular dedicación = (horas * 2) * semanas
                            const horas = watch(`cursos.${index}.horasPresenciales`) || 0
                            if (horas > 0) {
                              setValue(`cursos.${index}.dedicacionPeriodo`, (horas * 2) * val)
                            }
                          }}
                        />
                      </FormControl>
                      <FormDescription>Máx. 22 semanas</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Dedicación periodo */}
                <FormField
                  control={control}
                  name={`cursos.${index}.dedicacionPeriodo`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>Dedicación (horas) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={880}
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
                            if (val > 880) val = 880
                            f.onChange(val)
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Máx. 880h semestrales
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Sub-formulario de horarios */}
              <HorarioCursoSubform cursoIndex={index} />
            </div>
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

              <div className="grid gap-4 sm:grid-cols-3">
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

                <FormField
                  control={control}
                  name={`otrasActividadesDocencia.${index}.dedicacionPeriodo`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>Dedicación (horas) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={880}
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
                            if (val > 880) val = 880
                            f.onChange(val)
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={() => appendActDocencia({ ...EMPTY_ACTIVIDAD })}
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
