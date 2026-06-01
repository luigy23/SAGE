"use client"

import { useActionState, useState } from "react"
import { reAplicarAction } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SEDES, FACULTAD_PROGRAMAS } from "@/lib/constants"

const MODALIDADES = [
  { value: "PLANTA_TC", label: "Tiempo Completo Planta" },
  { value: "OCASIONAL_TC", label: "Tiempo Completo Ocasional" },
  { value: "PLANTA_MT", label: "Medio Tiempo Planta" },
  { value: "OCASIONAL_MT", label: "Medio Tiempo Ocasional" },
  { value: "CATEDRA", label: "Cátedra" },
  { value: "VISITANTE_TC", label: "Visitante Tiempo Completo" },
  { value: "VISITANTE_MT", label: "Visitante Medio Tiempo" },
  { value: "INVITADO", label: "Invitado" },
]

const MODALIDADES_TEMPORALES = new Set([
  "OCASIONAL_TC", "OCASIONAL_MT", "VISITANTE_TC", "VISITANTE_MT", "INVITADO",
])

interface Props {
  current: {
    facultad: string
    programa: string
    modalidad: string
    sedeBase: string
    celular: string | null
  }
  maxSemanas: number
}

export function ReAplicarForm({ current, maxSemanas }: Props) {
  const [state, formAction, pending] = useActionState(reAplicarAction, null)

  const [selectedFacultad, setSelectedFacultad] = useState(current.facultad)
  const [selectedPrograma, setSelectedPrograma] = useState(current.programa)
  const [selectedSede, setSelectedSede] = useState(current.sedeBase)
  const [selectedModalidad, setSelectedModalidad] = useState(current.modalidad)

  const programas = selectedFacultad ? FACULTAD_PROGRAMAS[selectedFacultad] || [] : []

  const handleFacultadChange = (value: string) => {
    setSelectedFacultad(value)
    if (!FACULTAD_PROGRAMAS[value]?.includes(selectedPrograma)) {
      setSelectedPrograma("")
    }
  }

  const inputStyle = "h-11 border-gray-300 rounded-lg transition-colors duration-200 focus:border-[#8F141B] focus:ring-[#8F141B]/20"
  const labelStyle = "text-sm font-medium text-gray-700"

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className={labelStyle}>Sede base</Label>
          <Select value={selectedSede} onValueChange={setSelectedSede}>
            <SelectTrigger className={inputStyle}>
              <SelectValue placeholder="Seleccionar sede" />
            </SelectTrigger>
            <SelectContent>
              {SEDES.map((sede) => (
                <SelectItem key={sede.value} value={sede.value}>{sede.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className={labelStyle}>Modalidad de vinculación</Label>
          <Select value={selectedModalidad} onValueChange={setSelectedModalidad}>
            <SelectTrigger className={inputStyle}>
              <SelectValue placeholder="Seleccionar modalidad" />
            </SelectTrigger>
            <SelectContent>
              {MODALIDADES.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className={labelStyle}>Facultad</Label>
          <Select value={selectedFacultad} onValueChange={handleFacultadChange}>
            <SelectTrigger className={inputStyle}>
              <SelectValue placeholder="Seleccionar facultad" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(FACULTAD_PROGRAMAS).map((fac) => (
                <SelectItem key={fac} value={fac}>{fac}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className={labelStyle}>Programa académico</Label>
          <Select
            disabled={!selectedFacultad}
            value={selectedPrograma}
            onValueChange={setSelectedPrograma}
          >
            <SelectTrigger className={`${inputStyle} ${!selectedFacultad ? "opacity-50 cursor-not-allowed" : ""}`}>
              <SelectValue placeholder={selectedFacultad ? "Seleccionar programa" : "Selecciona una facultad primero"} />
            </SelectTrigger>
            <SelectContent>
              {programas.map((prog) => (
                <SelectItem key={prog} value={prog}>{prog}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label className={labelStyle}>Celular (opcional)</Label>
        <Input
          name="celular"
          type="tel"
          inputMode="numeric"
          placeholder="3XXXXXXXXX"
          pattern="\d{10}"
          maxLength={10}
          defaultValue={current.celular ?? ""}
          onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "") }}
          className={inputStyle}
        />
      </div>

      {MODALIDADES_TEMPORALES.has(selectedModalidad) && (
        <div className="space-y-2">
          <Label className={labelStyle}>
            Semanas de vinculación <span className="text-gray-400 font-normal">(opcional)</span>
          </Label>
          <Input
            name="semanasVinculacion"
            type="number"
            min={1}
            max={maxSemanas}
            placeholder={`Ej: ${maxSemanas}`}
            className={inputStyle}
            onInput={(e) => {
              const val = parseInt(e.currentTarget.value, 10)
              if (!isNaN(val)) e.currentTarget.value = String(Math.min(Math.max(val, 1), maxSemanas))
            }}
          />
          <p className="text-xs text-gray-400">
            Semanas de su contrato en este período (1–{maxSemanas}). Puede completarlo después en su perfil.
          </p>
        </div>
      )}

      <input type="hidden" name="sede" value={selectedSede} />
      <input type="hidden" name="modalidad" value={selectedModalidad} />
      <input type="hidden" name="facultad" value={selectedFacultad} />
      <input type="hidden" name="programa" value={selectedPrograma} />

      <Button
        type="submit"
        className="w-full h-11 bg-[#8F141B] hover:bg-[#7a1017] text-white font-semibold rounded-lg"
        disabled={pending || !selectedFacultad || !selectedPrograma || !selectedSede || !selectedModalidad}
      >
        {pending ? "Enviando solicitud..." : "Reenviar solicitud"}
      </Button>
    </form>
  )
}
