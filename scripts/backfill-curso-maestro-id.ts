/**
 * Backfill: vincula CursoAgenda huérfanos al catálogo CursoMaestro.
 *
 * Contexto: hasta el fix del Paso B, el wizard de agenda nunca persistía
 * `cursoMaestroId`, dejando todos los CursoAgenda con FK nulo aunque el
 * docente sí hubiera seleccionado del catálogo. Este script repara los
 * registros existentes matcheando por `numeroCurso = CursoMaestro.codigo`.
 *
 * Idempotente: corre N veces sin daño. Solo toca filas con cursoMaestroId
 * IS NULL. Loguea huérfanos no resolubles (códigos sin match en catálogo)
 * para revisión manual.
 *
 * Ejecutar con: `npx tsx scripts/backfill-curso-maestro-id.ts`
 *               `npx tsx scripts/backfill-curso-maestro-id.ts --dry-run`
 */

import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const DRY_RUN = process.argv.includes("--dry-run")

type ResultRow = {
  cursoAgendaId: string
  numeroCurso: string
  nombreCurso: string
  resolvedCursoMaestroId: string | null
  reason: "matched" | "no_match" | "ambiguous"
}

async function main() {
  console.log(
    `\n${DRY_RUN ? "🔍 DRY RUN" : "🛠  EJECUCIÓN REAL"} — Backfill CursoAgenda.cursoMaestroId\n`
  )

  const huerfanos = await prisma.cursoAgenda.findMany({
    where: { cursoMaestroId: null },
    select: { id: true, numeroCurso: true, nombreCurso: true },
  })

  console.log(`Encontrados ${huerfanos.length} CursoAgenda con cursoMaestroId IS NULL.\n`)

  if (huerfanos.length === 0) {
    console.log("✅ Nada que hacer — todos los CursoAgenda están enlazados.")
    return
  }

  // Pre-cargo el catálogo en un Map para evitar N queries.
  const cursosMaestros = await prisma.cursoMaestro.findMany({
    select: { id: true, codigo: true },
  })
  const catalogoByCodigo = new Map<string, string[]>() // codigo → [ids] (lower-cased)
  for (const cm of cursosMaestros) {
    const key = cm.codigo.trim().toLowerCase()
    const existing = catalogoByCodigo.get(key) ?? []
    existing.push(cm.id)
    catalogoByCodigo.set(key, existing)
  }

  const results: ResultRow[] = []
  let matched = 0
  let noMatch = 0
  let ambiguous = 0

  for (const h of huerfanos) {
    const key = h.numeroCurso.trim().toLowerCase()
    const candidates = catalogoByCodigo.get(key) ?? []

    if (candidates.length === 1) {
      results.push({
        cursoAgendaId: h.id,
        numeroCurso: h.numeroCurso,
        nombreCurso: h.nombreCurso,
        resolvedCursoMaestroId: candidates[0],
        reason: "matched",
      })
      matched++
    } else if (candidates.length === 0) {
      results.push({
        cursoAgendaId: h.id,
        numeroCurso: h.numeroCurso,
        nombreCurso: h.nombreCurso,
        resolvedCursoMaestroId: null,
        reason: "no_match",
      })
      noMatch++
    } else {
      // El schema impone codigo UNIQUE; ambigüedad teóricamente imposible.
      // Si aparece, refleja datos corruptos — no tocar.
      results.push({
        cursoAgendaId: h.id,
        numeroCurso: h.numeroCurso,
        nombreCurso: h.nombreCurso,
        resolvedCursoMaestroId: null,
        reason: "ambiguous",
      })
      ambiguous++
    }
  }

  console.log("📊 Resumen de resolución:")
  console.log(`  ✓ Matcheados (vincular): ${matched}`)
  console.log(`  ✗ Sin match (preservar null): ${noMatch}`)
  console.log(`  ⚠ Ambiguos (no tocar): ${ambiguous}\n`)

  if (noMatch > 0) {
    console.log("Huérfanos no resolubles (códigos sin contraparte en CursoMaestro):")
    for (const r of results.filter((x) => x.reason === "no_match")) {
      console.log(
        `  • CursoAgenda ${r.cursoAgendaId} — código "${r.numeroCurso}" — "${r.nombreCurso}"`
      )
    }
    console.log("")
  }

  if (ambiguous > 0) {
    console.log("Casos ambiguos (NO se modificarán — revisar manualmente):")
    for (const r of results.filter((x) => x.reason === "ambiguous")) {
      console.log(
        `  • CursoAgenda ${r.cursoAgendaId} — código "${r.numeroCurso}" — múltiples matches`
      )
    }
    console.log("")
  }

  if (DRY_RUN) {
    console.log("🔍 DRY RUN — no se aplicaron cambios. Re-corre sin --dry-run para persistir.")
    return
  }

  if (matched === 0) {
    console.log("Sin filas que actualizar.")
    return
  }

  // Aplico los matches en una transacción.
  const updates = results.filter((r) => r.reason === "matched")
  await prisma.$transaction(async (tx) => {
    for (const u of updates) {
      await tx.cursoAgenda.update({
        where: { id: u.cursoAgendaId },
        data: { cursoMaestroId: u.resolvedCursoMaestroId },
      })
    }
  })

  console.log(`✅ Backfill aplicado: ${matched} CursoAgenda actualizados.`)
}

main()
  .catch((err) => {
    console.error("❌ Error fatal:", err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
