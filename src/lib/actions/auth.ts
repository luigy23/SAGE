"use server"

import { signIn } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { redirect } from "next/navigation"

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
    doctorado: boolean
    cargoAdministrativo: boolean
    proyectosActivos: boolean
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
  
  // Obtenemos el texto crudo del frontend
  const sedeRaw = formData.get("sede") as string
  const modalidadRaw = formData.get("modalidad") as string

  // Parsear checkboxes
  const doctorado = formData.get("doctorado") === "true"
  const cargoAdministrativo = formData.get("cargoAdministrativo") === "true"
  const proyectosActivos = formData.get("proyectosActivos") === "true"

  const values = { 
    email, nombre, cedula, facultad, programa, celular, 
    sede: sedeRaw, modalidad: modalidadRaw, doctorado, cargoAdministrativo, proyectosActivos 
  }

  if (!email || !password || !nombre || !cedula || !facultad || !programa || !modalidadRaw || !sedeRaw) {
    return { error: "Todos los campos obligatorios deben ser completados.", values }
  }

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

    // EL DICCIONARIO: Traduce lo que envía el formulario a lo que exige el Acuerdo 048
    const diccionarioModalidad: Record<string, string> = {
      "TCP": "PLANTA_TC",
      "MTP": "PLANTA_MT",
      "TCO": "OCASIONAL_TC",
      "MTO": "OCASIONAL_MT",
      "CATEDRA": "CATEDRA",
      "VISITANTE": "VISITANTE",
      "INVITADO": "INVITADO"
    }

    // Transformamos las variables
    const sedeFormateada = sedeRaw.toUpperCase() as import("@/generated/prisma/client").Sede;
    const modalidadTraducida = (diccionarioModalidad[modalidadRaw.toUpperCase()] || modalidadRaw);
    const modalidadFormateada = modalidadTraducida as import("@/generated/prisma/client").Modalidad;

    await prisma.docente.create({
      data: {
        email,
        password: hashedPassword,
        nombre,
        cedula,
        facultad,
        programa,
        celular: celular || null,
        sedeBase: sedeFormateada,
        modalidad: modalidadFormateada,
        doctorado,
        cargoAdministrativo,
        proyectosActivos,
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
  try {
    await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirectTo: "/dashboard",
    })
  } catch (error) {
    if ((error as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }
    return { error: "Credenciales inválidas." }
  }
}