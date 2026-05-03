"use client"

import { useFormContext, useFieldArray } from "react-hook-form"
import type { AgendaWizardFormData } from "@/lib/schemas/agenda-schema"
import { EMPTY_ACTIVIDAD } from "@/lib/schemas/agenda-schema"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Plus } from "lucide-react"
import { ActividadCardRow } from "@/components/agenda/ActividadCardRow"
import type { ActividadCatalogoOption } from "@/components/agenda/ActividadCatalogoSelector"

/**
 * Paso 3 — Secciones 2 y 3: Investigación y Proyección Social
 *
 * El docente selecciona del catálogo Art. 11 (Acuerdo 048/2018) y solo escribe
 * la descripción específica del caso. Las horas se sugieren del tope normativo.
 */
export function StepInvestigacionProyeccion({
  catalogoActividades,
  semanasPeriodo,
}: {
  catalogoActividades: ActividadCatalogoOption[]
  semanasPeriodo: number
}) {
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
            Seleccione del catálogo oficial (Art. 11 del Acuerdo 048/2018).
            Cada actividad trae sus topes y restricciones precargados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {invFields.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No ha agregado actividades de investigación.
            </p>
          )}

          {invFields.map((field, index) => (
            <ActividadCardRow
              key={field.id}
              index={index}
              arrayName="actividadesInvestigacion"
              catalogo={catalogoActividades}
              categoria="INVESTIGACION"
              semanasPeriodo={semanasPeriodo}
              onRemove={() => removeInv(index)}
            />
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={() => appendInv({ ...EMPTY_ACTIVIDAD, horasSemanales: 0, semanas: 0 })}
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
            Seleccione del catálogo oficial (Art. 11 del Acuerdo 048/2018).
            Las horas y restricciones aparecen automáticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {proFields.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No ha agregado actividades de proyección social.
            </p>
          )}

          {proFields.map((field, index) => (
            <ActividadCardRow
              key={field.id}
              index={index}
              arrayName="actividadesProyeccionSocial"
              catalogo={catalogoActividades}
              categoria="PROYECCION_SOCIAL"
              semanasPeriodo={semanasPeriodo}
              onRemove={() => removePro(index)}
            />
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={() => appendPro({ ...EMPTY_ACTIVIDAD, horasSemanales: 0, semanas: 0 })}
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
