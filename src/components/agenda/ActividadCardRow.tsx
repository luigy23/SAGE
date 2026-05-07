"use client"

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
import { Trash2, AlertTriangle } from "lucide-react"

type ArrayFieldName =
  | "actividadesInvestigacion"
  | "actividadesProyeccionSocial"
  | "actividadesGestion"
  | "otrasActividadesDocencia"

/**
 * Card de una actividad. Selector del catálogo + input manual de horas
 * totales del semestre (`dedicacionPeriodo`).
 */
export function ActividadCardRow({
  index,
  arrayName,
  catalogo,
  categoria,
  semanasPeriodo,
  onRemove,
}: {
  index: number
  arrayName: ArrayFieldName
  catalogo: ActividadCatalogoOption[]
  categoria: CategoriaActividadFiltro
  semanasPeriodo: number
  onRemove: () => void
}) {
  const { control, setValue } = useFormContext<AgendaWizardFormData>()

  const nombre = useWatch({ name: `${arrayName}.${index}.nombre` }) as string
  const dedicacionPeriodo = useWatch({ name: `${arrayName}.${index}.dedicacionPeriodo` }) as number

  const actividadCatalogo = catalogo.find(
    (a) => a.categoria === categoria && a.nombre === nombre
  )

  const excedeTopeSemestral =
    actividadCatalogo?.topeSemestralH !== null &&
    actividadCatalogo?.topeSemestralH !== undefined &&
    dedicacionPeriodo > actividadCatalogo.topeSemestralH

  function handleSelect(act: ActividadCatalogoOption) {
    setValue(`${arrayName}.${index}.nombre`, act.nombre, { shouldValidate: true })
  }

  function handleClear() {
    setValue(`${arrayName}.${index}.nombre`, "", { shouldValidate: true })
    setValue(`${arrayName}.${index}.dedicacionPeriodo`, 0)
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
                    <FormLabel>Total semestre (h) </FormLabel>
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
