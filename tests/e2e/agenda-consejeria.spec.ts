import { test, expect, type Page } from "@playwright/test"
import {
  PERIODO_CONSEJ,
  HORAS_POR_COHORTE,
  CONSEJ_UI,
  CONSEJ_RESERVA,
  CONSEJ_VERIFICA,
  COHORTE_VIGENTE,
  COHORTE_VIGENTE_2,
  COHORTE_FUERA_VENTANA,
  COHORTE_RESERVA,
} from "./fixtures/consejeria"

/**
 * E2E — Consejería Académica (Acuerdo 048 Art. 11).
 *
 * Valida las 4 reglas:
 *   1) 48 horas por cohorte (autocalculado: 48 × nº cohortes).
 *   2) Máximo 2 cohortes simultáneas (la UI esconde "Agregar" al llegar a 2).
 *   3) Ventana de 6 semestres: solo cohortes vigentes son elegibles (las viejas
 *      ni aparecen en el selector).
 *   4) Exclusividad: un solo consejero por cohorte + programa (si otro docente del
 *      programa ya la reservó al enviar, deja de estar disponible).
 */

async function login(page: Page, email: string, password: string) {
  await page.goto("/auth/login")
  await page.locator("#email").fill(email)
  await page.locator("#password").fill(password)
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
}

/** Arranca el wizard y deja al docente en el paso de Docencia. */
async function arrancarDocencia(page: Page) {
  await page.goto("/agenda")
  await expect(page.getByText(`Crear Agenda del Periodo ${PERIODO_CONSEJ}`)).toBeVisible({ timeout: 20_000 })
  await page.getByRole("button", { name: "Crear Agenda" }).click()
  await page.getByRole("button", { name: "Siguiente" }).click()
  await expect(page.getByText("1.2 Otras Actividades de Docencia")).toBeVisible()
}

/** Agrega la actividad "Consejería Académica" desde el catálogo Art. 11. */
async function agregarConsejeria(page: Page) {
  await page.getByRole("button", { name: "Agregar Otra Actividad de Docencia" }).click()
  await page.getByRole("button", { name: /Buscar actividad del catálogo \(Art\. 11\)/ }).last().click()
  await page.getByPlaceholder("Buscar por nombre...").fill("Consejería Académica")
  await page.getByRole("option", { name: /Consejería Académica/ }).first().click()
}

/** Agrega una cohorte (cohorte + nº semestres) a la consejería. */
async function agregarCohorte(page: Page, cohorte: string, semestres = 1) {
  await page.getByTestId("consejeria-cohorte-select").click()
  await page.getByRole("option", { name: cohorte, exact: true }).click()
  await page.getByTestId("consejeria-semestres-select").click()
  await page.getByRole("option", { name: String(semestres), exact: true }).click()
  await page.getByTestId("consejeria-agregar").click()
}

async function irAUltimoPaso(page: Page) {
  for (let i = 0; i < 6; i++) {
    const next = page.getByRole("button", { name: "Siguiente" })
    if ((await next.count()) === 0 || !(await next.isVisible())) break
    await next.click()
  }
  await expect(page.getByRole("button", { name: /Enviar Agenda/ })).toBeVisible({ timeout: 15_000 })
}

const horasInput = (page: Page) =>
  page.locator(`input[name="otrasActividadesDocencia.0.dedicacionPeriodo"]`)

test.describe("FO-19 — Consejería Académica (Acuerdo 048 Art. 11)", () => {
  test("48h por cohorte, máximo 2 cohortes y ventana de 6 semestres", async ({ page }) => {
    test.setTimeout(120_000)

    await login(page, CONSEJ_UI.email, CONSEJ_UI.password)
    await arrancarDocencia(page)
    await agregarConsejeria(page)

    // ── Ventana de 6 semestres: la cohorte vieja NO aparece, la vigente sí ──
    await page.getByTestId("consejeria-cohorte-select").click()
    await expect(page.getByRole("option", { name: COHORTE_VIGENTE, exact: true })).toBeVisible()
    await expect(page.getByRole("option", { name: COHORTE_FUERA_VENTANA, exact: true })).toHaveCount(0)
    await page.keyboard.press("Escape")

    // ── 1 cohorte → tope 48h ────────────────────────────────────────────────
    await agregarCohorte(page, COHORTE_VIGENTE)
    await expect(horasInput(page)).toHaveAttribute("max", String(HORAS_POR_COHORTE)) // 48

    // ── 2 cohortes → tope 96h (48 × 2) ──────────────────────────────────────
    await agregarCohorte(page, COHORTE_VIGENTE_2)
    await expect(horasInput(page)).toHaveAttribute("max", String(HORAS_POR_COHORTE * 2)) // 96

    // ── Máximo 2: la UI ya no permite agregar una tercera ───────────────────
    await expect(page.getByText(/Alcanzaste el máximo de 2 cohortes/)).toBeVisible()
    await expect(page.getByTestId("consejeria-cohorte-select")).toHaveCount(0)

    console.log("[consej] UI OK → 48h/cohorte, 96h con 2, máx 2, ventana 6 sem")
  })

  test("exclusividad: una cohorte reservada deja de estar disponible para otro docente del programa", async ({ page }) => {
    test.setTimeout(120_000)

    // ── Docente A reserva la cohorte al ENVIAR su agenda ────────────────────
    await login(page, CONSEJ_RESERVA.email, CONSEJ_RESERVA.password)
    await arrancarDocencia(page)
    await agregarConsejeria(page)
    await agregarCohorte(page, COHORTE_RESERVA, 2)
    // El docente escribe las horas (≤ tope 48 por cohorte).
    await expect(horasInput(page)).toHaveAttribute("max", String(HORAS_POR_COHORTE))
    await horasInput(page).fill(String(HORAS_POR_COHORTE)) // 48

    await irAUltimoPaso(page)
    const enviar = page.getByRole("button", { name: /Enviar Agenda/ })
    await expect(enviar).toBeEnabled()
    await enviar.click()
    await expect(page.getByText("¿Enviar agenda definitivamente?")).toBeVisible()
    await page.getByRole("button", { name: "Confirmar Envío" }).click()
    const toast = page.locator("[data-sonner-toast]").first()
    await expect(toast).toBeVisible({ timeout: 15_000 })
    await expect(toast).toContainText(/enviada exitosamente/i)
    console.log(`[consej] A reservó cohorte ${COHORTE_RESERVA}`)

    // ── Docente B (mismo programa) ya NO ve esa cohorte disponible ──────────
    await page.context().clearCookies()
    await login(page, CONSEJ_VERIFICA.email, CONSEJ_VERIFICA.password)
    await arrancarDocencia(page)
    await agregarConsejeria(page)
    await page.getByTestId("consejeria-cohorte-select").click()
    // La cohorte reservada por A no está; otra vigente sí sigue disponible.
    await expect(page.getByRole("option", { name: COHORTE_RESERVA, exact: true })).toHaveCount(0)
    await expect(page.getByRole("option", { name: COHORTE_VIGENTE, exact: true })).toBeVisible()
    await page.keyboard.press("Escape")

    console.log(`[consej] exclusividad OK → B no puede tomar ${COHORTE_RESERVA}`)
  })
})
