import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

/**
 * Layout de protección para rutas /admin/*
 *
 * Verifica que el usuario tenga rol ADMIN. Sin esto, un docente autenticado
 * podría cargar la UI admin (las server actions ya validan, pero la UI
 * filtraba). En la Fase 2 se aceptará también SUPERADMIN.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) redirect("/auth/login")
  // SUPERADMIN hereda permisos de ADMIN.
  if (session.user.rol !== "ADMIN" && session.user.rol !== "SUPERADMIN") {
    redirect("/dashboard")
  }

  return <>{children}</>
}
