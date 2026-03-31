"use client"

import { useActionState, useState, useEffect } from "react"
import Link from "next/link"
import { registerAction } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
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
import { SEDES } from "@/lib/constants"

// =============================================
// DICCIONARIO ESTRICTO: Facultad → Programa
// =============================================
const FACULTAD_PROGRAMAS: Record<string, string[]> = {
  "Ingeniería": [
    "Ingeniería de Software",
    "Ingeniería de Sistemas",
    "Ingeniería Civil",
    "Ingeniería Agrícola",
    "Ingeniería Electrónica",
  ],
  "Salud": [
    "Medicina",
    "Enfermería",
  ],
  "Educación": [
    "Licenciatura en Educación Infantil",
    "Licenciatura en Matemáticas",
    "Licenciatura en Ciencias Naturales",
  ],
  "Economía y Administración": [
    "Administración de Empresas",
    "Contaduría Pública",
    "Economía",
  ],
  "Ciencias Exactas y Naturales": [
    "Biología",
    "Matemática Aplicada",
  ],
  "Ciencias Sociales y Humanas": [
    "Derecho",
    "Psicología",
    "Comunicación Social",
  ],
}

const MODALIDADES = [
  { value: "TCP", label: "Tiempo Completo Planta" },
  { value: "TCO", label: "Tiempo Completo Ocasional" },
  { value: "MTP", label: "Medio Tiempo Planta" },
  { value: "MTC", label: "Medio Tiempo Cátedra" },
  { value: "CATEDRA", label: "Cátedra" },
]

const CARGOS_ADMINISTRATIVOS = [
  { value: "JEFE_PROGRAMA", label: "Jefe de Programa" },
  { value: "JEFE_DEPARTAMENTO", label: "Jefe de Departamento" },
  { value: "COORD_INVESTIGACION", label: "Coordinador de Centro de Investigación" },
  { value: "COORD_EMPRENDIMIENTO", label: "Coordinador de Emprendimiento e Innovación" },
  { value: "COORD_AUTOEVALUACION", label: "Coordinador de Autoevaluación y Calidad" },
  { value: "COORD_AREA", label: "Coordinador de Área" },
  { value: "OTRO_COMITE", label: "Otro (Miembro de Comité / Consejo)" },
]

// =============================================
// SVG Icons (Eye / EyeOff)
// =============================================
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

// =============================================
// Componente de Registro
// =============================================
export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(registerAction, null)
  const v = state?.values // Valores preservados del intento anterior
  const [selectedFacultad, setSelectedFacultad] = useState("")
  const [selectedPrograma, setSelectedPrograma] = useState("")
  const [selectedSede, setSelectedSede] = useState("")
  const [selectedModalidad, setSelectedModalidad] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [hasDoctorado, setHasDoctorado] = useState(false)
  const [hasCargoAdministrativo, setHasCargoAdministrativo] = useState(false)
  const [hasProyectosActivos, setHasProyectosActivos] = useState(false)
  const [selectedCargo, setSelectedCargo] = useState("")

  // Restaurar valores de Select cuando el server action retorna error
  useEffect(() => {
    if (state?.values) {
      const sv = state.values
      if (sv.facultad) setSelectedFacultad(sv.facultad)
      if (sv.programa) setSelectedPrograma(sv.programa)
      if (sv.sede) setSelectedSede(sv.sede)
      if (sv.modalidad) setSelectedModalidad(sv.modalidad)
      setHasDoctorado(sv.doctorado)
      setHasCargoAdministrativo(sv.cargoAdministrativo)
      setHasProyectosActivos(sv.proyectosActivos)
    }
  }, [state])

  const isFormInvalid = pending || password !== confirmPassword || !password || (hasCargoAdministrativo && !selectedCargo)

  const programas = selectedFacultad ? FACULTAD_PROGRAMAS[selectedFacultad] || [] : []

  const handleFacultadChange = (value: string) => {
    setSelectedFacultad(value)
    setSelectedPrograma("") // Reset programa al cambiar facultad
  }

  // Estilos reutilizables coherente con login
  const inputStyle = "h-11 border-gray-300 rounded-lg transition-colors duration-200 focus:border-[#8F141B] focus:ring-[#8F141B]/20"
  const labelStyle = "text-sm font-medium text-gray-700"

  return (
    <Card className="w-full max-w-2xl border-0 shadow-xl bg-white my-8">
      <CardHeader className="text-center pb-2 pt-8">
        {/* Título SAGE visible solo en móvil */}
        <div className="lg:hidden mb-4">
          <h2 className="text-3xl font-bold tracking-tight text-[#8F141B]">
            SAGE
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Universidad Surcolombiana
          </p>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Crear cuenta</h1>
        <p className="text-sm text-gray-500 mt-1">
          Registra tu cuenta de docente en SAGE
        </p>
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
              <Select name="sede" required value={selectedSede} onValueChange={setSelectedSede}>
                <SelectTrigger id="sede" className={inputStyle}>
                  <SelectValue placeholder="Seleccionar sede" />
                </SelectTrigger>
                <SelectContent>
                  {SEDES.map((sede) => (
                    <SelectItem key={sede} value={sede}>{sede}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="modalidad" className={labelStyle}>Modalidad de vinculación</Label>
              <Select name="modalidad" required value={selectedModalidad} onValueChange={setSelectedModalidad}>
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
              <Select
                name="facultad"
                required
                value={selectedFacultad}
                onValueChange={handleFacultadChange}
              >
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
              <Label htmlFor="programa" className={labelStyle}>
                Programa académico
              </Label>
              <Select
                name="programa"
                required
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

          {/* ── Separador visual ── */}
          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-gray-400">Información adicional</span>
            </div>
          </div>

          {/* ── Fila 6: Checkboxes booleanos ── */}
          {/*
            NOTA: Shadcn <Checkbox> es un botón Radix, NO un <input type="checkbox">.
            No serializa a FormData. Usamos hidden inputs sincronizados con el state.
          */}
          <input type="hidden" name="doctorado" value={hasDoctorado ? "true" : "false"} />
          <input type="hidden" name="cargoAdministrativo" value={hasCargoAdministrativo ? "true" : "false"} />
          <input type="hidden" name="proyectosActivos" value={hasProyectosActivos ? "true" : "false"} />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label
              htmlFor="doctorado-cb"
              className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
            >
              <Checkbox id="doctorado-cb" checked={hasDoctorado} onCheckedChange={(checked: boolean) => setHasDoctorado(checked)} />
              <span className="text-sm text-gray-700">Doctorado</span>
            </label>
            <label
              htmlFor="hasCargoAdministrativo-cb"
              className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
            >
              <Checkbox
                id="hasCargoAdministrativo-cb"
                checked={hasCargoAdministrativo}
                onCheckedChange={(checked: boolean) => setHasCargoAdministrativo(checked)}
              />
              <span className="text-sm text-gray-700">Cargo administrativo</span>
            </label>
            <label
              htmlFor="proyectosActivos-cb"
              className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
            >
              <Checkbox id="proyectosActivos-cb" checked={hasProyectosActivos} onCheckedChange={(checked: boolean) => setHasProyectosActivos(checked)} />
              <span className="text-sm text-gray-700">Proyectos activos</span>
            </label>
          </div>

          {/* ── Campo condicional: Tipo de Cargo Administrativo (Acuerdo 048) ── */}
          {hasCargoAdministrativo && (
            <div className="space-y-2">
              <Label htmlFor="tipoCargo" className={labelStyle}>Tipo de cargo administrativo</Label>
              <Select
                name="tipoCargo"
                required
                value={selectedCargo}
                onValueChange={setSelectedCargo}
              >
                <SelectTrigger
                  id="tipoCargo"
                  className={`${inputStyle} ${hasCargoAdministrativo && !selectedCargo ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                >
                  <SelectValue placeholder="Seleccionar cargo" />
                </SelectTrigger>
                <SelectContent>
                  {CARGOS_ADMINISTRATIVOS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!selectedCargo && (
                <p className="text-red-500 text-sm">Debe seleccionar un cargo administrativo para continuar</p>
              )}
            </div>
          )}

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
