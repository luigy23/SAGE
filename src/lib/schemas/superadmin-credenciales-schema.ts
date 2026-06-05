import { z } from "zod"

/**
 * Schema para el cambio de credenciales de acceso de un Docente desde la
 * consola del SUPERADMIN (email y/o contraseña).
 *
 * Notas:
 * - El email sigue siendo la credencial de login; tras cambiarlo el usuario
 *   debe iniciar sesión con el nuevo email. Se mantiene `@unique` en la BD.
 * - La cédula es el identificador único de identidad (no cambia aquí).
 * - Ambos campos son opcionales pero al menos uno debe venir: se permite
 *   cambiar solo el email, solo la contraseña, o ambos.
 * - La contraseña nunca se audita en claro (mínimo 6, igual que el registro).
 */
export const cambiarCredencialesSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Correo electrónico inválido.")
      .max(200)
      .optional(),
    password: z
      .string()
      .min(6, "La contraseña debe tener al menos 6 caracteres.")
      .max(100)
      .optional(),
  })
  .refine((d) => Boolean(d.email) || Boolean(d.password), {
    message: "Debes cambiar el correo, la contraseña, o ambos.",
    path: ["email"],
  })

export type CambiarCredencialesInput = z.infer<typeof cambiarCredencialesSchema>
