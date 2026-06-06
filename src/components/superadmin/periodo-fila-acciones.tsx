"use client"

import { useState } from "react"
import { EstadoPeriodo } from "@/generated/prisma/client"
import { PeriodoAccionesDropdown } from "./periodo-acciones-dropdown"
import { EditPeriodoSuperadminSheet } from "./edit-periodo-superadmin-sheet"

interface Props {
  periodo: {
    id: string
    nombre: string
    fechaInicio: Date
    estado: EstadoPeriodo
  }
  canEdit: boolean
  semanasPeriodo: number
}

export function PeriodoFilaAcciones({ periodo, canEdit, semanasPeriodo }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <>
      <PeriodoAccionesDropdown
        periodoId={periodo.id}
        periodoNombre={periodo.nombre}
        currentStatus={periodo.estado}
        canEdit={canEdit}
        onEdit={() => setSheetOpen(true)}
      />
      <EditPeriodoSuperadminSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        periodo={periodo}
        semanasPeriodo={semanasPeriodo}
      />
    </>
  )
}
