"use client"

import { useActionState } from "react"
import type { Docente } from "@/generated/prisma/client"
import { updateProfileAction } from "@/lib/actions/profile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import Link from "next/link"

export function ProfileEditForm({ docente }: { docente: Docente }) {
  const [state, formAction, pending] = useActionState(updateProfileAction, null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Editar Perfil</CardTitle>
      </CardHeader>
      <CardContent>
        {state?.error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {state.error}
          </div>
        )}
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre completo *</Label>
              <Input
                id="nombre"
                name="nombre"
                defaultValue={docente.nombre}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cedula">Cedula</Label>
              <Input id="cedula" value={docente.cedula} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={docente.email} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="celular">Celular</Label>
              <Input
                id="celular"
                name="celular"
                type="tel"
                defaultValue={docente.celular || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="facultad">Facultad *</Label>
              <Input
                id="facultad"
                name="facultad"
                defaultValue={docente.facultad}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="programa">Programa *</Label>
              <Input
                id="programa"
                name="programa"
                defaultValue={docente.programa}
                required
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando..." : "Guardar Cambios"}
            </Button>
            <Button asChild variant="outline">
              <Link href="/perfil">Cancelar</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
