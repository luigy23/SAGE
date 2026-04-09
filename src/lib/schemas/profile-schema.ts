import { z } from "zod"

/**
 * MODALIDADES válidas del Acuerdo 048
 * Prisma enum: PLANTA_TC | PLANTA_MT | OCASIONAL_TC | OCASIONAL_MT | CATEDRA | VISITANTE | INVITADO
 */
export const MODALIDADES_ENUM = [
  "PLANTA_TC",
  "PLANTA_MT",
  "OCASIONAL_TC",
  "OCASIONAL_MT",
  "CATEDRA",
  "VISITANTE",
  "INVITADO",
] as const

/**
 * Tipos de cargo administrativo válidos (Art. 10, Acuerdo 048)
 */
export const TIPOS_CARGO = [
  { value: "JEFE_PROGRAMA", label: "Jefe de Programa" },
  { value: "JEFE_DEPARTAMENTO", label: "Jefe de Departamento" },
  { value: "DECANO", label: "Decano" },
  { value: "COORD_INVESTIGACION", label: "Coordinador de Centro de Investigación" },
  { value: "COORD_EMPRENDIMIENTO", label: "Coordinador de Emprendimiento e Innovación" },
  { value: "COORD_AUTOEVALUACION", label: "Coordinador de Autoevaluación y Calidad" },
  { value: "COORD_AREA", label: "Coordinador de Área" },
  { value: "OTRO_COMITE", label: "Otro (Miembro de Comité / Consejo)" },
] as const

/**
 * profileSchema — Zod schema for the Edit Profile form.
 *
 * Lock #2 (Zod Validation Lock):
 * - If modalidad === "CATEDRA", cargoAdministrativo and proyectosActivos MUST be false.
 * - If cargoAdministrativo === true, tipoCargo MUST be specified.
 * - If all booleans are false, the form validates successfully (no errors).
 */
export const profileSchema = z
  .object({
    modalidad: z.enum(MODALIDADES_ENUM, {
      message: "Debe seleccionar una modalidad.",
    }),
    doctorado: z.boolean(),
    cargoAdministrativo: z.boolean(),
    tipoCargo: z.string().nullable().optional(),
    proyectosActivos: z.boolean(),
  })
  .superRefine((data, ctx) => {
    // Rule 1: CATEDRA cannot have cargo or proyectos
    if (data.modalidad === "CATEDRA") {
      if (data.cargoAdministrativo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Art. 10: Un docente catedrático no puede tener cargo administrativo.",
          path: ["cargoAdministrativo"],
        })
      }
      if (data.proyectosActivos) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Art. 3 Par. 1: Un docente catedrático no puede tener proyectos activos asignados.",
          path: ["proyectosActivos"],
        })
      }
    }

    // Rule 2: If cargo is enabled, must specify type
    if (data.cargoAdministrativo && !data.tipoCargo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debe especificar el tipo de cargo administrativo.",
        path: ["tipoCargo"],
      })
    }
  })

export type ProfileFormData = z.infer<typeof profileSchema>
