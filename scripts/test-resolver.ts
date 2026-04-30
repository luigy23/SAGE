import "dotenv/config"
import { resolveAgendaLimits, resolveModalidad, resolveGlobales, resolveFormulaCurso } from "../src/lib/rules/resolver"

async function main() {
  console.log("🧪 Probando resolver paramétrico (lee desde DB con cache)\n")

  // 1. Globales
  const globales = await resolveGlobales()
  console.log("📌 Globales:", JSON.stringify(globales, null, 2))

  // 2. PLANTA_TC
  const tc = await resolveModalidad("PLANTA_TC", null)
  console.log("\n📌 PLANTA_TC:", JSON.stringify(tc, null, 2))

  // 3. CATEDRA Pitalito (regional)
  const catedraPitalito = await resolveModalidad("CATEDRA", "PITALITO")
  console.log("\n📌 CATEDRA Pitalito:", JSON.stringify(catedraPitalito, null, 2))

  // 4. CATEDRA Neiva
  const catedraNeiva = await resolveModalidad("CATEDRA", "NEIVA")
  console.log("\n📌 CATEDRA Neiva:", JSON.stringify(catedraNeiva, null, 2))

  // 5. Fórmula Salud T-P (excepción)
  const formulaSaludTP = await resolveFormulaCurso("TEORICO_PRACTICO", "Salud")
  console.log("\n📌 Fórmula Salud T-P:", JSON.stringify(formulaSaludTP, null, 2))

  // 6. Fórmula default T (sin facultad específica)
  const formulaT = await resolveFormulaCurso("TEORICO", "Ingeniería")
  console.log("\n📌 Fórmula Ingeniería T (cae a default):", JSON.stringify(formulaT, null, 2))

  // 7. AgendaLimits compuestos para un docente PLANTA_TC con proyectos
  const limits = await resolveAgendaLimits({
    modalidad: "PLANTA_TC",
    sedeBase: "NEIVA",
    doctorado: true,
    cargoAdministrativo: false,
    proyectosActivos: true,
  })
  console.log("\n📌 AgendaLimits PLANTA_TC + proyectos:", JSON.stringify(limits, null, 2))

  // 8. Verificar caching: segunda llamada debe ser instantánea
  console.time("cached")
  await resolveModalidad("PLANTA_TC", null)
  console.timeEnd("cached")
}

main()
  .then(async () => {
    const { prisma } = await import("../src/lib/prisma")
    await prisma.$disconnect()
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
