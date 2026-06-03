"use client"

import { useEffect } from "react"
import { useFormContext, useFieldArray, useWatch } from "react-hook-form"
import type { AgendaWizardFormData } from "@/lib/schemas/agenda-schema"
import { EMPTY_CURSO, EMPTY_ACTIVIDAD } from "@/lib/schemas/agenda-schema"
import { SEDES } from "@/lib/constants"
import {
  CursoMaestroSelector,
  type CursoMaestroOption,
} from "@/components/agenda/CursoMaestroSelector"
import type { ActividadCatalogoOption } from "@/components/agenda/ActividadCatalogoSelector"
import type { FormulasCursos } from "@/lib/actions/formulas"
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

const FACTOR_FALLBACK: Record<string, { factorHoras: number; constanteSuma: number }> = {
  TEORICO: { factorHoras: 2, constanteSuma: 1 },
  TEORICO_PRACTICO: { factorHoras: 1.5, constanteSuma: 1 },
  PRACTICO: { factorHoras: 1, constanteSuma: 1 },
}

// ==========================================
// Sub-componente: Silent Acuerdo 048 calculator
// ==========================================
export function SilentDedicacionCalc({
  cursoIndex,
  semanasClases,
  formulas,
}: {
  cursoIndex: number
  semanasClases: number
  formulas: FormulasCursos
}) {
  const { setValue } = useFormContext<AgendaWizardFormData>()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const horasPresenciales = useWatch({ name: `cursos.${cursoIndex}.horasPresenciales` as any }) as number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const semanas = useWatch({ name: `cursos.${cursoIndex}.semanas` as any }) as number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tipoCurso = useWatch({ name: `cursos.${cursoIndex}.tipoCurso` as any }) as string | null | undefined

  useEffect(() => {
    const horas = Number(horasPresenciales) || 0
    // Usa formula de DB (o fallback Acuerdo 048 Art. 3 Par. 4) según tipo de curso
    const f = formulas[tipoCurso as keyof FormulasCursos] ?? FACTOR_FALLBACK[tipoCurso ?? ""] ?? { factorHoras: 1.5, constanteSuma: 1 }
    const semanales = horas > 0 ? (horas * f.factorHoras) + f.constanteSuma : 0
    // El curso se calcula sobre sus SEMANAS DE CLASE (campo `semanas`, default 16),
    // no sobre las semanas del contrato. Si el campo aún no tiene valor, usa el default.
    const semanasEf = Number(semanas) > 0 ? Number(semanas) : semanasClases
    setValue(`cursos.${cursoIndex}.dedicacionPeriodo`, semanales * semanasEf, { shouldValidate: true })
  }, [horasPresenciales, semanas, semanasClases, cursoIndex, setValue, tipoCurso, formulas])

  // Renders nothing — purely a side-effect hook
  return null
}

// ==========================================
// Sub-componente: Tarjeta de un curso con selector de catálogo
// ==========================================
function CursoCardRow({
  index,
  cursosMaestros,
  modalidad,
  sedeBase,
  semanasPeriodo,
  onSelect,
  onClear,
  onRemove,
}: {
  index: number
  cursosMaestros: CursoMaestroOption[]
  modalidad: string
  sedeBase?: string | null
  /** Tope máximo de semanas elegibles (= semanas del contrato de la agenda). */
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
        {/* Selector del catálogo maestro (siempre visible) */}
        <div className="space-y-2">
          <FormLabel>Curso del Catálogo Oficial </FormLabel>
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
              <p className="text-xs text-muted-foreground">Semanas de clase</p>
              <FormField
                control={control}
                name={`cursos.${index}.semanas`}
                render={({ field: f }) => (
                  <FormItem className="space-y-0">
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={semanasPeriodo}
                        value={f.value ?? ""}
                        onChange={(e) =>
                          f.onChange(e.target.value === "" ? "" : Number(e.target.value))
                        }
                        className="h-7 w-16 px-2 py-0 font-semibold tabular-nums"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total semestre (Art. 048)</p>
              <p className="font-semibold tabular-nums text-primary">
                {Math.round((dedicacionPeriodo || 0) * 10) / 10}h
              </p>
            </div>
          </div>
        )}

        {/* Campos editables: sede */}
        {selected && (
          <div className="grid grid-cols-12 gap-x-6 gap-y-4">
            <div className="col-span-12 md:col-span-6">
              <FormField
                control={control}
                name={`cursos.${index}.sede`}
                render={({ field: f }) => {
                  const sedeDistinta =
                    modalidad === "CATEDRA" &&
                    !!sedeBase &&
                    !!f.value &&
                    f.value !== sedeBase
                  return (
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
                      {sedeDistinta && (
                        <FormDescription>
                          Si más del 50% de sus horas presenciales quedan en
                          Pitalito, Garzón o La Plata, su tope semanal sube a
                          19h (Art. 4d).
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )
                }}
              />
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
  modalidad,
  sedeBase,
  semanasPeriodo,
  semanasClases,
  esJefeDePrograma = false,
  periodo,
}: {
  cursosMaestros: CursoMaestroOption[]
  catalogoActividades: ActividadCatalogoOption[]
  modalidad: string
  sedeBase?: string | null
  /** Semanas del contrato — tope máximo de semanas por curso. */
  semanasPeriodo: number
  /** Semanas de clase por defecto para nuevos cursos (independiente del contrato). */
  semanasClases: number
  esJefeDePrograma?: boolean
  periodo?: string
}) {
  // Default de semanas para un curso nuevo: las semanas de clase (16),
  // nunca por encima del tope del contrato.
  const semanasCursoDefault = Math.min(semanasClases, semanasPeriodo)
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
    setValue(`cursos.${index}.cursoMaestroId`, curso.id, { shouldValidate: true })
    // Art. 3 Par. 4 Acuerdo 048: tipo determina el factor de dedicación
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setValue(`cursos.${index}.tipoCurso` as any, curso.tipo)
    setValue(`cursos.${index}.numeroCurso`, curso.codigo, { shouldValidate: true })
    setValue(`cursos.${index}.nombreCurso`, curso.nombre, { shouldValidate: true })
    setValue(`cursos.${index}.creditos`, curso.creditos)
    setValue(`cursos.${index}.horasPresenciales`, horasPresenciales)
    setValue(`cursos.${index}.semanas`, semanasCursoDefault)
  }

  function handleCursoMaestroClear(index: number) {
    setValue(`cursos.${index}.cursoMaestroId`, null, { shouldValidate: true })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setValue(`cursos.${index}.tipoCurso` as any, null)
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
            Agregue los cursos que dictará este semestre. Use el buscador
            para importar datos de sus cursos guardados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Art. 3 Par. 1 Acuerdo 048: Jefes de Programa deben orientar
              mínimo un curso. Misma estructura que el aviso de doctorado en
              StepInvestigacionProyeccion: flex + ícono + texto, tenue, sin
              borde destructivo. Tinte azul oscuro (no brillante) para
              diferenciarlo del gris-doctorado y conservar la jerarquía visual. */}
          {esJefeDePrograma && cursoFields.length === 0 && (
            <div className="flex items-start gap-2 rounded-md bg-blue-900/10 px-3 py-2.5 text-sm text-blue-950 dark:bg-blue-400/10 dark:text-blue-100">
              <BookOpen className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
              <p className="leading-relaxed">
                Su perfil registra cargo de <span className="font-medium">Jefe de Programa</span>.
                El Art. 3, Par. 1 del Acuerdo 048 establece que los Jefes de Programa orientarán mínimo
                un curso por semestre. Agregue al menos uno para poder enviar la agenda.
              </p>
            </div>
          )}

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
              modalidad={modalidad}
              sedeBase={sedeBase}
              semanasPeriodo={semanasPeriodo}
              onSelect={(curso) => handleCursoMaestroSelect(index, curso)}
              onClear={() => handleCursoMaestroClear(index)}
              onRemove={() => removeCurso(index)}
            />
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={() => appendCurso({ ...EMPTY_CURSO, semanas: semanasCursoDefault, sede: sedeBase ?? "" })}
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
              sedeBase={sedeBase}
              periodo={periodo}
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
