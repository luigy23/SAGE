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
 * Paso 3 — Secciones 2 y 3: Investigación y Proyección Social
 *
 * Dos useFieldArray independientes:
 * - actividadesInvestigacion
 * - actividadesProyeccionSocial
 *
 * Cada actividad tiene: nombre, descripcion (textarea), dedicacionPeriodo.
 * Usa useFormContext() — no recibe form como prop.
 */
export function StepInvestigacionProyeccion() {
  const { control } = useFormContext<AgendaWizardFormData>()

  const {
    fields: invFields,
    append: appendInv,
    remove: removeInv,
  } = useFieldArray({ control, name: "actividadesInvestigacion" })

  const {
    fields: proFields,
    append: appendPro,
    remove: removePro,
  } = useFieldArray({ control, name: "actividadesProyeccionSocial" })

  return (
    <div className="space-y-8">
      {/* ==========================================
          Sección 2: Investigación
          ========================================== */}
      <Card>
        <CardHeader>
          <CardTitle>2. Actividades de Investigación</CardTitle>
          <CardDescription>
            Proyectos de investigación, publicaciones, participación en grupos de
            investigación, dirección de tesis, etc.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {invFields.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No ha agregado actividades de investigación.
            </p>
          )}

          {invFields.map((field, index) => (
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
                  onClick={() => removeInv(index)}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={control}
                  name={`actividadesInvestigacion.${index}.nombre`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>Nombre de la actividad *</FormLabel>
                      <FormControl>
                        <Input
                          {...f}
                          placeholder="Ej: Proyecto de investigación X"
                        />
                      </FormControl>
                      <FormDescription>
                        Nombre del proyecto o actividad de investigación
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name={`actividadesInvestigacion.${index}.dedicacionPeriodo`}
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
                    name={`actividadesInvestigacion.${index}.descripcion`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel>Descripción</FormLabel>
                        <FormControl>
                          <Textarea
                            {...f}
                            rows={2}
                            placeholder="Descripción detallada de la actividad (opcional)"
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
            onClick={() => appendInv({ ...EMPTY_ACTIVIDAD })}
            className="w-full border-dashed"
          >
            <Plus className="mr-2 h-4 w-4" />
            Agregar Actividad de Investigación
          </Button>
        </CardContent>
      </Card>

      {/* ==========================================
          Sección 3: Proyección Social
          ========================================== */}
      <Card>
        <CardHeader>
          <CardTitle>3. Actividades de Proyección Social</CardTitle>
          <CardDescription>
            Extensión universitaria, educación continua, consultoría,
            participación comunitaria, eventos académicos, etc.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {proFields.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No ha agregado actividades de proyección social.
            </p>
          )}

          {proFields.map((field, index) => (
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
                  onClick={() => removePro(index)}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={control}
                  name={`actividadesProyeccionSocial.${index}.nombre`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>Nombre de la actividad *</FormLabel>
                      <FormControl>
                        <Input
                          {...f}
                          placeholder="Ej: Diplomado en gestión ambiental"
                        />
                      </FormControl>
                      <FormDescription>
                        Nombre del proyecto o actividad de proyección social
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name={`actividadesProyeccionSocial.${index}.dedicacionPeriodo`}
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
                    name={`actividadesProyeccionSocial.${index}.descripcion`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel>Descripción</FormLabel>
                        <FormControl>
                          <Textarea
                            {...f}
                            rows={2}
                            placeholder="Descripción detallada de la actividad (opcional)"
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
            onClick={() => appendPro({ ...EMPTY_ACTIVIDAD })}
            className="w-full border-dashed"
          >
            <Plus className="mr-2 h-4 w-4" />
            Agregar Actividad de Proyección Social
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
