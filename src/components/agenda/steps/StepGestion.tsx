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
import { Plus, Trash2 } from "lucide-react"

/**
 * Paso 4 — Sección 4: Gestión Académico-Administrativa (CONDICIONAL)
 *
 * Renderizado condicional estricto:
 * - Si cargoAdministrativo === true → renderiza el useFieldArray
 * - Si cargoAdministrativo === false → retorna null (no existe en el DOM)
 *
 * El stepper en AgendaWizardForm salta este paso automáticamente
 * cuando cargoAdministrativo es false.
 */
export function StepGestion({
  cargoAdministrativo,
}: {
  cargoAdministrativo: boolean
}) {
  const { control } = useFormContext<AgendaWizardFormData>()

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

            <div className="grid gap-4 sm:grid-cols-2">
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

              <FormField
                control={control}
                name={`actividadesGestion.${index}.dedicacionPeriodo`}
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
                      Horas totales durante el semestre
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="sm:col-span-2">
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
          onClick={() => appendGestion({ ...EMPTY_ACTIVIDAD })}
          className="w-full border-dashed"
        >
          <Plus className="mr-2 h-4 w-4" />
          Agregar Actividad de Gestión
        </Button>
      </CardContent>
    </Card>
  )
}
