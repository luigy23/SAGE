/**
 * Fixture para el E2E de "cambio de credenciales por SUPERADMIN".
 *
 * Crea dos usuarios DEDICADOS al test (no toca el superadmin real ni a MARLIO):
 *   - SUPER:  un SUPERADMIN con contraseña conocida → ejecuta el cambio.
 *   - TARGET: un DOCENTE objetivo cuyo email/contraseña serán modificados.
 *
 * Instancia Prisma igual que prisma/seed.ts (driver adapter pg), porque
 * `@/lib/prisma` es `server-only` y no se puede importar fuera de Next.
 */
import "dotenv/config"
import { PrismaClient } from "../../../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import bcrypt from "bcryptjs"

function makePrisma() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

/** SUPERADMIN que ejecuta el cambio. */
export const SUPER = {
  email: "e2e.superadmin@usco.edu.co",
  password: "E2eSuper123!",
  nombre: "E2E SuperAdmin",
  cedula: "990099001",
}

/** DOCENTE objetivo: su correo y contraseña se cambiarán durante el test. */
export const TARGET = {
  email: "e2e.credenciales@usco.edu.co",
  password: "ClaveVieja123!",
  nombre: "E2E Credenciales Target",
  cedula: "990099009",
  sedeBase: "NEIVA" as const,
  modalidad: "PLANTA_TC" as const,
  facultad: "Facultad de Ingeniería",
  programa: "Ingeniería Agrícola",
}

/** Nuevas credenciales que el SUPERADMIN asignará al objetivo. */
export const NUEVO = {
  email: "e2e.credenciales.nuevo@usco.edu.co",
  password: "ClaveNueva456!",
}

/** Identifica las filas del test para poder limpiarlas de forma idempotente. */
const where = {
  OR: [
    { cedula: { in: [SUPER.cedula, TARGET.cedula] } },
    { email: { in: [SUPER.email, TARGET.email, NUEVO.email] } },
  ],
}

/**
 * Deja la base lista: borra cualquier rastro de corridas previas y crea de cero
 * al SUPERADMIN y al DOCENTE objetivo, ambos ACTIVOS y con contraseña conocida.
 * Devuelve el id del objetivo para navegar directo a su detalle.
 */
export async function prepararCredenciales() {
  const prisma = makePrisma()
  try {
    await prisma.docente.deleteMany({ where })

    await prisma.docente.create({
      data: {
        email: SUPER.email,
        password: await bcrypt.hash(SUPER.password, 10),
        nombre: SUPER.nombre,
        cedula: SUPER.cedula,
        rol: "SUPERADMIN",
        estadoCuenta: "ACTIVO",
        sedeBase: "NEIVA",
        modalidad: "PLANTA_TC",
        facultad: TARGET.facultad,
        programa: TARGET.programa,
      },
    })

    const target = await prisma.docente.create({
      data: {
        email: TARGET.email,
        password: await bcrypt.hash(TARGET.password, 10),
        nombre: TARGET.nombre,
        cedula: TARGET.cedula,
        rol: "DOCENTE",
        estadoCuenta: "ACTIVO",
        sedeBase: TARGET.sedeBase,
        modalidad: TARGET.modalidad,
        facultad: TARGET.facultad,
        programa: TARGET.programa,
      },
    })

    return { targetId: target.id }
  } finally {
    await prisma.$disconnect()
  }
}

/** Borra los usuarios creados por el test. */
export async function limpiarCredenciales() {
  const prisma = makePrisma()
  try {
    await prisma.docente.deleteMany({ where })
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  prepararCredenciales()
    .then((r) => {
      console.log("Escenario credenciales listo:", r)
      process.exit(0)
    })
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
}
