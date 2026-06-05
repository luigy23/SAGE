import { test, expect, type Page } from "@playwright/test"
import {
  CASOS,
  PERIODO_MOD,
  SEMANAS_CLASES,
  CURSO_PEQUENO,
  CURSO_GRANDE,
  TOTAL_CURSO_PEQUENO,
  ACTIVIDAD_INV_QA,
  INV_CATEDRA_EXCESO,
  type CasoModalidad,
} from "./fixtures/modalidades"

/**
 * E2E — La agenda FO-19 calcula y valida DISTINTO según la modalidad (Acuerdo 048).
 *
 * Para cada modalidad clave (PLANTA_TC, OCASIONAL_TC, CÁTEDRA, VISITANTE_TC) verifica:
 *   1) El tope semestral (denominador del encabezado) según el Acuerdo.
 *   2) Que el cálculo por curso es IGUAL para todos: usa semanas_clases (16), no las
 *      semanas del contrato — un curso teórico de 4h presenciales = 144h en todas.
 *   3) La regla de envío característica de esa modalidad:
 *        · PLANTA_TC     → bloquea por mínimo de docencia (432h).
 *        · OCASIONAL_TC  → bloqueo estricto al exceder el tope derivado (640h).
 *        · CÁTEDRA       → bloqueo por tope Inv+Proy (4h/sem × 16 = 64h).
 *        · VISITANTE_TC  → NO es estricto: excede el tope (640h) pero se acepta.
 */

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

async function login(page: Page, email: string, password: string) {
  await page.goto("/auth/login")
  await page.locator("#email").fill(email)
  await page.locator("#password").fill(password)
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
}

async function agregarCurso(page: Page, codigo: string) {
  await page.getByRole("button", { name: "Agregar Curso" }).click()
  await page
    .getByRole("button", { name: /Buscar curso del catálogo oficial/ })
    .last()
    .click()
  await page.getByPlaceholder("Buscar por código, nombre o facultad...").fill(codigo)
  await page.getByRole("option", { name: new RegExp(esc(codigo)) }).first().click()
}

async function agregarActividad(
  page: Page,
  opts: { botonAgregar: string; arrayName: string; index: number; nombre: string; horas: number }
) {
  await page.getByRole("button", { name: opts.botonAgregar }).click()
  await page
    .getByRole("button", { name: /Buscar actividad del catálogo \(Art\. 11\)/ })
    .last()
    .click()
  await page.getByPlaceholder("Buscar por nombre...").fill(opts.nombre)
  await page.getByRole("option", { name: new RegExp(esc(opts.nombre)) }).first().click()
  const input = page.locator(`input[name="${opts.arrayName}.${opts.index}.dedicacionPeriodo"]`)
  await expect(input).toBeVisible()
  await input.fill(String(opts.horas))
}

/** Avanza hasta el último paso (donde aparece "Enviar Agenda"). */
async function irAUltimoPaso(page: Page) {
  for (let i = 0; i < 6; i++) {
    const next = page.getByRole("button", { name: "Siguiente" })
    if ((await next.count()) === 0 || !(await next.isVisible())) break
    await next.click()
  }
  await expect(page.getByRole("button", { name: /Enviar Agenda/ })).toBeVisible({ timeout: 15_000 })
}

function correrCaso(caso: CasoModalidad) {
  test(`FO-19 — ${caso.key}: tope ${caso.topeSemestral}h, curso=semanas_clases, regla de envío`, async ({ page }) => {
    test.setTimeout(120_000)

    // ── 1. Login + arrancar wizard ──────────────────────────────────────────
    await login(page, caso.docente.email, caso.docente.password)
    await page.goto("/agenda")
    await expect(
      page.getByText(`Crear Agenda del Periodo ${PERIODO_MOD}`)
    ).toBeVisible({ timeout: 20_000 })
    await page.getByRole("button", { name: "Crear Agenda" }).click()

    // ── 2. Tope semestral (denominador) según la modalidad ──────────────────
    // El encabezado fijo muestra "<total> / <tope> hrs/semestre".
    await expect(
      page.getByText(new RegExp(`/\\s*${caso.topeSemestral}\\s*hrs/semestre`))
    ).toBeVisible({ timeout: 15_000 })

    // ── 3. Paso 1 → Docencia ────────────────────────────────────────────────
    await expect(page.locator("#step1-nombre")).toHaveValue(caso.docente.nombre)
    await page.getByRole("button", { name: "Siguiente" }).click()
    await expect(page.getByText("1.2 Otras Actividades de Docencia")).toBeVisible()

    // ── 4. Cálculo por curso: IGUAL para todas (semanas_clases, no contrato) ─
    await agregarCurso(page, CURSO_PEQUENO.codigo)
    await expect(page.getByTestId("curso-0-horas")).toHaveText(String(CURSO_PEQUENO.horasPresenciales))
    await expect(page.getByTestId("curso-0-semanas")).toHaveText(String(SEMANAS_CLASES))
    await expect(page.locator(`input[name="cursos.0.semanas"]`)).toHaveCount(0)
    await expect(page.getByTestId("curso-0-total")).toHaveText(`${TOTAL_CURSO_PEQUENO}h`)

    // ── 5. Regla de envío característica de la modalidad ─────────────────────
    switch (caso.submit.tipo) {
      case "reject-min-docencia": {
        // Solo 144h de docencia (< mínimo 432) → el envío queda BLOQUEADO.
        // (La app muestra un toast de error genérico; lo importante es que NO se envía.)
        await irAUltimoPaso(page)
        await page.getByRole("button", { name: /Enviar Agenda/ }).click()
        await expect(page.getByText("¿Enviar agenda definitivamente?")).toBeVisible()
        await page.getByRole("button", { name: "Confirmar Envío" }).click()
        // Aparece un toast de error y seguimos en el wizard (no hubo envío exitoso).
        await expect(page.locator('[data-sonner-toast][data-type="error"]').first()).toBeVisible({
          timeout: 15_000,
        })
        await expect(page.getByText(/enviada exitosamente/i)).toHaveCount(0)
        await expect(page.getByRole("button", { name: /Enviar Agenda/ })).toBeVisible()
        break
      }
      case "block-tope-estricto": {
        // Curso grande → total 800 > 640 y estricto → "Enviar Agenda" deshabilitado.
        await agregarCurso(page, CURSO_GRANDE.codigo)
        await irAUltimoPaso(page)
        await expect(page.getByRole("button", { name: /Enviar Agenda/ })).toBeDisabled()
        break
      }
      case "block-catedra-invps": {
        // Investigación 80h > tope cátedra (64h) → "Enviar Agenda" deshabilitado.
        await page.getByRole("button", { name: "Siguiente" }).click() // → Investigación
        await expect(page.getByText("2. Actividades de Investigación")).toBeVisible()
        await agregarActividad(page, {
          botonAgregar: "Agregar Actividad de Investigación",
          arrayName: "actividadesInvestigacion",
          index: 0,
          nombre: ACTIVIDAD_INV_QA.nombre,
          horas: INV_CATEDRA_EXCESO,
        })
        await irAUltimoPaso(page)
        await expect(page.getByRole("button", { name: /Enviar Agenda/ })).toBeDisabled()
        break
      }
      case "accept-no-estricto": {
        // Curso grande → total 800 > 640 PERO visitante no es estricto → se acepta.
        await agregarCurso(page, CURSO_GRANDE.codigo)
        await irAUltimoPaso(page)
        await expect(page.getByRole("button", { name: /Enviar Agenda/ })).toBeEnabled()
        await page.getByRole("button", { name: /Enviar Agenda/ }).click()
        await expect(page.getByText("¿Enviar agenda definitivamente?")).toBeVisible()
        await page.getByRole("button", { name: "Confirmar Envío" }).click()
        const toast = page.locator("[data-sonner-toast]").first()
        await expect(toast).toBeVisible({ timeout: 15_000 })
        await expect(toast).toContainText(/enviada exitosamente/i)
        break
      }
    }

    console.log(`[mod] ${caso.key} OK → tope ${caso.topeSemestral}h, ${caso.submit.tipo}`)
  })
}

test.describe("FO-19 — Cálculos y reglas por modalidad (Acuerdo 048)", () => {
  for (const caso of CASOS) correrCaso(caso)
})
