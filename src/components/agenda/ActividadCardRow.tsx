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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SEDES } from "@/lib/constants"
import type { ProyectoAprobadoOpcion } from "@/lib/actions/proyecto-actions"
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import { Trash2, AlertTriangle, Lock } from "lucide-react"

/** Datos de consejería para la tarjeta COHORTE: compromisos amarrados + cohortes disponibles. */
export type ConsejeriaCardData = {
  compromisos: { cohorte: string; semestreActual: number; semestresCompromiso: number }[]
  disponibles: { cohorte: string; maxSemestres: number }[]
}

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
  proyectosAprobados,
  consejeria,
  onRemove,
}: {
  index: number
  arrayName: ArrayFieldName
  catalogo: ActividadCatalogoOption[]
  categoria: CategoriaActividadFiltro
  semanasPeriodo: number
  sedeBase?: string | null
  proyectosActivos?: boolean
  proyectosAprobados?: ProyectoAprobadoOpcion[]
  consejeria?: ConsejeriaCardData
  periodo?: string
  onRemove: () => void
}) {
  const { control, setValue } = useFormContext<AgendaWizardFormData>()
  // Estado local del selector "agregar cohorte nueva".
  const [nuevaCohorte, setNuevaCohorte] = useState("")
  const [nuevaDuracion, setNuevaDuracion] = useState(1)

  const nombre = useWatch({ name: `${arrayName}.${index}.nombre` }) as string
  const dedicacionPeriodo = useWatch({ name: `${arrayName}.${index}.dedicacionPeriodo` }) as number
  const cantidadUnidades = (useWatch({ name: `${arrayName}.${index}.cantidadUnidades` }) as number) || 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proyectoIdSel = useWatch({ name: `${arrayName}.${index}.proyectoId` as any }) as string | null | undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cohortesCompromisoW = useWatch({ name: `${arrayName}.${index}.cohortesCompromiso` as any }) as
    | { cohorte: string; semestres: number }[]
    | undefined

  const actividadCatalogo = catalogo.find(
    (a) => a.categoria === categoria && a.nombre === nombre
  )

  // Actividades que exigen proyecto aprobado (Investigador Principal / Coinvestigador /
  // Coordinador / Cogestor). El docente vincula el proyecto y define él mismo las horas
  // que le dedicará (el revisor ya no asigna horas al aprobar).
  const requiereProyecto = actividadCatalogo?.requiereProyectoAprobado === true

  // Proyectos ya vinculados en CUALQUIER tarjeta (para no ofrecer duplicados).
  const invW = (useWatch({ name: "actividadesInvestigacion" }) as { proyectoId?: string | null }[] | undefined) ?? []
  const psW = (useWatch({ name: "actividadesProyeccionSocial" }) as { proyectoId?: string | null }[] | undefined) ?? []
  const proyectosUsados = new Set(
    [...invW, ...psW].map((a) => a?.proyectoId).filter((id): id is string => !!id),
  )
  const proyectosElegibles = (proyectosAprobados ?? []).filter(
    (p) => p.tipo === categoria && (p.id === proyectoIdSel || !proyectosUsados.has(p.id)),
  )

  // Proyecto aprobado+activo precargado: la tarjeta es FIJA (no se quita ni se cambia
  // el proyecto), pero el docente sí edita las horas que le dedicará.
  const proyectoBloqueado = (proyectosAprobados ?? []).find((p) => p.id === proyectoIdSel) ?? null
  const bloqueado = proyectoBloqueado !== null

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setValue(`${arrayName}.${index}.cohortes` as any, [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setValue(`${arrayName}.${index}.cohortesCompromiso` as any, [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setValue(`${arrayName}.${index}.proyectoId` as any, null)
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
    setValue(`${arrayName}.${index}.cohortes` as any, [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setValue(`${arrayName}.${index}.cohortesCompromiso` as any, [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setValue(`${arrayName}.${index}.sede` as any, null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setValue(`${arrayName}.${index}.proyectoId` as any, null)
  }

  // Tarjeta FIJA: proyecto aprobado precargado. No se quita, pero el docente SÍ
  // define cuántas horas le dedicará (las horas no las pone el revisor).
  if (bloqueado && proyectoBloqueado) {
    return (
      <div className="relative rounded-lg border bg-muted/30 p-4">
        <div className="flex items-start gap-3 text-sm">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">📌 {nombre}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Proyecto aprobado:{" "}
              <span className="font-medium text-foreground/80">{proyectoBloqueado.titulo}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Precargado de tu proyecto activo (no se puede quitar). Indicá las horas que vas a
              dedicarle este semestre.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <label className="text-xs font-medium text-foreground" htmlFor={`${arrayName}-${index}-horasProy`}>
                Horas del semestre
              </label>
              <Input
                id={`${arrayName}-${index}-horasProy`}
                type="number"
                min={0}
                className="h-9 w-28"
                value={dedicacionPeriodo || ""}
                onChange={(e) =>
                  setValue(
                    `${arrayName}.${index}.dedicacionPeriodo`,
                    e.target.value === "" ? 0 : Number(e.target.value),
                    { shouldValidate: true },
                  )
                }
              />
            </div>
          </div>
        </div>
      </div>
    )
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

          {/* Proyecto aprobado vinculado (Investigador Principal / Coinvestigador /
              Coordinador / Cogestor): el docente elige el proyecto y luego indica
              cuántas horas le dedicará (las horas las pone él, no el revisor). */}
          {requiereProyecto && (
            <FormField
              control={control}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              name={`${arrayName}.${index}.proyectoId` as any}
              render={({ field: f }) => (
                <FormItem>
                  <FormLabel>Proyecto aprobado vinculado</FormLabel>
                  {proyectosElegibles.length > 0 ? (
                    <Select
                      value={(f.value as string) || ""}
                      onValueChange={(v) => f.onChange(v || null)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar proyecto aprobado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {proyectosElegibles.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.titulo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                      No tienes proyectos aprobados de este tipo donde participes. Regístralo en{" "}
                      <span className="font-medium">Mis Proyectos</span>; cuando el revisor lo
                      apruebe, aparecerá aquí para que le asignes tus horas.
                    </p>
                  )}
                  <FormDescription>
                    Elegí el proyecto e indicá abajo las horas que vas a dedicarle este semestre.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Consejería (COHORTE): cohortes amarradas (bloqueadas) + agregar nuevas con duración. */}
          {actividadCatalogo?.topePorUnidad === "COHORTE" && (
            <FormField
              control={control}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              name={`${arrayName}.${index}.cohortes` as any}
              render={({ field: f }) => {
                const seleccionadas: string[] = Array.isArray(f.value) ? f.value : []
                const maxCohortes = actividadCatalogo.unidadMax ?? 1
                const compromisos = consejeria?.compromisos ?? []
                const boundSet = new Set(compromisos.map((c) => c.cohorte))
                const agregadas = seleccionadas.filter((x) => !boundSet.has(x))
                const nuevasActual = cohortesCompromisoW ?? []
                const disponibles = (consejeria?.disponibles ?? []).filter(
                  (d) => !seleccionadas.includes(d.cohorte),
                )
                const puedeAgregar = seleccionadas.length < maxCohortes && disponibles.length > 0
                const maxDeNueva =
                  disponibles.find((d) => d.cohorte === nuevaCohorte)?.maxSemestres ?? 0

                const setCohortes = (
                  next: string[],
                  nuevas: { cohorte: string; semestres: number }[],
                ) => {
                  f.onChange(next)
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  setValue(`${arrayName}.${index}.cohortesCompromiso` as any, nuevas, { shouldValidate: true })
                  setValue(`${arrayName}.${index}.cantidadUnidades`, next.length, { shouldValidate: true })
                }
                const agregar = () => {
                  if (!nuevaCohorte || nuevaDuracion < 1) return
                  setCohortes(
                    [...seleccionadas, nuevaCohorte],
                    [...nuevasActual, { cohorte: nuevaCohorte, semestres: nuevaDuracion }],
                  )
                  setNuevaCohorte("")
                  setNuevaDuracion(1)
                }
                const quitar = (c: string) => {
                  setCohortes(
                    seleccionadas.filter((x) => x !== c),
                    nuevasActual.filter((n) => n.cohorte !== c),
                  )
                }

                return (
                  <FormItem>
                    <FormLabel>
                      Consejería — cohortes (período de ingreso)
                      <span className="ml-1 font-normal text-muted-foreground">(máx {maxCohortes})</span>
                    </FormLabel>

                    {/* Amarradas: bloqueadas, sin borrar */}
                    {compromisos.map((c) => (
                      <div
                        key={c.cohorte}
                        className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm"
                      >
                        <span>
                          📌 Cohorte <span className="font-mono font-medium">{c.cohorte}</span>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Compromiso: semestre {c.semestreActual} de {c.semestresCompromiso}
                        </span>
                      </div>
                    ))}

                    {/* Agregadas en esta edición: removibles */}
                    {agregadas.map((c) => {
                      const dur = nuevasActual.find((n) => n.cohorte === c)?.semestres
                      return (
                        <div
                          key={c}
                          className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                        >
                          <span>
                            Cohorte <span className="font-mono font-medium">{c}</span>
                            {dur ? (
                              <span className="ml-1 text-xs text-muted-foreground">
                                · {dur} semestre{dur !== 1 ? "s" : ""}
                              </span>
                            ) : null}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => quitar(c)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )
                    })}

                    {/* Agregar nueva cohorte */}
                    {puedeAgregar ? (
                      <div className="flex flex-wrap items-end gap-2 rounded-md border border-dashed p-2">
                        <div className="min-w-[140px] flex-1 space-y-1">
                          <span className="text-xs text-muted-foreground">Cohorte disponible</span>
                          <Select
                            value={nuevaCohorte}
                            onValueChange={(v) => {
                              setNuevaCohorte(v)
                              setNuevaDuracion(1)
                            }}
                          >
                            <SelectTrigger data-testid="consejeria-cohorte-select">
                              <SelectValue placeholder="Elegir cohorte" />
                            </SelectTrigger>
                            <SelectContent>
                              {disponibles.map((d) => (
                                <SelectItem key={d.cohorte} value={d.cohorte}>
                                  {d.cohorte}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-36 space-y-1">
                          <span className="text-xs text-muted-foreground">¿Cuántos semestres?</span>
                          <Select
                            value={String(nuevaDuracion)}
                            onValueChange={(v) => setNuevaDuracion(Number(v))}
                            disabled={!nuevaCohorte}
                          >
                            <SelectTrigger data-testid="consejeria-semestres-select">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: maxDeNueva }, (_, i) => i + 1).map((n) => (
                                <SelectItem key={n} value={String(n)}>
                                  {n}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button type="button" size="sm" onClick={agregar} disabled={!nuevaCohorte} data-testid="consejeria-agregar">
                          Agregar
                        </Button>
                      </div>
                    ) : seleccionadas.length >= maxCohortes ? (
                      <p className="text-xs text-muted-foreground">
                        Alcanzaste el máximo de {maxCohortes} cohortes.
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No hay cohortes disponibles para asumir en este programa.
                      </p>
                    )}

                    <FormDescription>
                      Un solo consejero por cohorte en el programa. Al enviar la agenda se reserva la
                      cohorte; si te la rechazan, vuelve a quedar disponible.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )
              }}
            />
          )}

          {/* Input de cantidad de unidades (solo para actividades con topePorUnidad != NINGUNA, excepto COHORTE) */}
          {requiereUnidades && actividadCatalogo && actividadCatalogo.topePorUnidad !== "COHORTE" && (
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
                      step="1"
                      name={f.name}
                      ref={f.ref}
                      onBlur={f.onBlur}
                      value={Number(f.value) === 0 ? "" : Number(f.value)}
                      placeholder="0"
                      onKeyDown={(e) => {
                        if (e.key === '.' || e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-') {
                          e.preventDefault();
                        }
                      }}
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
                        max={topeMaxUI !== null ? topeMaxUI : 880}
                        step="1"
                        name={f.name}
                        ref={f.ref}
                        onBlur={f.onBlur}
                        value={f.value === 0 ? "" : f.value}
                        placeholder="0"
                        onKeyDown={(e) => {
                          if (e.key === '.' || e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-') {
                            e.preventDefault();
                          }
                        }}
                        onChange={(e) => {
                          const raw = e.target.value
                          if (raw === "") { f.onChange(0); return }
                          let val = parseInt(raw, 10)
                          if (isNaN(val)) val = 0
                          const currentMax = topeMaxUI !== null ? topeMaxUI : 880
                          if (val > currentMax) val = currentMax
                          f.onChange(val)
                        }}
                      />
                    </FormControl>
                    {requiereProyecto && Boolean(proyectoIdSel) && (
                      <FormDescription>
                        Horas que vas a dedicarle a este proyecto (≤ el tope de tu rol).
                      </FormDescription>
                    )}
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
