import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

// =====================================================================
// EXTENSIÓN DE TIPOS DE TYPESCRIPT PARA NEXT-AUTH
// Necesario para evitar errores al inyectar variables personalizadas.
// =====================================================================
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      rol: string
      sedeBase: string
      modalidad: string
      facultad: string
      programa: string
      doctorado: boolean
      cargoAdministrativo: boolean
      proyectosActivos: boolean
    }
  }

  interface User {
    id: string
    name?: string | null
    email?: string | null
    rol: string
    sedeBase: string
    modalidad: string
    facultad: string
    programa: string
    doctorado: boolean
    cargoAdministrativo: boolean
    proyectosActivos: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    rol: string
    sedeBase: string
    modalidad: string
    facultad: string
    programa: string
    doctorado: boolean
    cargoAdministrativo: boolean
    proyectosActivos: boolean
  }
}

// =====================================================================
// CONFIGURACIÓN CENTRAL DE AUTENTICACIÓN
// =====================================================================
export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const docente = await prisma.docente.findUnique({
          where: { email: credentials.email as string },
        })

        if (!docente) return null

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          docente.password
        )

        if (!passwordMatch) return null

        // Se extraen todos los datos críticos institucionales de la base de datos
        // y se inyectan al objeto inicial del usuario.
        return {
          id: docente.id,
          email: docente.email,
          name: docente.nombre,
          rol: docente.rol,
          sedeBase: docente.sedeBase,
          modalidad: docente.modalidad,
          facultad: docente.facultad,
          programa: docente.programa,
          doctorado: docente.doctorado,
          cargoAdministrativo: docente.cargoAdministrativo,
          proyectosActivos: docente.proyectosActivos,
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    // 1. El JWT recibe los datos del authorize cuando el usuario se loguea
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.rol = user.rol
        token.sedeBase = user.sedeBase
        token.modalidad = user.modalidad
        token.facultad = user.facultad
        token.programa = user.programa
        token.doctorado = user.doctorado
        token.cargoAdministrativo = user.cargoAdministrativo
        token.proyectosActivos = user.proyectosActivos
      }
      return token
    },
    // 2. La sesión expone los datos del JWT para que React (frontend) pueda leerlos
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
        session.user.rol = token.rol
        session.user.sedeBase = token.sedeBase
        session.user.modalidad = token.modalidad
        session.user.facultad = token.facultad
        session.user.programa = token.programa
        session.user.doctorado = token.doctorado
        session.user.cargoAdministrativo = token.cargoAdministrativo
        session.user.proyectosActivos = token.proyectosActivos
      }
      return session
    },
  },
})