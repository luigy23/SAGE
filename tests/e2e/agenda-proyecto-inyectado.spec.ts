import { test, expect, type Page } from "@playwright/test"
import { PERIODO_PROY, PROYECTO_INYECTADO, PROF_PROY } from "./fixtures/proyecto-inyectado"
import { anunciar } from "./fixtures/anunciar"

/**
 * E2E — Precarga forzosa de proyectos aprobados en la agenda (Art. 11).
 *
 * Un proyecto APROBADO+activo donde el docente participa debe aparecer SOLO y
 * BLOQUEADO en la sección de Investigación, con su rol y las horas asignadas por
 * el revisor — sin que el docente tenga que agregarlo a mano.
 */

async function login(page: Page, email: string, password: string) {
  await page.goto("/auth/login")
  await page.locator("#email").fill(email)
  await page.locator("#password").fill(password)
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
}

test("FO-19 — proyecto aprobado se precarga bloqueado en la agenda (Art. 11)", async ({ page }) => {
  test.setTimeout(120_000)

  await login(page, PROF_PROY.email, PROF_PROY.password)
  await page.goto("/agenda")
  await expect(page.getByText(`Crear Agenda del Periodo ${PERIODO_PROY}`)).toBeVisible({ timeout: 20_000 })
  await page.getByRole("button", { name: "Crear Agenda" }).click()

  // Paso 1 → Docencia → Investigación
  await page.getByRole("button", { name: "Siguiente" }).click()
  await page.getByRole("button", { name: "Siguiente" }).click()
  await expect(page.getByText("2. Actividades de Investigación")).toBeVisible()

  await anunciar(page, "Precarga de proyecto aprobado (Art. 11)", `Debe aparecer solo y bloqueado: ${PROYECTO_INYECTADO.actividadNombre} · ${PROYECTO_INYECTADO.horasAsignadas}h`)

  // La tarjeta bloqueada muestra el rol (actividad del catálogo), el título y las horas.
  await expect(page.getByText(PROYECTO_INYECTADO.actividadNombre)).toBeVisible()
  await expect(page.getByText(new RegExp(PROYECTO_INYECTADO.titulo))).toBeVisible()
  await expect(page.getByText(new RegExp(`${PROYECTO_INYECTADO.horasAsignadas}h`))).toBeVisible()
  await expect(page.getByText(/Precargado de tu proyecto activo/)).toBeVisible()

  console.log(`[proy] precargado bloqueado: ${PROYECTO_INYECTADO.actividadNombre} · ${PROYECTO_INYECTADO.horasAsignadas}h ✓`)
})
