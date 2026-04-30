import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const counts = {
    docentes: await prisma.docente.count(),
    agendas: await prisma.agendaSemestral.count(),
    cursosMaestro: await prisma.cursoMaestro.count(),
    periodos: await prisma.periodoAcademico.count(),
    parametrosGlobales: await prisma.parametroGlobal.count(),
    parametrosModalidad: await prisma.parametrosModalidad.count(),
    formulasCurso: await prisma.formulaCurso.count(),
    cargosAdministrativos: await prisma.cargoAdministrativo.count(),
    catalogoActividades: await prisma.catalogoActividad.count(),
    rehabilitaciones: await prisma.rehabilitacionAgenda.count(),
  }
  console.log("📊 Estado de la DB tras Fase 2:")
  console.log(JSON.stringify(counts, null, 2))

  // Sample de parámetros para confirmar valores
  const sample = await prisma.parametroGlobal.findMany({
    where: { clave: { in: ["semanas_periodo", "limite_gestion_porcentaje"] } },
    select: { clave: true, valor: true, articuloOrigen: true },
  })
  console.log("\n🔍 Ejemplos de parámetros globales:")
  console.log(JSON.stringify(sample, null, 2))

  const planta_tc = await prisma.parametrosModalidad.findFirst({
    where: { modalidad: "PLANTA_TC", periodoId: null },
    select: {
      modalidad: true,
      horasSemanalMax: true,
      horasSemestralMax: true,
      minDocencia: true,
      minDocenciaConProyectos: true,
    },
  })
  console.log("\n🔍 Parámetros PLANTA_TC:")
  console.log(JSON.stringify(planta_tc, null, 2))
}

main()
  .catch((e) => {
    console.error(e.message)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
