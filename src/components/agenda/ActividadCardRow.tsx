"use client"

import { useState } from "react"
import { useFormContext, useWatch } from "react-hook-form"
import type { AgendaWizardFormData } from "@/lib/schemas/agenda-schema"
import {
  ActividadCatalogoSelector,
  type ActividadCatalogoOption,
  type CategoriaActividadFiltro,
} from "@/components/agenda/ActividadCatalogoSelector"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import {
  Trash2,
  AlertTriangle,
  Calculator,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

type ArrayFieldName =
  | "actividadesInvestigacion"
  | "actividadesProyeccionSocial"
  | "actividadesGestion"
  | "otrasActividadesDocencia"

/**
 * Card de una actividad. Selector del catálogo + input directo de horas
 * totales del semestre, con opción colapsable de calcular por semana.
 *
 * Modelo:
 * - Input principal: `dedicacionPeriodo` (horas totales del semestre)
 * - Modo auxiliar: `horasSemanales × semanas` → al editarlos, sobreescribe `dedicacionPeriodo`
 *
 * El schema Zod (agenda-schema.ts) preserva `dedicacionPeriodo` directo si h×s están en 0.
 */
export function ActividadCardRow({
  index,
  arrayName,
  catalogo,
  categoria,
  onRemove,
}: {
  index: number
  arrayName: ArrayFieldName
  catalogo: ActividadCatalogoOption[]
  categoria: CategoriaActividadFiltro
  onRemove: () => void
}) {
  const { control, setValue } = useFormContext<AgendaWizardFormData>()

  const nombre = useWatch({ name: `${arrayName}.${index}.nombre` }) as string
  const dedicacionPeriodo = useWatch({ name: `${arrayName}.${index}.dedicacionPeriodo` }) as number
  const horasSemanales = useWatch({ name: `${arrayName}.${index}.horasSemanales` }) as number
  const semanas = useWatch({ name: `${arrayName}.${index}.semanas` }) as number

  const actividadCatalogo = catalogo.find(
    (a) => a.categoria === categoria && a.nombre === nombre
  )

  const excedeTopeSemestral =
    actividadCatalogo?.topeSemestralH !== null &&
    actividadCatalogo?.topeSemestralH !== undefined &&
    dedicacionPeriodo > actividadCatalogo.topeSemestralH

  // El modo "calcular por semana" arranca abierto si el usuario tiene valores
  // previos en h/s (típicamente al editar borradores antiguos).
  const [calcOpen, setCalcOpen] = useState(
    () => (horasSemanales || 0) > 0 || (semanas || 0) > 0
  )

  function handleSelect(act: ActividadCatalogoOption) {
    setValue(`${arrayName}.${index}.nombre`, act.nombre, { shouldValidate: true })
    // Sugerir total semestral según el tope
    if (act.topeSemestralH !== null) {
      setValue(`${arrayName}.${index}.dedicacionPeriodo`, act.topeSemestralH)
    } else if (act.topeSemanalHPorUnidad !== null) {
      // Por unidad — pre-poblar con 1 unidad (22 sem × 1 × topeSemanalHPorUnidad)
      setValue(
        `${arrayName}.${index}.dedicacionPeriodo`,
        Math.round(act.topeSemanalHPorUnidad * 22 * 10) / 10
      )
    }
    // Limpiar h/s — si el docente quiere puede re-ingresarlas en modo cálculo
    setValue(`${arrayName}.${index}.horasSemanales`, 0)
    setValue(`${arrayName}.${index}.semanas`, 0)
    setCalcOpen(false)
  }

  function handleClear() {
    setValue(`${arrayName}.${index}.nombre`, "", { shouldValidate: true })
    setValue(`${arrayName}.${index}.dedicacionPeriodo`, 0)
    setValue(`${arrayName}.${index}.horasSemanales`, 0)
    setValue(`${arrayName}.${index}.semanas`, 0)
  }

  function handleHsemChange(newHsem: number) {
    setValue(`${arrayName}.${index}.horasSemanales`, newHsem)
    if (newHsem > 0 && semanas > 0) {
      setValue(`${arrayName}.${index}.dedicacionPeriodo`, newHsem * semanas)
    }
  }

  function handleSemanasChange(newSem: number) {
    setValue(`${arrayName}.${index}.semanas`, newSem)
    if (newSem > 0 && horasSemanales > 0) {
      setValue(`${arrayName}.${index}.dedicacionPeriodo`, horasSemanales * newSem)
    }
  }

  return (
    <div className="relative rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-muted-foreground">
          Actividad #{index + 1}
        </h4>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="h-8 w-8 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Selector del catálogo */}
      <ActividadCatalogoSelector
        catalogo={catalogo}
        categoria={categoria}
        selectedNombre={nombre}
        onSelect={handleSelect}
        onClear={handleClear}
      />

      {/* Inputs editables solo cuando hay nombre */}
      {nombre && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-12">
            {/* Total del semestre (input principal) */}
            <div className="sm:col-span-6">
              <FormField
                control={control}
                name={`${arrayName}.${index}.dedicacionPeriodo`}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel>Total semestre (h) *</FormLabel>
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
                          // Al editar el total directamente, limpiamos h/s
                          // para indicar que el valor es manual, no calculado.
                          if (calcOpen) {
                            setValue(`${arrayName}.${index}.horasSemanales`, 0)
                            setValue(`${arrayName}.${index}.semanas`, 0)
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Resumen + estado tope */}
            <div className="sm:col-span-6 flex flex-col justify-end">
              {actividadCatalogo?.topeSemestralH !== null &&
                actividadCatalogo?.topeSemestralH !== undefined && (
                  <div className="rounded-md border bg-muted/30 px-3 py-2">
                    <p className="text-xs text-muted-foreground">
                      Tope Art. 11 para esta actividad
                    </p>
                    <p
                      className={`text-lg font-bold tabular-nums ${
                        excedeTopeSemestral
                          ? "text-destructive"
                          : "text-primary"
                      }`}
                    >
                      {Math.round((dedicacionPeriodo || 0) * 10) / 10}h
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        / máx {actividadCatalogo.topeSemestralH}h
                      </span>
                    </p>
                  </div>
                )}
              {excedeTopeSemestral && (
                <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  Excede el tope del Art. 11
                </p>
              )}
            </div>
          </div>

          {/* Modo cálculo por semana (colapsable) */}
          <div className="rounded-md border bg-muted/20">
            <button
              type="button"
              onClick={() => setCalcOpen(!calcOpen)}
              className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Calculator className="h-3.5 w-3.5" />
                Calcular por semana (opcional)
              </span>
              {calcOpen ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>

            {calcOpen && (
              <div className="border-t px-3 py-3 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Si llenás horas/semana × semanas, el total semestral se actualiza automáticamente.
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <FormField
                      control={control}
                      name={`${arrayName}.${index}.horasSemanales`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Horas/semana</FormLabel>
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
                                if (raw === "") { handleHsemChange(0); return }
                                let val = parseFloat(raw)
                                if (isNaN(val)) val = 0
                                if (val > 40) val = 40
                                handleHsemChange(val)
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div>
                    <FormField
                      control={control}
                      name={`${arrayName}.${index}.semanas`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Semanas</FormLabel>
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
                              placeholder="22"
                              onChange={(e) => {
                                const raw = e.target.value
                                if (raw === "") { handleSemanasChange(0); return }
                                let val = parseInt(raw, 10)
                                if (isNaN(val)) val = 0
                                if (val > 22) val = 22
                                handleSemanasChange(val)
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="w-full rounded-md border bg-card px-3 py-2">
                      <p className="text-xs text-muted-foreground">= Total</p>
                      <p className="text-sm font-semibold tabular-nums">
                        {Math.round(((horasSemanales || 0) * (semanas || 0)) * 10) / 10}h
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Descripción */}
          <FormField
            control={control}
            name={`${arrayName}.${index}.descripcion`}
            render={({ field: f }) => (
              <FormItem>
                <FormLabel>Descripción</FormLabel>
                <FormControl>
                  <Textarea
                    {...f}
                    rows={2}
                    placeholder="Detalles específicos: nombre del proyecto, cohorte, programa, cantidad de estudiantes, etc."
                  />
                </FormControl>
                <FormDescription>
                  Personaliza con detalles del caso real.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </div>
  )
}
