"use client"

import { useFormContext, useFieldArray, useWatch } from "react-hook-form"
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
import { Plus, AlertCircle } from "lucide-react"
import { ActividadCardRow } from "@/components/agenda/ActividadCardRow"
import type { ActividadCatalogoOption } from "@/components/agenda/ActividadCatalogoSelector"

/**
 * Paso 4 — Sección 4: Gestión Académico-Administrativa (CONDICIONAL)
 *
 * Renderizado condicional estricto:
 * - Si cargoAdministrativo === true → renderiza el useFieldArray
 * - Si cargoAdministrativo === false → retorna null (no existe en el DOM)
 *
 * El stepper en AgendaWizardForm salta este paso automáticamente cuando
 * cargoAdministrativo es false.
 *
 * El docente selecciona del catálogo Art. 11 (Acuerdo 048/2018) y solo digita
 * el total semestral de horas. La validación del tope individual de cada
 * actividad la realiza el schema Zod en el envío; la UI muestra feedback
 * inmediato vía ActividadCardRow.
 *
 * El tope global del 20% (Art. 10) NO aplica a docentes cuyo cargo está
 * en la lista de exentos (Jefes de Programa/Departamento, Asesores de
 * Vicerrectoría/Rectoría, Decanos): para ellos `excluyeTopeGestion20=true`
 * y la alerta del 20% no se muestra.
 */
export function StepGestion({
  cargoAdministrativo,
  semanasPeriodo,
  maxHoras,
  excluyeTopeGestion20,
  catalogoActividades,
}: {
  cargoAdministrativo: boolean
  semanasPeriodo: number
  maxHoras: number
  excluyeTopeGestion20: boolean
  catalogoActividades: ActividadCatalogoOption[]
}) {
  const { control, formState: { errors } } = useFormContext<AgendaWizardFormData>()

  // Todos los hooks deben llamarse antes de cualquier return condicional (regla de hooks de React)
  const actividadesGestionLive = useWatch<AgendaWizardFormData, "actividadesGestion">({
    control,
    name: "actividadesGestion",
  }) ?? []

  const {
    fields: gestionFields,
    append: appendGestion,
    remove: removeGestion,
  } = useFieldArray({ control, name: "actividadesGestion" })

  // Extraer el error a nivel de array (del validador Zod tras intento de envío)
  const gestionError =
    errors.actividadesGestion?.root?.message ||
    errors.actividadesGestion?.message

  // Cálculo en tiempo real del límite Art. 10 (20% de la carga semestral)
  // Solo aplica si el cargo NO está en la lista de exentos del Art. 10/11.
  const limiteGestionSemestral = Math.floor(maxHoras * semanasPeriodo * 0.20)
  const totalGestionActual = (actividadesGestionLive as { dedicacionPeriodo?: number }[])
    .reduce((acc, a) => acc + (Number(a?.dedicacionPeriodo) || 0), 0)
  const excedeLimiteGestion = !excluyeTopeGestion20 && totalGestionActual > limiteGestionSemestral

  // Renderizado condicional estricto: si no tiene cargo, no renderiza nada
  if (!cargoAdministrativo) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>4. Gestión Académico-Administrativa</CardTitle>
        <CardDescription>
          Seleccione del catálogo oficial (Art. 11 del Acuerdo 048/2018) el cargo
          o actividad administrativa que ejerce este semestre. Cada actividad
          trae su tope individual precargado.
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

        {/* Alerta en tiempo real: tope global del 20% (Art. 10).
            No se muestra para los 5 cargos exentos (Art. 11). */}
        {excedeLimiteGestion && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-semibold text-destructive">
                Excede el límite de gestión permitido (Máximo: {limiteGestionSemestral}h)
              </p>
              <p className="mt-1 text-sm text-destructive/80">
                Total registrado: <strong>{totalGestionActual}h</strong> — exceso de{" "}
                <strong>{totalGestionActual - limiteGestionSemestral}h</strong> sobre el 20% de la carga
                semestral. Reduzca las horas de gestión antes de continuar (Art. 10, Acuerdo 048).
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
          <ActividadCardRow
            key={field.id}
            index={index}
            arrayName="actividadesGestion"
            catalogo={catalogoActividades}
            categoria="GESTION"
            semanasPeriodo={semanasPeriodo}
            onRemove={() => removeGestion(index)}
          />
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
