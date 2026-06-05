import { test, expect, type Page } from "@playwright/test"
import {
  SUPER,
  TARGET,
  NUEVO,
  prepararCredenciales,
  limpiarCredenciales,
} from "./fixtures/credenciales"

/**
 * E2E — Cambio de credenciales (correo y contraseña) por SUPERADMIN.
 *
 * Flujo:
 *   1. El SUPERADMIN entra a /superadmin/usuarios/[id] del docente objetivo.
 *   2. Abre «Cambiar credenciales» y asigna un nuevo correo + nueva contraseña.
 *   3. Se verifica el toast de éxito y que el detalle ya muestra el nuevo correo.
 *   4. El docente inicia sesión con el NUEVO correo y la NUEVA contraseña
 *      (en un contexto limpio) → llega a /dashboard.
 *   5. Las credenciales VIEJAS ya no sirven.
 *
 * Corre headed + slowMo (ver playwright.config.ts) para observarlo en vivo.
 */

let targetId: string

test.beforeAll(async () => {
  const r = await prepararCredenciales()
  targetId = r.targetId
})

test.afterAll(async () => {
  await limpiarCredenciales()
})

async function login(page: Page, email: string, password: string) {
  await page.goto("/auth/login")
  await page.locator("#email").fill(email)
  await page.locator("#password").fill(password)
  await page.getByRole("button", { name: "Ingresar" }).click()
}

test("SUPERADMIN cambia correo y contraseña; el docente entra con el nuevo correo", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000)

  // ── 1. Login como SUPERADMIN ───────────────────────────────────────────────
  await login(page, SUPER.email, SUPER.password)
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 })

  // ── 2. Detalle del docente objetivo ────────────────────────────────────────
  await page.goto(`/superadmin/usuarios/${targetId}`)
  await expect(page.getByText(TARGET.nombre).first()).toBeVisible()
  await expect(page.getByText(TARGET.email).first()).toBeVisible()

  // ── 3. Abrir el diálogo y cambiar correo + contraseña ──────────────────────
  await page.getByRole("button", { name: "Cambiar credenciales" }).click()
  await expect(
    page.getByRole("heading", { name: "Cambiar credenciales de acceso" })
  ).toBeVisible()

  await page.locator("#cred-email").fill(NUEVO.email)
  await page.locator("#cred-password").fill(NUEVO.password)
  await page.getByRole("button", { name: "Guardar", exact: true }).click()

  // ── 4. Éxito: toast + el detalle refleja el nuevo correo ───────────────────
  await expect(page.getByText(/Credenciales actualizadas/)).toBeVisible()
  await expect(page.getByText(NUEVO.email).first()).toBeVisible({ timeout: 15_000 })

  // ── 5. El docente entra con las NUEVAS credenciales (contexto limpio) ──────
  const ctx = await browser.newContext()
  const pageDocente = await ctx.newPage()
  await login(pageDocente, NUEVO.email, NUEVO.password)
  await pageDocente.waitForURL(/\/dashboard/, { timeout: 30_000 })
  await expect(pageDocente).toHaveURL(/\/dashboard/)
  await ctx.close()

  // ── 6. Las credenciales VIEJAS ya no sirven ────────────────────────────────
  const ctxViejo = await browser.newContext()
  const pageViejo = await ctxViejo.newPage()
  await login(pageViejo, TARGET.email, TARGET.password)
  await expect(pageViejo.getByText(/Credenciales inválidas/)).toBeVisible({
    timeout: 15_000,
  })
  await ctxViejo.close()
})
