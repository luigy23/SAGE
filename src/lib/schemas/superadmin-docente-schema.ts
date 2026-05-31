import { z } from "zod"
import { MODALIDADES_ENUM } from "@/lib/schemas/profile-schema"
import { SEDES_ENUM } from "@/lib/schemas/solicitud-perfil-schema"

/**
 * Schema para la edición directa de un Docente desde la consola del SUPERADMIN.
 *
 * Notas:
 * - `email` NO está en el schema — es inmutable, se trata como PK lógica.
 * - `password` NO está — fuera del alcance por seguridad.
 * - `rol` y `estadoCuenta` NO están — siguen sus controles dedicados.
 * - Las reglas estatutarias (CATEDRA, cargo) se aplican en el server para
 *   defensa en profundidad. La UI también las refleja.
 */
export const editarDocenteSuperadminSchema = z.object({
  nombre: z.string().trim().min(2, "Mínimo 2 caracteres.").max(200),
  cedula: z.string().trim().min(4, "Mínimo 4 caracteres.").max(30),
  celular: z.string().trim().max(30).nullable().optional(),

  modalidad: z.enum(MODALIDADES_ENUM),
  programa: z.string().trim().min(1, "Obligatorio.").max(200),
  facultad: z.string().trim().min(1, "Obligatorio.").max(200),
  sedeBase: z.enum(SEDES_ENUM),

  doctorado: z.boolean(),
  tituloDoctorado: z.string().trim().max(200).nullable().optional(),
  cargoAdministrativo: z.boolean(),
  tipoCargo: z.string().trim().max(80).nullable().optional(),
  proyectosActivos: z.boolean(),
  semanasVinculacion: z.number().int().min(1).max(22).nullable().optional(),

  perfilVerificado: z.boolean().optional(),
})

export type EditarDocenteSuperadminInput = z.infer<
  typeof editarDocenteSuperadminSchema
>
