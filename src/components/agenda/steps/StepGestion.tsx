"use client"

import { useFormContext, useFieldArray } from "react-hook-form"
import type { AgendaWizardFormData } from "@/lib/schemas/agenda-schema"
import { EMPTY_ACTIVIDAD } from "@/lib/schemas/agenda-schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form"
import { Plus, Trash2, AlertCircle } from "lucide-react"
import { CalculadoraActividad } from "@/components/agenda/CalculadoraActividad"

/**
 * Paso 4 — Sección 4: Gestión Académico-Administrativa (CONDICIONAL)
 *
 * Renderizado condicional estricto:
 * - Si cargoAdministrativo === true → renderiza el useFieldArray
 * - Si cargoAdministrativo === false → retorna null (no existe en el DOM)
 *
 * El stepper en AgendaWizardForm salta este paso automáticamente
 * cuando cargoAdministrativo es false.
 *
 * Cada actividad captura: nombre, horasSemanales, semanas, descripcion.
 * La dedicacionPeriodo se calcula silenciosamente (horasSemanales × semanas)
 * mediante el componente CalculadoraActividad.
 */
export function StepGestion({
  cargoAdministrativo,
  semanasPeriodo,
}: {
  cargoAdministrativo: boolean
  semanasPeriodo: number
}) {
  const { control, formState: { errors } } = useFormContext<AgendaWizardFormData>()

  // Extraer el error a nivel de array
  const gestionError = 
    errors.actividadesGestion?.root?.message || 
    errors.actividadesGestion?.message

  const {
    fields: gestionFields,
    append: appendGestion,
    remove: removeGestion,
  } = useFieldArray({ control, name: "actividadesGestion" })

  // Renderizado condicional estricto: si no tiene cargo, no renderiza nada
  if (!cargoAdministrativo) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>4. Gestión Académico-Administrativa</CardTitle>
        <CardDescription>
          Actividades administrativas como coordinación de programa, comités
          académicos, representación institucional, cargos directivos, etc.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {gestionError && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-semibold text-destructive">
                Error de validación (Acuerdo 048)
              </p>
              <p className="mt-1 text-sm text-destructive/80">
                {gestionError}
              </p>
            </div>
          </div>
        )}

        {gestionFields.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No ha agregado actividades de gestión administrativa.
          </p>
        )}

        {gestionFields.map((field, index) => (
          <div
            key={field.id}
            className="relative rounded-lg border p-4"
          >
            {/* Silent calculator — renders nothing */}
            <CalculadoraActividad
              arrayName="actividadesGestion"
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
                onClick={() => removeGestion(index)}
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
                  name={`actividadesGestion.${index}.nombre`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>Nombre de la actividad *</FormLabel>
                      <FormControl>
                        <Input
                          {...f}
                          placeholder="Ej: Coordinación del programa de Ingeniería"
                        />
                      </FormControl>
                      <FormDescription>
                        Nombre del cargo o actividad administrativa
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Horas semanales — 3 columnas */}
              <div className="sm:col-span-3">
                <FormField
                  control={control}
                  name={`actividadesGestion.${index}.horasSemanales`}
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
                  name={`actividadesGestion.${index}.semanas`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>Semanas *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={semanasPeriodo}
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

              {/* Descripción — 12 columnas (full width) */}
              <div className="sm:col-span-12">
                <FormField
                  control={control}
                  name={`actividadesGestion.${index}.descripcion`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea
                          {...f}
                          rows={2}
                          placeholder="Descripción de las funciones y responsabilidades (opcional)"
                        />
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
          onClick={() => appendGestion({ ...EMPTY_ACTIVIDAD, horasSemanales: 0, semanas: 0 })}
          className="w-full border-dashed"
        >
          <Plus className="mr-2 h-4 w-4" />
          Agregar Actividad de Gestión
        </Button>
      </CardContent>
    </Card>
  )
}
