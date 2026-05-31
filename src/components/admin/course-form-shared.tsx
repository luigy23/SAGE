"use client"

import { useEffect, useRef } from "react"
import { useWatch, type UseFormReturn } from "react-hook-form"
import { z } from "zod"
import { Input } from "@/components/ui/input"
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Info } from "lucide-react"

// =====================================================================
// ZOD SCHEMA
// =====================================================================
function optNullableInt(max: number) {
  return z
    .number({ message: "Debe ser un número." })
    .int({ message: "Debe ser entero." })
    .min(0, "Mínimo 0.")
    .max(max, `Máximo ${max}.`)
    .nullable()
    .optional()
}

export const courseFormSchema = z
  .object({
    codigo: z
      .string()
      .min(1, "El código es obligatorio.")
      .max(20, "Máximo 20 caracteres."),
    nombre: z
      .string()
      .min(1, "El nombre es obligatorio.")
      .max(150, "Máximo 150 caracteres."),
    tipo: z.enum(["TEORICO", "TEORICO_PRACTICO", "PRACTICO"], {
      message: "Selecciona el tipo de curso.",
    }),
    creditos: z
      .number({ message: "Debe ser un número válido." })
      .int({ message: "Debe ser un número entero." })
      .min(1, "Mínimo 1 crédito.")
      .max(12, "Máximo 12 créditos."),
    creditosT: optNullableInt(12),
    creditosP: optNullableInt(12),
    horasSemT: optNullableInt(40),
    horasSemP: optNullableInt(40),
    horasSemI: optNullableInt(40),
    componente: z
      .enum([
        "BASICO_INSTITUCIONAL",
        "BASICO_FACULTAD",
        "COMPLEMENTARIO_INSTITUCIONAL",
        "COMPLEMENTARIO_FACULTAD",
        "COMPLEMENTARIO_PROGRAMA",
        "POSGRADO",
      ])
      .nullable()
      .optional(),
    facultad: z.string().max(100, "Máximo 100 caracteres.").nullable().optional(),
    acuerdoOrigen: z
      .string()
      .max(100, "Máximo 100 caracteres.")
      .nullable()
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.tipo === "TEORICO_PRACTICO") {
      const total = (data.creditosT ?? 0) + (data.creditosP ?? 0)
      if (total < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Ingresa al menos un crédito teórico o práctico.",
          path: ["creditosT"],
        })
      }
      if (total > 12) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El total de créditos (T+P) no puede superar 12.",
          path: ["creditosP"],
        })
      }
    }
  })

export type CourseFormValues = z.infer<typeof courseFormSchema>

// =====================================================================
// CONSTANTES DE PRESENTACIÓN
// =====================================================================
export const COMPONENTE_LABELS: Record<string, string> = {
  BASICO_INSTITUCIONAL: "Básico Institucional",
  BASICO_FACULTAD: "Básico Facultad",
  COMPLEMENTARIO_INSTITUCIONAL: "Complementario Institucional",
  COMPLEMENTARIO_FACULTAD: "Complementario Facultad",
  COMPLEMENTARIO_PROGRAMA: "Complementario Programa",
  POSGRADO: "Posgrado",
}

export const TIPO_DESCRIPCIONES: Record<string, string> = {
  TEORICO: "Sesiones magistrales o seminarios. Sin componente de laboratorio.",
  PRACTICO:
    "Laboratorio, taller o proyecto integrador. Sin componente teórico formal.",
  TEORICO_PRACTICO:
    "Combina sesiones teóricas y de laboratorio/práctica. Los créditos se ingresan por separado.",
}

// =====================================================================
// MAPEO ENTRE CursoMaestro (DB) y FORM
// =====================================================================
export type CursoLike = {
  codigo: string
  nombre: string
  tipo: CourseFormValues["tipo"]
  creditos: number
  creditosT: number | null
  creditosP: number | null
  horasSemT: number | null
  horasSemP: number | null
  horasSemI: number | null
  componente: CourseFormValues["componente"] | null
  facultad: string | null
  acuerdoOrigen: string | null
}

/**
 * Pre-puebla los defaultValues del form a partir de un curso existente.
 * Mapea null en strings opcionales a "" para evitar el warning de
 * controlled inputs en React.
 */
export function cursoToFormDefaults(curso: CursoLike): CourseFormValues {
  return {
    codigo: curso.codigo,
    nombre: curso.nombre,
    tipo: curso.tipo,
    creditos: curso.creditos,
    creditosT: curso.creditosT,
    creditosP: curso.creditosP,
    horasSemT: curso.horasSemT,
    horasSemP: curso.horasSemP,
    horasSemI: curso.horasSemI,
    componente: curso.componente ?? null,
    facultad: curso.facultad ?? "",
    acuerdoOrigen: curso.acuerdoOrigen ?? "",
  }
}

/**
 * Garantiza la consistencia entre creditos/creditosT/creditosP al enviar
 * al backend. Es la fuente de verdad del contrato de salida:
 *  - TEORICO          → creditosT = creditos, creditosP = null
 *  - PRACTICO         → creditosT = null,     creditosP = creditos
 *  - TEORICO_PRACTICO → conserva ambos (la reactividad ya sincronizó creditos = T+P)
 */
export function mapFormValuesToCursoPayload(values: CourseFormValues) {
  let creditosT: number | null = null
  let creditosP: number | null = null
  if (values.tipo === "TEORICO") {
    creditosT = values.creditos
    creditosP = null
  } else if (values.tipo === "PRACTICO") {
    creditosT = null
    creditosP = values.creditos
  } else {
    creditosT = values.creditosT ?? null
    creditosP = values.creditosP ?? null
  }

  return {
    codigo: values.codigo,
    nombre: values.nombre,
    creditos: values.creditos,
    tipo: values.tipo,
    componente: values.componente ?? null,
    facultad: values.facultad || null,
    creditosT,
    creditosP,
    horasSemT: values.horasSemT ?? null,
    horasSemP: values.horasSemP ?? null,
    horasSemI: values.horasSemI ?? null,
    acuerdoOrigen: values.acuerdoOrigen || null,
  }
}

// =====================================================================
// HELPER UI: input numérico que mapea string-vacío ↔ null
// =====================================================================
export function OptionalIntInput({
  field,
  id,
  placeholder,
  max,
}: {
  field: {
    value: unknown
    onChange: (v: number | null) => void
    onBlur: () => void
    name: string
  }
  id: string
  placeholder?: string
  max: number
}) {
  return (
    <Input
      id={id}
      type="number"
      min={0}
      max={max}
      placeholder={placeholder ?? "—"}
      value={
        field.value === null || field.value === undefined ? "" : String(field.value)
      }
      onChange={(e) =>
        field.onChange(e.target.value === "" ? null : parseInt(e.target.value, 10))
      }
      onBlur={field.onBlur}
    />
  )
}

// =====================================================================
// HOOK DE REACTIVIDAD
// =====================================================================
/**
 * Suscribe los efectos reactivos del formulario:
 *
 *  1. Al **cambiar** el tipo (no en el montaje), limpia los campos que
 *     dejan de aplicar (creditosT, creditosP, horasSem correspondiente).
 *  2. En TEORICO_PRACTICO, mantiene `creditos = creditosT + creditosP`
 *     en tiempo real.
 *
 * El flag `isInitialMount` evita que el primer render (con datos cargados
 * desde DB en modo edición) dispare la limpieza y destruya valores
 * legítimos. Solo se limpia cuando el usuario cambia el tipo manualmente.
 */
export function useCourseFormReactivity(form: UseFormReturn<CourseFormValues>) {
  const tipo = useWatch({ control: form.control, name: "tipo" })
  const creditosT = useWatch({ control: form.control, name: "creditosT" })
  const creditosP = useWatch({ control: form.control, name: "creditosP" })

  const isInitialMount = useRef(true)

  useEffect(() => {
    // Mount inicial: bajamos el flag y NO limpiamos.
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    if (!tipo) return

    if (tipo === "TEORICO") {
      form.setValue("creditosT", null)
      form.setValue("creditosP", null)
      form.setValue("horasSemP", null)
    } else if (tipo === "PRACTICO") {
      form.setValue("creditosT", null)
      form.setValue("creditosP", null)
      form.setValue("horasSemT", null)
    }
    // TEORICO_PRACTICO: ambos lados aplican; no se limpia nada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo])

  useEffect(() => {
    if (tipo !== "TEORICO_PRACTICO") return
    const sum = (creditosT ?? 0) + (creditosP ?? 0)
    form.setValue("creditos", sum > 0 ? sum : 1, { shouldValidate: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, creditosT, creditosP])

  return { tipo, creditosT, creditosP }
}

// =====================================================================
// FORM BODY — JSX compartido de los 3 bloques
// =====================================================================
/**
 * Renderiza los tres bloques del formulario (Identificación, Carga
 * Académica reactiva, Clasificación y Normativa). Asume que el caller
 * ya envuelve este componente en `<Form {...form}>` de shadcn.
 */
export function CourseFormBody({
  form,
}: {
  form: UseFormReturn<CourseFormValues>
}) {
  const { tipo, creditosT, creditosP } = useCourseFormReactivity(form)

  const totalTP = (creditosT ?? 0) + (creditosP ?? 0)
  const showHorasT = tipo === "TEORICO" || tipo === "TEORICO_PRACTICO"
  const showHorasP = tipo === "PRACTICO" || tipo === "TEORICO_PRACTICO"
  const horasGridClass =
    tipo === "TEORICO_PRACTICO" ? "grid grid-cols-3 gap-4" : "grid grid-cols-2 gap-4"
  const totalTPValido = totalTP >= 1 && totalTP <= 12

  return (
    <div className="space-y-6">
      {/* ── BLOQUE 1: IDENTIFICACIÓN ─────────────────────────────────── */}
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Identificación
        </p>

        <div className="grid grid-cols-[1fr_2fr] gap-4">
          <FormField
            control={form.control}
            name="codigo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Código <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input id="input-codigo-curso" placeholder="Ej: MAT101" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Nombre del Curso <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    id="input-nombre-curso"
                    placeholder="Ej: Cálculo Diferencial"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="tipo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Tipo de Curso <span className="text-destructive">*</span>
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger id="select-tipo-curso">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="TEORICO">Teórico</SelectItem>
                  <SelectItem value="TEORICO_PRACTICO">Teórico - Práctico</SelectItem>
                  <SelectItem value="PRACTICO">Práctico</SelectItem>
                </SelectContent>
              </Select>
              {tipo && (
                <p className="flex items-start gap-1.5 text-xs text-muted-foreground pt-1">
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>{TIPO_DESCRIPCIONES[tipo]}</span>
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {tipo && (
        <>
          <Separator />

          {/* ── BLOQUE 2: CARGA ACADÉMICA ────────────────────────────── */}
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Carga Académica
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Campos derivados del Acuerdo 033/2024 (créditos) y CA 009/2026
                (horas semanales).
              </p>
            </div>

            {tipo === "TEORICO_PRACTICO" ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="creditosT"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Créditos Teóricos{" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <OptionalIntInput
                            field={field}
                            id="input-creditos-t"
                            max={12}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="creditosP"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Créditos Prácticos{" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <OptionalIntInput
                            field={field}
                            id="input-creditos-p"
                            max={12}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
                  <span className="text-xs text-muted-foreground">
                    Total calculado:
                  </span>
                  <Badge variant={totalTPValido ? "default" : "destructive"}>
                    {totalTP} {totalTP === 1 ? "crédito" : "créditos"}
                  </Badge>
                  {!totalTPValido && totalTP > 0 && (
                    <span className="text-xs text-destructive">
                      Fuera de rango (1–12).
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <FormField
                control={form.control}
                name="creditos"
                render={({ field }) => (
                  <FormItem className="max-w-[200px]">
                    <FormLabel>
                      Créditos <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        id="input-creditos-curso"
                        type="number"
                        min={1}
                        max={12}
                        name={field.name}
                        ref={field.ref}
                        value={field.value ?? ""}
                        onBlur={field.onBlur}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 1)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className={horasGridClass}>
              {showHorasT && (
                <FormField
                  control={form.control}
                  name="horasSemT"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>H. Teóricas/Sem</FormLabel>
                      <FormControl>
                        <OptionalIntInput
                          field={field}
                          id="input-horas-sem-t"
                          max={40}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {showHorasP && (
                <FormField
                  control={form.control}
                  name="horasSemP"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>H. Prácticas/Sem</FormLabel>
                      <FormControl>
                        <OptionalIntInput
                          field={field}
                          id="input-horas-sem-p"
                          max={40}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="horasSemI"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>H. Independientes/Sem</FormLabel>
                    <FormControl>
                      <OptionalIntInput
                        field={field}
                        id="input-horas-sem-i"
                        max={40}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <Separator />

          {/* ── BLOQUE 3: CLASIFICACIÓN Y NORMATIVA ──────────────────── */}
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Clasificación y Normativa
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Campos opcionales. Afectan filtros, reportes y selectores del catálogo.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="componente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Componente Curricular</FormLabel>
                    <Select
                      onValueChange={(v) =>
                        field.onChange(v === "__none__" ? null : v)
                      }
                      value={field.value ?? "__none__"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sin componente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Sin componente</SelectItem>
                        {Object.entries(COMPONENTE_LABELS).map(([val, label]) => (
                          <SelectItem key={val} value={val}>
                            {label}
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
                name="facultad"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Facultad</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: Ingeniería"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="acuerdoOrigen"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Acuerdo de Origen</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: CA 009/2026 Art. 5"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </>
      )}
    </div>
  )
}
