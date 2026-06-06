"use client"

import { Suspense, useActionState, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { loginAction } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card"

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
      <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
      <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
      <path d="m2 2 20 20" />
    </svg>
  )
}

function RegisteredBanner() {
  const searchParams = useSearchParams()
  const registered = searchParams.get("registered")
  const reaplicado = searchParams.get("reaplicado")

  if (reaplicado) {
    return (
      <div className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-700 border border-blue-200">
        Tu solicitud fue reenviada. Te notificaremos cuando sea revisada por un administrador.
      </div>
    )
  }

  if (!registered) return null

  return (
    <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 border border-green-200">
      Cuenta creada exitosamente. Tu solicitud está siendo revisada.
    </div>
  )
}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, null)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <Card className="w-full max-w-md border-0 shadow-xl bg-white">
      <CardHeader className="text-center pb-2 pt-8">
        <div className="lg:hidden flex flex-col items-center mb-6">
          <div className="flex shrink-0 items-center justify-center mb-2">
            <Image
              src="/Img/universidad-surcolombiana-login.png"
              alt="Universidad Surcolombiana"
              width={180}
              height={102}
              priority
              unoptimized
              className="object-contain"
            />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Iniciar sesión</h1>
        <p className="text-sm text-gray-500 mt-1">
          Ingresa tus credenciales para acceder al sistema
        </p>
      </CardHeader>
      <CardContent className="px-8 pt-4">
        <Suspense>
          <RegisteredBanner />
        </Suspense>
        {state?.error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
            {state.error}
          </div>
        )}
        <form action={formAction} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="correo@usco.edu.co"
              required
              className="h-11 border-gray-300 rounded-lg transition-colors duration-200 focus:border-[#8F141B] focus:ring-[#8F141B]/20"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-gray-700">
              Contraseña
            </Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                required
                className="h-11 border-gray-300 rounded-lg transition-colors duration-200 focus:border-[#8F141B] focus:ring-[#8F141B]/20 pr-11"
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
          <Button
            type="submit"
            className="w-full h-11 bg-[#8F141B] hover:bg-[#7a1017] text-white font-semibold rounded-lg shadow-md shadow-[#8F141B]/25 transition-all duration-200 hover:shadow-lg hover:shadow-[#8F141B]/30"
            disabled={pending}
          >
            {pending ? "Ingresando..." : "Ingresar"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center pb-8 pt-4">
        <p className="text-sm text-gray-500">
          ¿No tienes cuenta?{" "}
          <Link
            href="/auth/register"
            className="text-[#8F141B] font-medium hover:underline transition-colors duration-200"
          >
            Regístrate
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
