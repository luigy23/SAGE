import { test, expect, type Page } from "@playwright/test"
import {
  PROF_CALC,
  PERIODO_CALC,
  CURSOS,
  SEMANAS_CLASES,
  TOTAL_CURSOS,
} from "./fixtures/calculos"
import { anunciar } from "./fixtures/anunciar"

/**
 * E2E — Cálculos de horas de la Agenda FO-19 (cursos).
 *
 * Verifica, paso a paso, la fórmula del Acuerdo 048 Art. 3 Par. 4 por curso:
 *
 *     total = (horasPresenciales × factor + 1) × semanas_clases
 *
 * con factor = 2 (teórico) / 1.5 (teórico-práctico) / 1 (práctico), y comprueba
 * que las "Semanas de clase" son FIJAS (= parámetro semanas_clases) y que el
 * docente NO puede editarlas. Finalmente, que el total del semestre es la suma.
 *
 * Corre headed + slowMo (ver playwright.config.ts) para observarlo en vivo.
 */

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

async function login(page: Page) {
  await page.goto("/auth/login")
  await page.locator("#email").fill(PROF_CALC.email)
  await page.locator("#password").fill(PROF_CALC.password)
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
}

/** Agrega un curso del catálogo maestro dentro del paso Docencia. */
async function agregarCurso(page: Page, codigo: string) {
  await page.getByRole("button", { name: "Agregar Curso" }).click()
  // Abre el selector de la última tarjeta sin curso.
  await page
    .getByRole("button", { name: /Buscar curso del catálogo oficial/ })
    .last()
    .click()
  await page.getByPlaceholder("Buscar por código, nombre o facultad...").fill(codigo)
  await page
    .getByRole("option", { name: new RegExp(esc(codigo)) })
    .first()
    .click()
}

test("FO-19 — Cálculo de horas por curso (factor × horas + 1) × semanas_clases", async ({ page }) => {
  test.setTimeout(120_000)

  // ── 1. Login + arrancar el wizard ──────────────────────────────────────────
  await login(page)
  await page.goto("/agenda")
  await expect(
    page.getByText(`Crear Agenda del Periodo ${PERIODO_CALC}`)
  ).toBeVisible({ timeout: 20_000 })
  await page.getByRole("button", { name: "Crear Agenda" }).click()

  // ── 2. Paso 1 · Identificación → Siguiente ─────────────────────────────────
  await expect(page.locator("#step1-nombre")).toHaveValue(PROF_CALC.nombre)
  await page.getByRole("button", { name: "Siguiente" }).click()

  // ── 3. Paso 2 · Docencia — agregar cada curso y verificar su cálculo ────────
  await expect(page.getByText("1.2 Otras Actividades de Docencia")).toBeVisible()

  for (let i = 0; i < CURSOS.length; i++) {
    const c = CURSOS[i]
    await agregarCurso(page, c.codigo)

    await anunciar(
      page,
      `Cálculo del curso ${c.tipo}`,
      `(${c.horasPresenciales}h × factor ${c.tipo === "TEORICO" ? 2 : c.tipo === "TEORICO_PRACTICO" ? 1.5 : 1} + 1) × ${SEMANAS_CLASES} semanas = ${c.total}h`,
    )

    // Horas presenciales tomadas del catálogo (horasSemT + horasSemP).
    await expect(page.getByTestId(`curso-${i}-horas`)).toHaveText(String(c.horasPresenciales))

    // Semanas de clase: FIJAS = parámetro, y NO editables (no hay <input>).
    await expect(page.getByTestId(`curso-${i}-semanas`)).toHaveText(String(SEMANAS_CLASES))
    await expect(page.locator(`input[name="cursos.${i}.semanas"]`)).toHaveCount(0)

    // Total del curso = (horas × factor + 1) × semanas_clases.
    await expect(page.getByTestId(`curso-${i}-total`)).toHaveText(`${c.total}h`)

    console.log(
      `[calc] ${c.codigo} (${c.tipo}) → ${c.horasPresenciales}h pres · ` +
        `${c.horasSemanales}h/sem × ${SEMANAS_CLASES} sem = ${c.total}h`
    )
  }

  // ── 4. El total del semestre debe ser la suma de los cursos ────────────────
  // El encabezado fijo (HorasStickyHeader) suma reactivamente las dedicaciones.
  await anunciar(page, "Total del semestre", `Debe ser la suma de los 3 cursos = ${TOTAL_CURSOS}h`)
  await expect(
    page.getByText(new RegExp(`${TOTAL_CURSOS}\\s*/\\s*\\d+\\s*hrs/semestre`))
  ).toBeVisible({ timeout: 15_000 })
  console.log(`[calc] TOTAL cursos = ${TOTAL_CURSOS}h`)

  await page.screenshot({ path: "test-results/calculos-cursos.png", fullPage: true })

  if (process.env.KEEP_OPEN) {
    console.log("[calc] 👀 Navegador abierto. Cerralo cuando termines.")
    await page.pause()
  }
})
