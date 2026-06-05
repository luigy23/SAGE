/**
 * Acceso directo a la base de datos para preparar/limpiar el escenario del test.
 *
 * Instancia el cliente Prisma EXACTAMENTE como prisma/seed.ts (driver adapter pg),
 * porque `@/lib/prisma` es `server-only` y no se puede importar fuera de Next.
 */
import "dotenv/config"
import { PrismaClient } from "../../../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import bcrypt from "bcryptjs"
import { MARLIO, PERIODO } from "./marlio"

function makePrisma() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

const DAY = 24 * 60 * 60 * 1000

/**
 * Deja la base lista para el test:
 *  1. Garantiza que exista un PeriodoAcademico "2025-2" ABIERTO con la ventana
 *     de agenda abierta hoy y la `fechaInicio` más reciente de todos los
 *     períodos abiertos → así es el período "activo" que verá el docente.
 *  2. Crea/actualiza al docente MARLIO con contraseña conocida y cuenta ACTIVA.
 *  3. Borra cualquier agenda previa de MARLIO en 2025-2 (cascada a sus hijos),
 *     para que la vista de "Nueva Agenda" se renderice en cada corrida.
 */
export async function prepararEscenario() {
  const prisma = makePrisma()
  try {
    // 1) Período activo "2025-2" con ventana abierta -------------------------
    const abiertos = await prisma.periodoAcademico.findMany({
      where: { estado: "ABIERTO", nombre: { not: PERIODO } },
      select: { fechaInicio: true },
      orderBy: { fechaInicio: "desc" },
      take: 1,
    })
    const base = abiertos[0]?.fechaInicio?.getTime() ?? Date.now()
    const fechaInicio = new Date(base + DAY) // estrictamente la más reciente
    const fechaFin = new Date(fechaInicio.getTime() + 22 * 7 * DAY) // ~22 semanas
    const ventanaDesde = new Date("2020-01-01T00:00:00Z")
    const ventanaHasta = new Date("2031-01-01T00:00:00Z")

    await prisma.periodoAcademico.upsert({
      where: { nombre: PERIODO },
      update: {
        estado: "ABIERTO",
        fechaInicio,
        fechaFin,
        agendaDesde: ventanaDesde,
        agendaHasta: ventanaHasta,
      },
      create: {
        nombre: PERIODO,
        estado: "ABIERTO",
        fechaInicio,
        fechaFin,
        agendaDesde: ventanaDesde,
        agendaHasta: ventanaHasta,
      },
    })

    // 2) Docente MARLIO ------------------------------------------------------
    const passwordHash = await bcrypt.hash(MARLIO.password, 10)
    const docente = await prisma.docente.upsert({
      where: { email: MARLIO.email },
      update: {
        password: passwordHash,
        nombre: MARLIO.nombre,
        cedula: MARLIO.cedula,
        rol: "DOCENTE",
        estadoCuenta: "ACTIVO",
        sedeBase: MARLIO.sedeBase,
        modalidad: MARLIO.modalidad,
        facultad: MARLIO.facultad,
        programa: MARLIO.programa,
        doctorado: false,
        cargoAdministrativo: true,
        tipoCargo: MARLIO.tipoCargo,
        proyectosActivos: false,
      },
      create: {
        email: MARLIO.email,
        password: passwordHash,
        nombre: MARLIO.nombre,
        cedula: MARLIO.cedula,
        rol: "DOCENTE",
        estadoCuenta: "ACTIVO",
        sedeBase: MARLIO.sedeBase,
        modalidad: MARLIO.modalidad,
        facultad: MARLIO.facultad,
        programa: MARLIO.programa,
        doctorado: false,
        cargoAdministrativo: true,
        tipoCargo: MARLIO.tipoCargo,
        proyectosActivos: false,
      },
    })

    // 3) Limpiar agenda previa (cascade borra cursos/actividades) ------------
    await prisma.agendaSemestral.deleteMany({
      where: { docenteId: docente.id, periodo: PERIODO },
    })

    return { docenteId: docente.id }
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  prepararEscenario()
    .then((r) => {
      console.log("Escenario listo:", r)
      process.exit(0)
    })
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
}
