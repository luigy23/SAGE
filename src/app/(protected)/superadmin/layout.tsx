import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

/**
 * Layout de protección para rutas /superadmin/*
 *
 * Solo permite acceso al rol SUPERADMIN. Redirige a /dashboard si el rol no coincide.
 */
export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) redirect("/auth/login")
  if (session.user.rol !== "SUPERADMIN") redirect("/dashboard")

  return <>{children}</>
}
