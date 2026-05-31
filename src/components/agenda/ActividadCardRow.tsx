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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SEDES } from "@/lib/constants"
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

const UNIDAD_LABEL: Record<string, string> = {
  COHORTE: "cohortes",
  ESTUDIANTE: "estudiantes",
  PROYECTO: "trabajos",
  SEDE: "sedes",
  FACULTAD: "facultades",
}

const UNIDAD_LABEL_SINGULAR: Record<string, string> = {
  COHORTE: "cohorte",
  ESTUDIANTE: "estudiante",
  PROYECTO: "trabajo",
  SEDE: "sede",
  FACULTAD: "facultad",
}

/**
 * Card de una actividad. Selector del catálogo + input manual de horas
 * totales del semestre (`dedicacionPeriodo`) + input de `cantidadUnidades`
 * para actividades con tope por unidad del Art. 11.
 */
export function ActividadCardRow({
  index,
  arrayName,
  catalogo,
  categoria,
  semanasPeriodo,
  sedeBase,
  proyectosActivos,
  onRemove,
}: {
  index: number
  arrayName: ArrayFieldName
  catalogo: ActividadCatalogoOption[]
  categoria: CategoriaActividadFiltro
  semanasPeriodo: number
  sedeBase?: string | null
  proyectosActivos?: boolean
  onRemove: () => void
}) {
  const { control, setValue } = useFormContext<AgendaWizardFormData>()

  const nombre = useWatch({ name: `${arrayName}.${index}.nombre` }) as string
  const dedicacionPeriodo = useWatch({ name: `${arrayName}.${index}.dedicacionPeriodo` }) as number
  const cantidadUnidades = (useWatch({ name: `${arrayName}.${index}.cantidadUnidades` }) as number) || 0

  const actividadCatalogo = catalogo.find(
    (a) => a.categoria === categoria && a.nombre === nombre
  )

  const requiereUnidades =
    actividadCatalogo !== undefined &&
    actividadCatalogo.topePorUnidad !== "NINGUNA"

  // Sede de la actividad: obligatoria al enviar si el catálogo dice
  // aplicaUnoPorSede=true o topePorUnidad=SEDE (Art. 11).
  const requiereSede =
    actividadCatalogo !== undefined &&
    (actividadCatalogo.aplicaUnoPorSede ||
      actividadCatalogo.topePorUnidad === "SEDE")

  const sedeWatched = useWatch({ name: `${arrayName}.${index}.sede` }) as string | null | undefined

  // Calcular el tope máximo dinámico para mostrar en UI
  const topeMaxUI = (() => {
    if (!actividadCatalogo) return null

    if (actividadCatalogo.topePorUnidad !== "NINGUNA" && actividadCatalogo.topeSemestralH !== null) {
      // Rama A: tope semestral por unidad (ej: Consejería 48h/cohorte)
      const unidades = actividadCatalogo.unidadMax !== null
        ? Math.min(cantidadUnidades || 1, actividadCatalogo.unidadMax)
        : (cantidadUnidades || 1)
      return actividadCatalogo.topeSemestralH * unidades
    }

    if (actividadCatalogo.topePorUnidad !== "NINGUNA" && actividadCatalogo.topeSemanalHPorUnidad !== null) {
      // Rama B: tope semanal por unidad (ej: Dirección tesis 2h/sem × #trabajos)
      if (cantidadUnidades <= 0) return null
      const unidades = actividadCatalogo.cantidadMaxSimultaneos !== null
        ? Math.min(cantidadUnidades, actividadCatalogo.cantidadMaxSimultaneos)
        : cantidadUnidades
      return actividadCatalogo.topeSemanalHPorUnidad * unidades * semanasPeriodo
    }

    // Rama C: tope plano
    return actividadCatalogo.topeSemestralH ?? null
  })()

  const excedeTopeUI = topeMaxUI !== null && dedicacionPeriodo > topeMaxUI

  function handleSelect(act: ActividadCatalogoOption) {
    setValue(`${arrayName}.${index}.nombre`, act.nombre, { shouldValidate: true })
    setValue(`${arrayName}.${index}.cantidadUnidades`, 0)
    // Pre-fill sede con sedeBase si la actividad la requiere y no hay valor.
    const necesitaSede = act.aplicaUnoPorSede || act.topePorUnidad === "SEDE"
    if (necesitaSede && !sedeWatched && sedeBase) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setValue(`${arrayName}.${index}.sede` as any, sedeBase, { shouldValidate: true })
    }
    if (!necesitaSede) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setValue(`${arrayName}.${index}.sede` as any, null)
    }
  }

  function handleClear() {
    setValue(`${arrayName}.${index}.nombre`, "", { shouldValidate: true })
    setValue(`${arrayName}.${index}.dedicacionPeriodo`, 0)
    setValue(`${arrayName}.${index}.cantidadUnidades`, 0)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setValue(`${arrayName}.${index}.sede` as any, null)
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
        proyectosActivos={proyectosActivos}
      />

      {/* Inputs editables solo cuando hay nombre */}
      {nombre && (
        <div className="space-y-4">

          {/* Input de cantidad de unidades (solo para actividades con topePorUnidad != NINGUNA) */}
          {requiereUnidades && actividadCatalogo && (
            <FormField
              control={control}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              name={`${arrayName}.${index}.cantidadUnidades` as any}
              render={({ field: f }) => (
                <FormItem>
                  <FormLabel>
                    Número de {UNIDAD_LABEL[actividadCatalogo.topePorUnidad] ?? actividadCatalogo.topePorUnidad.toLowerCase()}
                    {actividadCatalogo.cantidadMaxSimultaneos !== null && (
                      <span className="ml-1 font-normal text-muted-foreground">
                        (máx {actividadCatalogo.cantidadMaxSimultaneos})
                      </span>
                    )}
                    {actividadCatalogo.unidadMax !== null && actividadCatalogo.cantidadMaxSimultaneos === null && (
                      <span className="ml-1 font-normal text-muted-foreground">
                        (máx {actividadCatalogo.unidadMax})
                      </span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={actividadCatalogo.cantidadMaxSimultaneos ?? actividadCatalogo.unidadMax ?? undefined}
                      step={1}
                      name={f.name}
                      ref={f.ref}
                      onBlur={f.onBlur}
                      value={Number(f.value) === 0 ? "" : Number(f.value)}
                      placeholder="0"
                      onChange={(e) => {
                        const raw = e.target.value
                        if (raw === "") { f.onChange(0); return }
                        let val = parseInt(raw, 10)
                        if (isNaN(val) || val < 0) val = 0
                        const maxUnidades = actividadCatalogo.cantidadMaxSimultaneos ?? actividadCatalogo.unidadMax
                        if (maxUnidades !== null && val > maxUnidades) val = maxUnidades
                        f.onChange(val)
                        // Rama B: auto-fill horas cuando el tope es por unidad semanal
                        if (actividadCatalogo.topeSemanalHPorUnidad !== null && val > 0) {
                          const sugerido = val * actividadCatalogo.topeSemanalHPorUnidad * semanasPeriodo
                          setValue(`${arrayName}.${index}.dedicacionPeriodo`, sugerido, { shouldValidate: true })
                        }
                        // Rama A: auto-fill horas cuando el tope es semestral por unidad (ej: Consejería)
                        if (actividadCatalogo.topeSemestralH !== null && actividadCatalogo.topePorUnidad !== "NINGUNA" && val > 0) {
                          const unidadesEfectivas = actividadCatalogo.unidadMax !== null ? Math.min(val, actividadCatalogo.unidadMax) : val
                          const sugerido = actividadCatalogo.topeSemestralH * unidadesEfectivas
                          setValue(`${arrayName}.${index}.dedicacionPeriodo`, sugerido, { shouldValidate: true })
                        }
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    {actividadCatalogo.topeSemestralH !== null
                      ? `${actividadCatalogo.topeSemestralH}h por ${UNIDAD_LABEL_SINGULAR[actividadCatalogo.topePorUnidad] ?? "unidad"}`
                      : actividadCatalogo.topeSemanalHPorUnidad !== null
                        ? `${actividadCatalogo.topeSemanalHPorUnidad}h/sem por ${UNIDAD_LABEL_SINGULAR[actividadCatalogo.topePorUnidad] ?? "unidad"} × ${semanasPeriodo} semanas`
                        : ""}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Sede de ejecución (Art. 11): obligatoria al enviar si la
              actividad es "Uno por Sede" o el tope se calcula por sede. */}
          {requiereSede && (
            <FormField
              control={control}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              name={`${arrayName}.${index}.sede` as any}
              render={({ field: f }) => (
                <FormItem>
                  <FormLabel>Sede de ejecución</FormLabel>
                  <Select
                    value={f.value || ""}
                    onValueChange={(v) => f.onChange(v || null)}
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
                  <FormDescription>
                    El Art. 11 permite un solo responsable por sede para esta
                    actividad. Para coordinar en varias sedes, agréguela una vez
                    por cada sede.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

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
              {topeMaxUI !== null && (
                <div className="rounded-md border bg-muted/30 px-3 py-2">
                  <p className="text-xs text-muted-foreground">
                    {requiereUnidades && actividadCatalogo
                      ? `Tope Art. 11 (${cantidadUnidades || 1} ${UNIDAD_LABEL_SINGULAR[actividadCatalogo.topePorUnidad] ?? "unidad"}${(cantidadUnidades || 1) !== 1 ? "s" : ""})`
                      : "Tope Art. 11 para esta actividad"}
                  </p>
                  <p
                    className={`text-lg font-bold tabular-nums ${
                      excedeTopeUI ? "text-destructive" : "text-primary"
                    }`}
                  >
                    {Math.round((dedicacionPeriodo || 0) * 10) / 10}h
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      / máx {topeMaxUI}h
                    </span>
                  </p>
                </div>
              )}
              {excedeTopeUI && (
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
