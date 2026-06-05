import { test, expect, type Page } from "@playwright/test"
import { PROF_PROY } from "./fixtures/proyecto-inyectado"
import { anunciar } from "./fixtures/anunciar"

/**
 * E2E — Horas PROPUESTAS al crear el proyecto (Art. 11).
 *
 * El creador puede proponer sus horas al crear el proyecto; quedan guardadas
 * (≤ tope del rol) y luego el revisor las confirma. Aquí verificamos que la
 * propuesta se captura y persiste (se ve en el detalle del proyecto).
 */

const TITULO = "Proyecto QA Propuesta Horas"
const HORAS_PROPUESTAS = 150 // ≤ tope Investigador Principal (220)

async function login(page: Page, email: string, password: string) {
  await page.goto("/auth/login")
  await page.locator("#email").fill(email)
  await page.locator("#password").fill(password)
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
}

test("Proyecto: el creador propone sus horas y quedan guardadas", async ({ page }) => {
  test.setTimeout(120_000)

  await login(page, PROF_PROY.email, PROF_PROY.password)
  await page.goto("/proyectos/nuevo")

  await page.locator("#titulo").fill(TITULO)

  // Tipo → Investigación
  await page.locator("#tipo").click()
  await page.getByRole("option", { name: "Investigación" }).click()

  // Rol → Investigador Principal
  await page.locator("#rolDocente").click()
  await page.getByRole("option", { name: "Investigador Principal" }).click()

  await anunciar(page, "Horas propuestas al crear (Art. 11)", `El creador propone ${HORAS_PROPUESTAS}h (≤ tope 220); se guardan y el revisor las confirma`)

  // Horas propuestas del creador
  await page.locator("#horasDocente").fill(String(HORAS_PROPUESTAS))

  await page.getByRole("button", { name: "Guardar borrador" }).click()

  // Redirige al detalle (form de edición pre-lleno): la propuesta persistió y
  // se recargó (round-trip horasDocente ← horasAsignadas).
  await expect(page.locator("#titulo")).toHaveValue(TITULO, { timeout: 20_000 })
  await expect(page.locator("#horasDocente")).toHaveValue(String(HORAS_PROPUESTAS))

  console.log(`[proy] propuesta guardada y recargada: ${HORAS_PROPUESTAS}h ✓`)
})
