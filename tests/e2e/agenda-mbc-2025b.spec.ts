import { test, expect, type Page } from "@playwright/test"
import {
  MARLIO,
  PERIODO,
  ACTIVIDADES_DOCENCIA,
  ACTIVIDADES_GESTION,
  TOTAL_DOCENCIA,
  TOTAL_GESTION,
  TOTAL_SEMESTRE,
} from "./fixtures/marlio"

/**
 * E2E — Agenda real "MBC-2025B" reproducida 1:1 en SAGE.
 *
 * Replica el FO-19 del docente MARLIO BEDOYA CARDOSO (Decano, PLANTA_TC, Neiva):
 * 160h de docencia (3 actividades del Art. 11) + 620h de gestión (Decanatura) = 780h.
 *
 * Corre en headed + slowMo (ver playwright.config.ts) para observarlo en vivo.
 * El paso final (Enviar) NO se asume exitoso: capturamos el resultado real para
 * detectar discrepancias entre la agenda aprobada por la USCO y las reglas de SAGE.
 */

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

async function login(page: Page) {
  await page.goto("/auth/login")
  await page.locator("#email").fill(MARLIO.email)
  await page.locator("#password").fill(MARLIO.password)
  await page.getByRole("button", { name: "Ingresar" }).click()
  // Tras autenticarse, NextAuth redirige a /dashboard.
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
}

/**
 * Agrega una actividad del catálogo Art. 11 dentro del paso actual del wizard:
 * abre el selector, busca por nombre, la elige y digita el total del semestre.
 */
async function agregarActividad(
  page: Page,
  opts: { botonAgregar: string; arrayName: string; index: number; nombre: string; horas: number }
) {
  // 1) Crear la tarjeta de actividad.
  await page.getByRole("button", { name: opts.botonAgregar }).click()

  // 2) Abrir el selector del catálogo (la última tarjeta sin seleccionar).
  await page
    .getByRole("button", { name: /Buscar actividad del catálogo \(Art\. 11\)/ })
    .last()
    .click()

  // 3) Buscar y seleccionar la actividad.
  await page.getByPlaceholder("Buscar por nombre...").fill(opts.nombre)
  await page
    .getByRole("option", { name: new RegExp(esc(opts.nombre)) })
    .first()
    .click()

  // 4) Digitar el total de horas del semestre (input controlado por RHF).
  const inputHoras = page.locator(`input[name="${opts.arrayName}.${opts.index}.dedicacionPeriodo"]`)
  await expect(inputHoras).toBeVisible()
  await inputHoras.fill(String(opts.horas))
  await expect(inputHoras).toHaveValue(String(opts.horas))
}

test("FO-19 — Agenda 2025-2 de un Decano (MBC) reproducida 1:1", async ({ page }) => {
  test.setTimeout(120_000)

  // ── 1. Login ──────────────────────────────────────────────────────────────
  await login(page)

  // ── 2. Entrar a la Agenda y arrancar el wizard ─────────────────────────────
  await page.goto("/agenda")
  await expect(
    page.getByText(`Crear Agenda del Periodo ${PERIODO}`)
  ).toBeVisible({ timeout: 20_000 })
  await page.getByRole("button", { name: "Crear Agenda" }).click()

  // ── 3. Paso 1 · Identificación ─────────────────────────────────────────────
  await expect(page.locator("#step1-nombre")).toHaveValue(MARLIO.nombre)
  await expect(page.locator("#step1-cedula")).toHaveValue(MARLIO.cedula)
  await page.getByRole("button", { name: "Siguiente" }).click()

  // ── 4. Paso 2 · Docencia (3 actividades del Art. 11 = 160h) ────────────────
  await expect(page.getByText("1.2 Otras Actividades de Docencia")).toBeVisible()
  for (let i = 0; i < ACTIVIDADES_DOCENCIA.length; i++) {
    const a = ACTIVIDADES_DOCENCIA[i]
    await agregarActividad(page, {
      botonAgregar: "Agregar Otra Actividad de Docencia",
      arrayName: "otrasActividadesDocencia",
      index: i,
      nombre: a.nombre,
      horas: a.horas,
    })
  }
  await page.getByRole("button", { name: "Siguiente" }).click()

  // ── 5. Paso 3 · Investigación y Proyección (vacío en la agenda real) ───────
  await expect(page.getByText("2. Actividades de Investigación")).toBeVisible()
  await page.getByRole("button", { name: "Siguiente" }).click()

  // ── 6. Paso 4 · Gestión (Decanatura = 620h) ────────────────────────────────
  await expect(page.getByText("Gestión Académico-Administrativa")).toBeVisible()
  for (let i = 0; i < ACTIVIDADES_GESTION.length; i++) {
    const a = ACTIVIDADES_GESTION[i]
    await agregarActividad(page, {
      botonAgregar: "Agregar Actividad de Gestión",
      arrayName: "actividadesGestion",
      index: i,
      nombre: a.nombre,
      horas: a.horas,
    })
  }
  await page.getByRole("button", { name: "Siguiente" }).click()

  // ── 7. Paso 5 · Revisión — el total debe ser 780h ──────────────────────────
  // El encabezado fijo (HorasStickyHeader) suma reactivamente todas las horas.
  await expect(
    page.getByText(new RegExp(`${TOTAL_SEMESTRE}\\s*/\\s*\\d+\\s*hrs/semestre`))
  ).toBeVisible({ timeout: 15_000 })
  // eslint-disable-next-line no-console
  console.log(
    `[MBC] Totales reproducidos → docencia=${TOTAL_DOCENCIA}h · gestión=${TOTAL_GESTION}h · TOTAL=${TOTAL_SEMESTRE}h`
  )
  await page.screenshot({ path: "test-results/mbc-revision.png", fullPage: true })

  // ── 8. Enviar — debe ACEPTARSE ─────────────────────────────────────────────
  // Un Decano (exento del tope del 20% de gestión, Art. 10/11) NO está sujeto al
  // mínimo de docencia de 432h: su dedicación administrativa lo hace imposible.
  // Por eso esta agenda real, 1:1 con la aprobada por la USCO, debe pasar.
  await page.getByRole("button", { name: "Enviar Agenda" }).click()
  await expect(page.getByText("¿Enviar agenda definitivamente?")).toBeVisible()
  await page.getByRole("button", { name: "Confirmar Envío" }).click()

  const toast = page.locator("[data-sonner-toast]").first()
  await expect(toast).toBeVisible({ timeout: 15_000 })
  const mensaje = (await toast.textContent())?.trim() ?? ""
  // eslint-disable-next-line no-console
  console.log(`[MBC] Resultado del envío → "${mensaje}"`)
  await page.screenshot({ path: "test-results/mbc-envio.png", fullPage: true })

  // La agenda del Decano debe quedar ENVIADA (la excepción Art. 10/11 al mínimo
  // de docencia ya está aplicada en el schema).
  expect(mensaje, "Se esperaba que SAGE aceptara la agenda del Decano").toMatch(
    /enviada exitosamente/i
  )

  // Modo "déjalo abierto para verlo": corre con KEEP_OPEN=1 y el navegador se
  // queda en la pantalla final hasta que lo cierres (botón Resume del Inspector).
  if (process.env.KEEP_OPEN) {
    // eslint-disable-next-line no-console
    console.log("[MBC] 👀 Navegador abierto. Mirá con calma y cerralo cuando termines.")
    await page.pause()
  }
})
