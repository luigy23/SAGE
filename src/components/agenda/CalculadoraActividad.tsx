"use client"

import { useEffect } from "react"
import { useFormContext, useWatch } from "react-hook-form"
import type { AgendaWizardFormData } from "@/lib/schemas/agenda-schema"

/**
 * CalculadoraActividad — Silent Math Engine
 *
 * Watches `horasSemanales` and `semanas` for a specific activity at the given
 * index within a useFieldArray, then silently mutates `dedicacionPeriodo`
 * using the strict Acuerdo 048 formula: horasSemanales × semanas.
 *
 * Renders absolutely nothing (returns null).
 */
type ArrayFieldName =
  | "actividadesInvestigacion"
  | "actividadesProyeccionSocial"
  | "actividadesGestion"
  | "otrasActividadesDocencia"

interface CalculadoraActividadProps {
  arrayName: ArrayFieldName
  index: number
}

export function CalculadoraActividad({ arrayName, index }: CalculadoraActividadProps) {
  const { setValue, control } = useFormContext<AgendaWizardFormData>()

  const horasSemanales = useWatch({
    control,
    name: `${arrayName}.${index}.horasSemanales`,
  })

  const semanas = useWatch({
    control,
    name: `${arrayName}.${index}.semanas`,
  })

  useEffect(() => {
    const h = Number(horasSemanales) || 0
    const s = Number(semanas) || 0
    const total = h * s

    setValue(`${arrayName}.${index}.dedicacionPeriodo`, total, {
      shouldValidate: true,
    })
  }, [horasSemanales, semanas, arrayName, index, setValue])

  return null
}
