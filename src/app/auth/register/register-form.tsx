"use client"

import { useActionState, useState } from "react"
import Link from "next/link"
import { registerAction } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { TIPOS_CARGO } from "@/lib/schemas/profile-schema"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  SEDES,
  FACULTAD_PROGRAMAS,
  CARGO_AMBITO,
  opcionesAmbito,
} from "@/lib/constants"

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

function EyeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
      <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
      <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
      <path d="m2 2 20 20" />
    </svg>
  )
}

export function RegisterForm({ maxSemanas }: { maxSemanas: number }) {
  const [state, formAction, pending] = useActionState(registerAction, null)
  const v = state?.values

  const [selectedFacultad, setSelectedFacultad] = useState<string>("")
  const [selectedPrograma, setSelectedPrograma] = useState<string>("")
  const [selectedSede, setSelectedSede] = useState<string>("")
  const [selectedModalidad, setSelectedModalidad] = useState<string>("")

  // Condiciones académicas (Acuerdo 048) — proyectosActivos NO se captura aquí.
  const [doctorado, setDoctorado] = useState(false)
  const [tituloDoctorado, setTituloDoctorado] = useState("")
  const [cargoAdministrativo, setCargoAdministrativo] = useState(false)
  const [tipoCargo, setTipoCargo] = useState("")
  const [cargoAmbitoValor, setCargoAmbitoValor] = useState("")

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const isCatedra = selectedModalidad === "CATEDRA"
  const ambitoCfg = tipoCargo ? CARGO_AMBITO[tipoCargo] ?? null : null
  const ambitoOpciones = opcionesAmbito(tipoCargo)
  const isFormInvalid =
    pending ||
    password !== confirmPassword ||
    !password ||
    (!isCatedra && cargoAdministrativo && !tipoCargo) ||
    (!isCatedra && cargoAdministrativo && !!ambitoCfg && !cargoAmbitoValor)
  const programas = selectedFacultad ? FACULTAD_PROGRAMAS[selectedFacultad] || [] : []

  const handleFacultadChange = (value: string) => {
    setSelectedFacultad(value)
    setSelectedPrograma("")
  }

  // CÁTEDRA (Art. 10): no puede tener cargo administrativo. Se resetea aquí
  // (en el handler, no en un efecto) al cambiar de modalidad.
  const handleModalidadChange = (value: string) => {
    setSelectedModalidad(value)
    if (value === "CATEDRA") {
      setCargoAdministrativo(false)
      setTipoCargo("")
      setCargoAmbitoValor("")
    }
  }

  // Al cambiar de cargo, el ámbito previo deja de ser válido → resetear.
  const handleTipoCargoChange = (value: string) => {
    setTipoCargo(value)
    setCargoAmbitoValor("")
  }

  const inputStyle = "h-11 border-gray-300 rounded-lg transition-colors duration-200 focus:border-[#8F141B] focus:ring-[#8F141B]/20"
  const labelStyle = "text-sm font-medium text-gray-700"

  return (
    <Card className="w-full max-w-2xl border-0 shadow-xl bg-white my-8">
      <CardHeader className="text-center pb-2 pt-8">
        <div className="lg:hidden mb-4">
          <h2 className="text-3xl font-bold tracking-tight text-[#8F141B]">SAGE</h2>
          <p className="text-xs text-gray-400 mt-1">Universidad Surcolombiana</p>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Crear cuenta</h1>
        <p className="text-sm text-gray-500 mt-1">Registra tu cuenta de docente en SAGE</p>
      </CardHeader>

      <CardContent className="px-8 pt-4">
        {state?.error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-5">
          {/* ── Fila 1: Nombres + Cédula ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre" className={labelStyle}>Nombres</Label>
              <Input
                id="nombre"
                name="nombre"
                placeholder="Nombre completo"
                required
                defaultValue={v?.nombre ?? ""}
                pattern="[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]+"
                title="Solo letras y espacios"
                className={inputStyle}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cedula" className={labelStyle}>Cédula</Label>
              <Input
                id="cedula"
                name="cedula"
                placeholder="Número de cédula"
                required
                inputMode="numeric"
                pattern="\d{6,12}"
                title="Solo números, entre 6 y 12 dígitos"
                maxLength={12}
                defaultValue={v?.cedula ?? ""}
                onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "") }}
                className={inputStyle}
              />
            </div>
          </div>

          {/* ── Fila 2: Email + Celular ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className={labelStyle}>Email institucional</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="correo@usco.edu.co"
                required
                defaultValue={v?.email ?? ""}
                className={inputStyle}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="celular" className={labelStyle}>Celular</Label>
              <Input
                id="celular"
                name="celular"
                type="tel"
                inputMode="numeric"
                placeholder="3XXXXXXXXX"
                required
                pattern="\d{10}"
                title="Debe ser un número de 10 dígitos"
                maxLength={10}
                defaultValue={v?.celular ?? ""}
                onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "") }}
                className={inputStyle}
              />
            </div>
          </div>

          {/* ── Fila 3: Contraseña ── */}
          <div className="space-y-2">
            <Label htmlFor="password" className={labelStyle}>Contraseña</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputStyle} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {/* ── Fila 3b: Confirmar Contraseña ── */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className={labelStyle}>Confirmar Contraseña</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Repite tu contraseña"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`${inputStyle} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {password && confirmPassword && password !== confirmPassword && (
              <p className="text-red-500 text-sm">Las contraseñas no coinciden</p>
            )}
          </div>

          {/* ── Separador visual ── */}
          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-gray-400">Información académica</span>
            </div>
          </div>

          {/* ── Fila 4: Sede + Modalidad ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sede" className={labelStyle}>Sede</Label>
              <Select value={selectedSede} onValueChange={setSelectedSede}>
                <SelectTrigger id="sede" className={inputStyle}>
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
              <Label htmlFor="modalidad" className={labelStyle}>Modalidad de vinculación</Label>
              <Select value={selectedModalidad} onValueChange={handleModalidadChange}>
                <SelectTrigger id="modalidad" className={inputStyle}>
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

          {/* ── Fila 5: Facultad + Programa (dinámico) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="facultad" className={labelStyle}>Facultad</Label>
              <Select value={selectedFacultad} onValueChange={handleFacultadChange}>
                <SelectTrigger id="facultad" className={inputStyle}>
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
              <Label htmlFor="programa" className={labelStyle}>Programa académico</Label>
              <Select
                disabled={!selectedFacultad}
                value={selectedPrograma}
                onValueChange={setSelectedPrograma}
              >
                <SelectTrigger
                  id="programa"
                  className={`${inputStyle} ${!selectedFacultad ? "opacity-50 cursor-not-allowed" : ""}`}
                >
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

          {/* ── Semanas de vinculación — solo para modalidades con contrato temporal ── */}
          {MODALIDADES_TEMPORALES.has(selectedModalidad) && (
            <div className="space-y-2">
              <Label htmlFor="semanasVinculacion" className={labelStyle}>
                Semanas de vinculación <span className="text-gray-400 font-normal">(opcional)</span>
              </Label>
              <Input
                id="semanasVinculacion"
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
                Semanas de su contrato en este período (1–{maxSemanas}). Determina la carga proporcional. Si no lo sabe aún, puede completarlo después en su perfil.
              </p>
            </div>
          )}

          {/* ── Separador: Condiciones académicas ── */}
          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-gray-400">Condiciones académicas (Acuerdo 048)</span>
            </div>
          </div>

          {/* Doctorado */}
          <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
            <div className="space-y-0.5 pr-3">
              <Label className={labelStyle}>Doctorado</Label>
              <p className="text-xs text-gray-400">
                Art. 4 Par. 3 — Vinculación obligatoria a grupo de investigación.
              </p>
            </div>
            <Switch checked={doctorado} onCheckedChange={setDoctorado} />
          </div>
          {doctorado && (
            <div className="space-y-2">
              <Label htmlFor="tituloDoctorado" className={labelStyle}>
                Área del doctorado <span className="text-gray-400 font-normal">(opcional)</span>
              </Label>
              <Input
                id="tituloDoctorado"
                value={tituloDoctorado}
                onChange={(e) => setTituloDoctorado(e.target.value)}
                maxLength={200}
                placeholder="Ej: Ingeniería de Sistemas"
                className={inputStyle}
              />
            </div>
          )}

          {/* Cargo administrativo */}
          <div className={`flex items-center justify-between rounded-lg border border-gray-200 p-3 ${isCatedra ? "opacity-50" : ""}`}>
            <div className="space-y-0.5 pr-3">
              <Label className={labelStyle}>Cargo administrativo</Label>
              <p className="text-xs text-gray-400">
                {isCatedra
                  ? "No disponible para modalidad Cátedra (Art. 10)."
                  : "Art. 10 — La gestión no puede exceder el 20% del tiempo laboral."}
              </p>
            </div>
            <Switch
              checked={cargoAdministrativo}
              onCheckedChange={setCargoAdministrativo}
              disabled={isCatedra}
            />
          </div>
          {cargoAdministrativo && !isCatedra && (
            <div className="space-y-2">
              <Label htmlFor="tipoCargo" className={labelStyle}>Tipo de cargo</Label>
              <Select value={tipoCargo} onValueChange={handleTipoCargoChange}>
                <SelectTrigger id="tipoCargo" className={inputStyle}>
                  <SelectValue placeholder="Seleccionar tipo de cargo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_CARGO.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* "¿De cuál?" — ámbito específico del cargo (Decano→Facultad, Jefe de
              Programa→Programa, etc.). Solo para cargos que manejan ámbito. */}
          {cargoAdministrativo && !isCatedra && ambitoCfg && (
            <div className="space-y-2">
              <Label htmlFor="cargoAmbitoValor" className={labelStyle}>Programa / Facultad</Label>
              <Select value={cargoAmbitoValor} onValueChange={setCargoAmbitoValor}>
                <SelectTrigger id="cargoAmbitoValor" className={inputStyle}>
                  <SelectValue placeholder={ambitoCfg.tipo === "FACULTAD" ? "Seleccionar facultad" : "Seleccionar programa"} />
                </SelectTrigger>
                <SelectContent>
                  {ambitoOpciones.map((op) => (
                    <SelectItem key={op} value={op}>{op}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400">
                Indica específicamente cuál {ambitoCfg.tipo === "FACULTAD" ? "facultad" : "programa"} corresponde a tu cargo. No se asume por tu programa.
              </p>
            </div>
          )}

          {/* Inputs ocultos */}
          <input type="hidden" name="sede" value={selectedSede} />
          <input type="hidden" name="modalidad" value={selectedModalidad} />
          <input type="hidden" name="facultad" value={selectedFacultad} />
          <input type="hidden" name="programa" value={selectedPrograma} />
          <input type="hidden" name="doctorado" value={doctorado ? "true" : "false"} />
          <input type="hidden" name="tituloDoctorado" value={doctorado ? tituloDoctorado : ""} />
          <input type="hidden" name="cargoAdministrativo" value={cargoAdministrativo ? "true" : "false"} />
          <input type="hidden" name="tipoCargo" value={cargoAdministrativo ? tipoCargo : ""} />
          <input type="hidden" name="cargoAmbitoValor" value={cargoAdministrativo && ambitoCfg ? cargoAmbitoValor : ""} />

          {/* ── Botón de envío ── */}
          <Button
            type="submit"
            className="w-full h-11 bg-[#8F141B] hover:bg-[#7a1017] text-white font-semibold rounded-lg shadow-md shadow-[#8F141B]/25 transition-all duration-200 hover:shadow-lg hover:shadow-[#8F141B]/30 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isFormInvalid}
          >
            {pending ? "Registrando..." : "Registrar"}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center pb-8 pt-4">
        <p className="text-sm text-gray-500">
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/auth/login"
            className="text-[#8F141B] font-medium hover:underline transition-colors duration-200"
          >
            Inicia sesión
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
