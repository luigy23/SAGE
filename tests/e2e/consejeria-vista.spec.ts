import { test, expect, type Page } from "@playwright/test"
import {
  DECANO_VISTA,
  JEFE_VISTA,
  PROF_A,
  PROF_B,
} from "./fixtures/consejeria-vista"
import { anunciar } from "./fixtures/anunciar"

/**
 * E2E — Vista de consejeros por ámbito (/gestion/consejeria).
 *
 * El Jefe de Programa ve SOLO los consejeros de su programa; el Decano ve los
 * de TODA su facultad (varios programas). Escenario: facultad con 2 programas,
 * un consejero en cada uno (QA CONSEJERO A en programa A, B en programa B).
 */

async function login(page: Page, email: string, password: string) {
  await page.goto("/auth/login")
  await page.locator("#email").fill(email)
  await page.locator("#password").fill(password)
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
}

test.describe("Gestión — Consejeros por ámbito (Acuerdo 048 Art. 11)", () => {
  test("Jefe de Programa ve SOLO los consejeros de su programa", async ({ page }) => {
    test.setTimeout(120_000)
    await login(page, JEFE_VISTA.email, JEFE_VISTA.password)
    await page.goto("/gestion/consejeria")

    await expect(page.getByText(/Consejeros académicos/)).toBeVisible({ timeout: 20_000 })

    await anunciar(page, "Scope del Jefe de Programa", `Debe ver a ${PROF_A.nombre} (su programa) pero NO a ${PROF_B.nombre} (otro programa)`)
    await expect(page.getByText(PROF_A.nombre)).toBeVisible()
    await expect(page.getByText(PROF_B.nombre)).toHaveCount(0)

    console.log(`[vista] Jefe ve ${PROF_A.nombre}, no ve ${PROF_B.nombre}`)
  })

  test("Decano ve los consejeros de TODA su facultad", async ({ page }) => {
    test.setTimeout(120_000)
    await login(page, DECANO_VISTA.email, DECANO_VISTA.password)
    await page.goto("/gestion/consejeria")

    await expect(page.getByText(/Consejeros académicos/)).toBeVisible({ timeout: 20_000 })

    await anunciar(page, "Scope del Decano", `Debe ver a ${PROF_A.nombre} y a ${PROF_B.nombre} (ambos programas de su facultad)`)
    await expect(page.getByText(PROF_A.nombre)).toBeVisible()
    await expect(page.getByText(PROF_B.nombre)).toBeVisible()

    console.log(`[vista] Decano ve ${PROF_A.nombre} y ${PROF_B.nombre}`)
  })
})
