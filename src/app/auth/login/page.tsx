"use client"

import { Suspense, useActionState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { loginAction } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function RegisteredBanner() {
  const searchParams = useSearchParams()
  const registered = searchParams.get("registered")

  if (!registered) return null

  return (
    <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
      Cuenta creada exitosamente. Inicia sesion.
    </div>
  )
}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, null)

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">SAGE</CardTitle>
        <CardDescription>
          Inicia sesion con tu cuenta de docente
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense>
          <RegisteredBanner />
        </Suspense>
        {state?.error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {state.error}
          </div>
        )}
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="correo@usco.edu.co"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contrasena</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Ingresando..." : "Iniciar Sesion"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          No tienes cuenta?{" "}
          <Link href="/auth/register" className="text-primary underline">
            Registrate
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
