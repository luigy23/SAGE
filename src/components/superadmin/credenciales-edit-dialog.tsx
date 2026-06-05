"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { KeyRound, Loader2, Save, ShieldAlert, Eye, EyeOff } from "lucide-react"
import {
  cambiarCredencialesSchema,
  type CambiarCredencialesInput,
} from "@/lib/schemas/superadmin-credenciales-schema"
import { cambiarCredencialesSuperadminAction } from "@/lib/actions/superadmin-credenciales"

export function CredencialesEditDialog({
  usuarioId,
  emailActual,
}: {
  usuarioId: string
  emailActual: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isPending, startTransition] = useTransition()

  const form = useForm<CambiarCredencialesInput>({
    resolver: zodResolver(cambiarCredencialesSchema),
    defaultValues: { email: emailActual, password: "" },
  })

  function onSubmit(data: CambiarCredencialesInput) {
    // No reenviar el email si no cambió; no reenviar password vacío.
    const payload: CambiarCredencialesInput = {}
    if (data.email && data.email !== emailActual) payload.email = data.email
    if (data.password) payload.password = data.password

    if (!payload.email && !payload.password) {
      toast.error("No hay cambios: modifica el correo o escribe una nueva contraseña.")
      return
    }

    startTransition(async () => {
      const res = await cambiarCredencialesSuperadminAction(usuarioId, payload)
      if ("error" in res) {
        toast.error(res.error)
      } else {
        toast.success("Credenciales actualizadas.")
        setOpen(false)
        form.reset({ email: payload.email ?? emailActual, password: "" })
        router.refresh()
      }
    })
  }

  const errors = form.formState.errors

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) {
          form.reset({ email: emailActual, password: "" })
          setShowPassword(false)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <KeyRound className="h-3.5 w-3.5" />
          Cambiar credenciales
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Cambiar credenciales de acceso</DialogTitle>
            <DialogDescription>
              Actualiza el correo y/o la contraseña. La acción es inmediata y
              queda en la auditoría.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="text-xs text-amber-800 dark:text-amber-300">
              El correo es la credencial de inicio de sesión: tras cambiarlo, el
              usuario deberá ingresar con el nuevo correo. La cédula es el
              identificador único de identidad y no cambia aquí.
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cred-email" className="text-xs">
              Correo electrónico (login)
            </Label>
            <Input
              id="cred-email"
              type="email"
              autoComplete="off"
              {...form.register("email")}
            />
            {errors.email && (
              <p className="text-[10px] text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cred-password" className="text-xs">
              Nueva contraseña
            </Label>
            <div className="relative">
              <Input
                id="cred-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Dejar vacío para no cambiarla"
                className="pr-9"
                {...form.register("password", {
                  setValueAs: (v) => (v === "" ? undefined : v),
                })}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-[10px] text-destructive">{errors.password.message}</p>
            )}
            <p className="text-[10px] text-muted-foreground">
              Mínimo 6 caracteres. Déjalo vacío para conservar la actual.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="gap-2">
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isPending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
