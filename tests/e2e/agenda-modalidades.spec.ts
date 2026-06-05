import { test, expect, type Page } from "@playwright/test"
import {
  ESCENARIOS,
  PERIODO_MOD,
  SEMANAS_CLASES,
  type Escenario,
  type Paso,
} from "./fixtures/modalidades"

/**
 * E2E — La agenda FO-19 calcula y valida DISTINTO según la modalidad (Acuerdo 048),
 * probando LAS DOS CARAS de cada modalidad:
 *   - RECHAZO: cuando se viola la regla, el envío se bloquea.
 *   - ACEPTA:  cuando cumple los límites, la agenda se envía exitosamente.
 *
 * Por escenario verifica:
 *   1) El tope semestral (denominador del encabezado) según el Acuerdo.
 *   2) Que las "Semanas de clase" del curso son fijas (= semanas_clases) y no editables.
 *   3) El resultado del envío (bloqueo por botón, bloqueo por toast, o aceptación).
 *
 * Reglas cubiertas: mínimo de docencia (planta/visitante 60%), bloqueo estricto
 * (ocasional), tope cátedra Inv+Proy, y la flexibilidad no-estricta del visitante.
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
  await page.getByRole("button", { name: /Buscar curso del catálogo oficial/ }).last().click()
  await page.getByPlaceholder("Buscar por código, nombre o facultad...").fill(codigo)
  await page.getByRole("option", { name: new RegExp(esc(codigo)) }).first().click()
}

async function agregarInvestigacion(page: Page, index: number, nombre: string, horas: number) {
  await page.getByRole("button", { name: "Agregar Actividad de Investigación" }).click()
  await page.getByRole("button", { name: /Buscar actividad del catálogo \(Art\. 11\)/ }).last().click()
  await page.getByPlaceholder("Buscar por nombre...").fill(nombre)
  await page.getByRole("option", { name: new RegExp(esc(nombre)) }).first().click()
  const input = page.locator(`input[name="actividadesInvestigacion.${index}.dedicacionPeriodo"]`)
  await expect(input).toBeVisible()
  await input.fill(String(horas))
}

/** Ejecuta los pasos del escenario: cursos en Docencia, investigación en su paso. */
async function ejecutarPasos(page: Page, pasos: Paso[]) {
  const cursos = pasos.filter((p): p is { curso: string } => "curso" in p)
  const invs = pasos.filter((p): p is { inv: { nombre: string; horas: number } } => "inv" in p)

  for (const c of cursos) await agregarCurso(page, c.curso)

  // Verifica que el primer curso usa semanas_clases (16) y NO es editable.
  if (cursos.length > 0) {
    await expect(page.getByTestId("curso-0-semanas")).toHaveText(String(SEMANAS_CLASES))
    await expect(page.locator(`input[name="cursos.0.semanas"]`)).toHaveCount(0)
  }

  if (invs.length > 0) {
    await page.getByRole("button", { name: "Siguiente" }).click() // → Investigación
    await expect(page.getByText("2. Actividades de Investigación")).toBeVisible()
    for (let i = 0; i < invs.length; i++) {
      await agregarInvestigacion(page, i, invs[i].inv.nombre, invs[i].inv.horas)
    }
  }
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

function correrEscenario(e: Escenario) {
  const titulo = `${e.modKey} · ${e.variante} — ${e.nota}`
  test(titulo, async ({ page }) => {
    test.setTimeout(120_000)

    // ── 1. Login + arrancar wizard ──────────────────────────────────────────
    await login(page, e.docente.email, e.docente.password)
    await page.goto("/agenda")
    await expect(
      page.getByText(`Crear Agenda del Periodo ${PERIODO_MOD}`)
    ).toBeVisible({ timeout: 20_000 })
    await page.getByRole("button", { name: "Crear Agenda" }).click()

    // ── 2. Tope semestral (denominador) según la modalidad ──────────────────
    await expect(
      page.getByText(new RegExp(`/\\s*${e.topeSemestral}\\s*hrs/semestre`))
    ).toBeVisible({ timeout: 15_000 })

    // ── 3. Paso 1 → Docencia ────────────────────────────────────────────────
    await expect(page.locator("#step1-nombre")).toHaveValue(e.docente.nombre)
    await page.getByRole("button", { name: "Siguiente" }).click()
    await expect(page.getByText("1.2 Otras Actividades de Docencia")).toBeVisible()

    // ── 4. Cargar la agenda del escenario ───────────────────────────────────
    await ejecutarPasos(page, e.pasos)

    // ── 5. Ir al último paso y comprobar el resultado del envío ─────────────
    await irAUltimoPaso(page)
    const enviar = page.getByRole("button", { name: /Enviar Agenda/ })

    switch (e.resultado) {
      case "block-button": {
        // La regla bloquea de forma reactiva: el botón "Enviar" queda deshabilitado.
        await expect(enviar).toBeDisabled()
        break
      }
      case "reject-toast": {
        // El botón está habilitado, pero al confirmar el envío se bloquea (toast de error).
        await expect(enviar).toBeEnabled()
        await enviar.click()
        await expect(page.getByText("¿Enviar agenda definitivamente?")).toBeVisible()
        await page.getByRole("button", { name: "Confirmar Envío" }).click()
        await expect(page.locator('[data-sonner-toast][data-type="error"]').first()).toBeVisible({
          timeout: 15_000,
        })
        await expect(page.getByText(/enviada exitosamente/i)).toHaveCount(0)
        await expect(enviar).toBeVisible() // seguimos en el wizard, no se envió
        break
      }
      case "accept": {
        // La agenda cumple los límites → se envía exitosamente.
        await expect(enviar).toBeEnabled()
        await enviar.click()
        await expect(page.getByText("¿Enviar agenda definitivamente?")).toBeVisible()
        await page.getByRole("button", { name: "Confirmar Envío" }).click()
        const toast = page.locator("[data-sonner-toast]").first()
        await expect(toast).toBeVisible({ timeout: 15_000 })
        await expect(toast).toContainText(/enviada exitosamente/i)
        break
      }
    }

    console.log(`[mod] ${e.modKey} · ${e.variante} OK → ${e.resultado} (tope ${e.topeSemestral}h)`)
  })
}

test.describe("FO-19 — Cálculos y reglas por modalidad (Acuerdo 048): rechazo + aceptación", () => {
  for (const e of ESCENARIOS) correrEscenario(e)
})
