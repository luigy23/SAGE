import { test, expect, type Page } from "@playwright/test"
import { PERIODO_INV, INVITADO_SIN, INVITADO_CON, HORAS_INVITADO_CON } from "./fixtures/invitado"
import { anunciar } from "./fixtures/anunciar"

/**
 * E2E — Tope del INVITADO (Acuerdo 048 Art. 4f).
 *
 * El Art. 4f dice "hasta el 100% de las labores PARA LA CUAL SE VINCULÓ, previa
 * autorización del Consejo Académico". Por tanto:
 *   - Sin horas autorizadas (invHorasContratadas null) → NO se inventa un tope:
 *     el encabezado muestra "sin tope asignado".
 *   - Con horas autorizadas → el tope es exactamente ese valor.
 */

async function login(page: Page, email: string, password: string) {
  await page.goto("/auth/login")
  await page.locator("#email").fill(email)
  await page.locator("#password").fill(password)
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
}

async function arrancarAgenda(page: Page) {
  await page.goto("/agenda")
  await expect(page.getByText(`Crear Agenda del Periodo ${PERIODO_INV}`)).toBeVisible({ timeout: 20_000 })
  await page.getByRole("button", { name: "Crear Agenda" }).click()
}

test.describe("FO-19 — Tope del invitado (Acuerdo 048 Art. 4f)", () => {
  test("invitado SIN horas asignadas → 'sin tope asignado'", async ({ page }) => {
    test.setTimeout(120_000)
    await login(page, INVITADO_SIN.email, INVITADO_SIN.password)
    await arrancarAgenda(page)

    await anunciar(page, "Invitado sin horas autorizadas", "No debe inventar tope (770/880); el encabezado muestra 'sin tope asignado'")
    await expect(page.getByText(/sin tope asignado/i)).toBeVisible({ timeout: 15_000 })
    // No debe mostrar un denominador numérico de tope.
    await expect(page.getByText(/\/\s*\d+\s*hrs\/semestre/)).toHaveCount(0)

    console.log("[invitado] SIN horas → sin tope asignado ✓")
  })

  test("invitado CON horas asignadas → el tope es ese valor", async ({ page }) => {
    test.setTimeout(120_000)
    await login(page, INVITADO_CON.email, INVITADO_CON.password)
    await arrancarAgenda(page)

    await anunciar(page, "Invitado con horas autorizadas", `El tope debe ser exactamente ${HORAS_INVITADO_CON}h (lo autorizado)`)
    await expect(
      page.getByText(new RegExp(`/\\s*${HORAS_INVITADO_CON}\\s*hrs/semestre`))
    ).toBeVisible({ timeout: 15_000 })

    console.log(`[invitado] CON ${HORAS_INVITADO_CON}h → tope = ${HORAS_INVITADO_CON} ✓`)
  })
})
