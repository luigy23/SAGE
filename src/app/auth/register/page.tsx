"use client"

import { useActionState } from "react"
import Link from "next/link"
import { registerAction } from "@/lib/actions/auth"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const modalidades = [
  { value: "TCP", label: "Tiempo Completo Planta" },
  { value: "TCO", label: "Tiempo Completo Ocasional" },
  { value: "MTP", label: "Medio Tiempo Planta" },
  { value: "MTC", label: "Medio Tiempo Catedra" },
  { value: "CATEDRA", label: "Catedra" },
]

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(registerAction, null)

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Crear Cuenta</CardTitle>
        <CardDescription>
          Registra tu cuenta de docente en SAGE
        </CardDescription>
      </CardHeader>
      <CardContent>
        {state?.error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {state.error}
          </div>
        )}
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre completo *</Label>
              <Input id="nombre" name="nombre" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cedula">Cedula *</Label>
              <Input id="cedula" name="cedula" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email institucional *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="correo@usco.edu.co"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contrasena *</Label>
            <Input
              id="password"
              name="password"
              type="password"
              minLength={6}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="facultad">Facultad *</Label>
              <Input id="facultad" name="facultad" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="programa">Programa *</Label>
              <Input id="programa" name="programa" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="celular">Celular</Label>
              <Input id="celular" name="celular" type="tel" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modalidad">Modalidad *</Label>
              <Select name="modalidad" required>
                <SelectTrigger id="modalidad">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {modalidades.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Registrando..." : "Crear Cuenta"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Ya tienes cuenta?{" "}
          <Link href="/auth/login" className="text-primary underline">
            Inicia sesion
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
