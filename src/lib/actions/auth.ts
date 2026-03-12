"use server"

import { signIn } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { redirect } from "next/navigation"
import { Modalidad } from "@/generated/prisma/enums"

export async function registerAction(_prevState: unknown, formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const nombre = formData.get("nombre") as string
  const cedula = formData.get("cedula") as string
  const facultad = formData.get("facultad") as string
  const programa = formData.get("programa") as string
  const celular = (formData.get("celular") as string) || undefined
  const sede = formData.get("sede") as string
  const modalidad = formData.get("modalidad") as Modalidad

  // Booleanos desde checkboxes (envían "on" si están marcados, null si no)
  const doctorado = formData.get("doctorado") === "on"
  const cargoAdministrativo = formData.get("cargoAdministrativo") === "on"
  const proyectosActivos = formData.get("proyectosActivos") === "on"

  if (!email || !password || !nombre || !cedula || !facultad || !programa || !modalidad || !sede) {
    return { error: "Todos los campos obligatorios deben ser completados." }
  }

  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." }
  }

  const existing = await prisma.docente.findFirst({
    where: {
      OR: [{ email }, { cedula }],
    },
  })

  if (existing) {
    return { error: "Ya existe un docente con ese email o cédula." }
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  await prisma.docente.create({
    data: {
      email,
      password: hashedPassword,
      nombre,
      cedula,
      facultad,
      programa,
      celular: celular || null,
      sede,
      modalidad,
      doctorado,
      cargoAdministrativo,
      proyectosActivos,
    },
  })

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
