"use server"

import { signIn, auth, signOut } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { redirect } from "next/navigation"
import {
  FACULTAD_PROGRAMAS,
  FACULTADES,
  PROGRAMAS,
  CARGO_AMBITO,
} from "@/lib/constants"

// =============================================
// DICCIONARIO DE MODALIDAD
// Traduce las abreviaturas del formulario frontend
// a los enum values reales de Prisma (Acuerdo 048).
// =============================================
const DICCIONARIO_MODALIDAD: Record<string, string> = {
  "PLANTA_TC": "PLANTA_TC",
  "PLANTA_MT": "PLANTA_MT",
  "OCASIONAL_TC": "OCASIONAL_TC",
  "OCASIONAL_MT": "OCASIONAL_MT",
  "CATEDRA": "CATEDRA",
  "VISITANTE_TC": "VISITANTE_TC",
  "VISITANTE_MT": "VISITANTE_MT",
  "CATEDRA_VISITANTE_TC": "CATEDRA_VISITANTE_TC",
  "CATEDRA_VISITANTE_MT": "CATEDRA_VISITANTE_MT",
  "INVITADO": "INVITADO",
  // Legacy frontend abbreviations (backward compat)
  "TCP": "PLANTA_TC",
  "MTP": "PLANTA_MT",
  "TCO": "OCASIONAL_TC",
  "MTO": "OCASIONAL_MT",
}

// Modalidades válidas (must match Prisma enum exactly)
const MODALIDADES_VALIDAS = new Set([
  "PLANTA_TC", "PLANTA_MT", "OCASIONAL_TC", "OCASIONAL_MT",
  "CATEDRA", "VISITANTE_TC", "VISITANTE_MT",
  "CATEDRA_VISITANTE_TC", "CATEDRA_VISITANTE_MT", "INVITADO",
])

// Sedes válidas (must match Prisma enum exactly)
const SEDES_VALIDAS = new Set(["NEIVA", "PITALITO", "GARZON", "LA_PLATA"])

type RegisterState = {
  error?: string
  values?: {
    email: string
    nombre: string
    cedula: string
    facultad: string
    programa: string
    celular: string
    sede: string
    modalidad: string
  }
} | null

export async function registerAction(_prevState: RegisterState, formData: FormData): Promise<RegisterState> {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const nombre = formData.get("nombre") as string
  const cedula = formData.get("cedula") as string
  const facultad = formData.get("facultad") as string
  const programa = formData.get("programa") as string
  const celular = (formData.get("celular") as string) || ""
  
  const sedeRaw = formData.get("sede") as string
  const modalidadRaw = formData.get("modalidad") as string
  const semanasVinculacionRaw = formData.get("semanasVinculacion") as string

  const values = {
    email, nombre, cedula, facultad, programa, celular,
    sede: sedeRaw, modalidad: modalidadRaw
  }

  const MODALIDADES_TEMPORALES_SET = new Set([
    "OCASIONAL_TC", "OCASIONAL_MT", "VISITANTE_TC", "VISITANTE_MT",
    "CATEDRA_VISITANTE_TC", "CATEDRA_VISITANTE_MT", "INVITADO",
  ])

  // ==========================================
  // 1. Presencia — todos los campos requeridos
  // ==========================================
  if (!email || !password || !nombre || !cedula || !facultad || !programa || !modalidadRaw || !sedeRaw) {
    return { error: "Todos los campos obligatorios deben ser completados.", values }
  }

  // ==========================================
  // 2. Formato — validaciones de campo
  // ==========================================
  if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]+$/.test(nombre)) {
    return { error: "El nombre solo puede contener letras y espacios.", values }
  }

  if (!/^\d{6,12}$/.test(cedula)) {
    return { error: "La cédula debe contener solo números (entre 6 y 12 dígitos).", values }
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "El email no tiene un formato válido.", values }
  }

  if (celular && !/^\d{10}$/.test(celular)) {
    return { error: "El celular debe ser un número de 10 dígitos.", values }
  }

  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres.", values }
  }

  // ==========================================
  // 3. Integridad relacional — Facultad ↔ Programa
  // ==========================================
  const programasValidos = FACULTAD_PROGRAMAS[facultad]
  if (!programasValidos) {
    return { error: `La facultad "${facultad}" no es válida.`, values }
  }
  if (!programasValidos.includes(programa)) {
    return { error: `El programa "${programa}" no pertenece a la facultad "${facultad}".`, values }
  }

  // ==========================================
  // 4. Enums — Modalidad y Sede válidas
  // ==========================================
  const modalidadTraducida = DICCIONARIO_MODALIDAD[modalidadRaw.toUpperCase()] || modalidadRaw.toUpperCase()
  if (!MODALIDADES_VALIDAS.has(modalidadTraducida)) {
    return { error: `La modalidad "${modalidadRaw}" no es válida.`, values }
  }

  const sedeFormateada = sedeRaw.toUpperCase()
  if (!SEDES_VALIDAS.has(sedeFormateada)) {
    return { error: `La sede "${sedeRaw}" no es válida.`, values }
  }

  // ==========================================
  // 4b. Condiciones académicas (Acuerdo 048) — se capturan en el registro.
  // Override servidor CÁTEDRA (Lock #3): un catedrático no puede tener cargo.
  // proyectosActivos NO se captura aquí: lo gobierna el módulo de proyectos.
  // ==========================================
  const isCatedraReg = modalidadTraducida === "CATEDRA"
  const doctorado = (formData.get("doctorado") as string) === "true"
  const tituloDoctoradoRaw = ((formData.get("tituloDoctorado") as string) || "").trim()
  const tituloDoctorado = doctorado ? (tituloDoctoradoRaw || null) : null
  const cargoAdministrativo = isCatedraReg
    ? false
    : (formData.get("cargoAdministrativo") as string) === "true"
  const tipoCargoRaw = ((formData.get("tipoCargo") as string) || "").trim()
  const tipoCargo = cargoAdministrativo ? (tipoCargoRaw || null) : null
  if (cargoAdministrativo && !tipoCargo) {
    return { error: "Debe especificar el tipo de cargo administrativo.", values }
  }

  // Ámbito del cargo ("¿de cuál?"). Solo para cargos que lo manejan; el valor
  // debe pertenecer a la lista controlada. No se asume nada del programa/facultad.
  const cargoCfg = tipoCargo ? CARGO_AMBITO[tipoCargo] : null
  const cargoAmbitoValorRaw = ((formData.get("cargoAmbitoValor") as string) || "").trim()
  let cargoAmbitoTipo: string | null = null
  let cargoAmbitoValor: string | null = null
  if (cargoAdministrativo && cargoCfg) {
    if (!cargoAmbitoValorRaw) {
      return { error: "Debe especificar el ámbito del cargo (¿de cuál?).", values }
    }
    const opciones = cargoCfg.lista === "FACULTADES" ? FACULTADES : PROGRAMAS
    if (!opciones.includes(cargoAmbitoValorRaw)) {
      return { error: `El ámbito "${cargoAmbitoValorRaw}" no es válido para el cargo seleccionado.`, values }
    }
    // El ámbito DEBE ser el propio del docente: jefe de programa → su programa;
    // decano/coordinador → su facultad. Evita autoridad sobre un ámbito ajeno.
    const ambitoPropio = (cargoCfg.tipo === "PROGRAMA" ? programa : facultad)?.trim() || ""
    if (cargoAmbitoValorRaw !== ambitoPropio) {
      return {
        error: cargoCfg.tipo === "PROGRAMA"
          ? `Un Jefe de Programa solo puede serlo de su propio programa (${ambitoPropio}).`
          : `Este cargo solo puede ejercerse sobre su propia facultad (${ambitoPropio}).`,
        values,
      }
    }
    cargoAmbitoTipo = cargoCfg.tipo
    cargoAmbitoValor = cargoAmbitoValorRaw
  }

  const esModalidadTemporal = MODALIDADES_TEMPORALES_SET.has(modalidadTraducida)
  const semanasVinculacion = esModalidadTemporal && semanasVinculacionRaw
    ? parseInt(semanasVinculacionRaw, 10)
    : null
  if (semanasVinculacion !== null) {
    const { resolveGlobales } = await import("@/lib/rules/resolver")
    const globales = await resolveGlobales(null)
    if (isNaN(semanasVinculacion) || semanasVinculacion < 1 || semanasVinculacion > globales.semanasPeriodo) {
      return { error: `Las semanas de vinculación deben estar entre 1 y ${globales.semanasPeriodo}.`, values }
    }
  }

  // ==========================================
  // 5. Unicidad + Persistencia
  // ==========================================
  try {
    const existing = await prisma.docente.findFirst({
      where: {
        OR: [{ email }, { cedula }],
      },
    })

    if (existing) {
      if (existing.email === email) {
        return { error: "Ya existe un docente registrado con ese email.", values }
      }
      return { error: "Ya existe un docente registrado con esa cédula.", values }
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    await prisma.docente.create({
      data: {
        email,
        password: hashedPassword,
        nombre,
        cedula,
        facultad,
        programa,
        celular: celular || null,
        sedeBase: sedeFormateada as import("@/generated/prisma/client").Sede,
        modalidad: modalidadTraducida as import("@/generated/prisma/client").Modalidad,
        // Condiciones académicas capturadas en el registro (Acuerdo 048).
        doctorado,
        tituloDoctorado,
        cargoAdministrativo,
        tipoCargo,
        cargoAmbitoTipo: cargoAmbitoTipo as import("@/generated/prisma/client").AmbitoCargo | null,
        cargoAmbitoValor,
        // proyectosActivos lo gobierna el módulo de proyectos (no se setea aquí).
        proyectosActivos: false,
        semanasVinculacion,
      },
    })
  } catch (error: unknown) {
    console.error("Register error:", error)
    const code = (error as { code?: string })?.code
    if (code === "ENETUNREACH" || code === "P1001" || code === "P1008") {
      return { error: "No se pudo conectar a la base de datos. Verifica tu conexión e intenta de nuevo.", values }
    }
    if (code === "P2002") {
      return { error: "Ya existe un docente con ese email o cédula.", values }
    }
    if (code === "P2021") {
      return { error: "Error de configuración de la base de datos. Contacta al administrador.", values }
    }
    return { error: "Error inesperado al registrar. Intenta de nuevo.", values }
  }

  redirect("/auth/login?registered=true")
}

export async function loginAction(_prevState: unknown, formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  // Pre-check: verificar estado de cuenta antes de autenticar
  const docente = await prisma.docente.findUnique({
    where: { email },
    select: { estadoCuenta: true, password: true },
  })

  if (docente) {
    const match = await bcrypt.compare(password, docente.password)
    if (match) {
      if (docente.estadoCuenta === "PENDIENTE") {
        return { error: "Tu solicitud de registro está siendo revisada." }
      }
      if (docente.estadoCuenta === "INACTIVO") {
        return { error: "Tu cuenta ha sido desactivada. Contacta al administrador para más información." }
      }
      if (docente.estadoCuenta === "RECHAZADO") {
        try {
          await signIn("credentials", { email, password, redirectTo: "/cuenta-rechazada" })
        } catch (e) {
          if ((e as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw e
        }
        return
      }
    }
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    })
  } catch (error) {
    if ((error as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }
    return { error: "Credenciales inválidas." }
  }
}

export async function reAplicarAction(_prevState: unknown, formData: FormData) {
  const session = await auth()

  if (!session?.user?.id) return { error: "No autenticado." }
  if (session.user.estadoCuenta !== "RECHAZADO") return { error: "Tu cuenta no está en estado rechazado." }

  const facultad = formData.get("facultad") as string
  const programa = formData.get("programa") as string
  const modalidadRaw = formData.get("modalidad") as string
  const sedeRaw = formData.get("sede") as string
  const celular = (formData.get("celular") as string) || ""
  const semanasVinculacionRaw = formData.get("semanasVinculacion") as string

  if (!facultad || !programa || !modalidadRaw || !sedeRaw) {
    return { error: "Todos los campos son obligatorios." }
  }

  const programasValidos = FACULTAD_PROGRAMAS[facultad]
  if (!programasValidos) return { error: `La facultad "${facultad}" no es válida.` }
  if (!programasValidos.includes(programa)) {
    return { error: `El programa "${programa}" no pertenece a la facultad "${facultad}".` }
  }

  const modalidadTraducida = DICCIONARIO_MODALIDAD[modalidadRaw.toUpperCase()] || modalidadRaw.toUpperCase()
  if (!MODALIDADES_VALIDAS.has(modalidadTraducida)) return { error: `La modalidad "${modalidadRaw}" no es válida.` }

  const sedeFormateada = sedeRaw.toUpperCase()
  if (!SEDES_VALIDAS.has(sedeFormateada)) return { error: `La sede "${sedeRaw}" no es válida.` }

  if (celular && !/^\d{10}$/.test(celular)) {
    return { error: "El celular debe ser un número de 10 dígitos." }
  }

  const esModalidadTemporalR = new Set([
    "OCASIONAL_TC", "OCASIONAL_MT", "VISITANTE_TC", "VISITANTE_MT",
    "CATEDRA_VISITANTE_TC", "CATEDRA_VISITANTE_MT", "INVITADO",
  ]).has(modalidadTraducida)
  const semanasVinculacion = esModalidadTemporalR && semanasVinculacionRaw
    ? parseInt(semanasVinculacionRaw, 10)
    : null
  if (semanasVinculacion !== null) {
    const { resolveGlobales } = await import("@/lib/rules/resolver")
    const globales = await resolveGlobales(null)
    if (isNaN(semanasVinculacion) || semanasVinculacion < 1 || semanasVinculacion > globales.semanasPeriodo) {
      return { error: `Las semanas de vinculación deben estar entre 1 y ${globales.semanasPeriodo}.` }
    }
  }

  await prisma.docente.update({
    where: { id: session.user.id },
    data: {
      facultad,
      programa,
      modalidad: modalidadTraducida as import("@/generated/prisma/client").Modalidad,
      sedeBase: sedeFormateada as import("@/generated/prisma/client").Sede,
      celular: celular || null,
      estadoCuenta: "PENDIENTE",
      semanasVinculacion,
    },
  })

  await signOut({ redirectTo: "/auth/login?reaplicado=true" })
}