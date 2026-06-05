import { test, expect, type Page } from "@playwright/test"
import {
  PERIODO_DEMO,
  DOCENTE_DEMO,
  JEFE_DEMO,
  CURSOS_DEMO,
  PROYECTO_APROBADO_DEMO,
  PROYECTO_PENDIENTE_DEMO,
  CONSEJERIA_HORAS_DEMO,
  HORAS_CURSO_DEMO,
} from "./fixtures/demo"
import { anunciar } from "./fixtures/anunciar"

/**
 * DEMO end-to-end (historia completa) — para mostrar en vivo.
 *
 *   Acto 1: la profesora DIANA arma y ENVÍA su agenda FO-19 (cursos del catálogo
 *           con cálculo automático + proyecto aprobado precargado + consejería).
 *   Acto 2: el jefe CARLOS revisa su programa, ve a sus consejeros, APRUEBA un
 *           proyecto pendiente (horas ya propuestas) y APRUEBA la agenda de Diana.
 *
 * Córrelo narrado y pausado:
 *   EXPLAIN=1 KEEP_OPEN=1 npx playwright test demo-completo
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

async function irAUltimoPaso(page: Page) {
  for (let i = 0; i < 6; i++) {
    const next = page.getByRole("button", { name: "Siguiente" })
    if ((await next.count()) === 0 || !(await next.isVisible())) break
    await next.click()
  }
  await expect(page.getByRole("button", { name: /Enviar Agenda/ })).toBeVisible({ timeout: 15_000 })
}

test("DEMO — historia completa: docente arma y envía, autoridad aprueba", async ({ page }) => {
  test.setTimeout(300_000)

  // ════════════ ACTO 1 — La profesora DIANA arma su agenda ════════════
  await anunciar(page, "ACTO 1 — La profesora arma su Agenda FO-19", `${DOCENTE_DEMO.nombre} · planta tiempo completo · período ${PERIODO_DEMO}`)
  await login(page, DOCENTE_DEMO.email, DOCENTE_DEMO.password)
  await page.goto("/agenda")
  await expect(page.getByText(`Crear Agenda del Periodo ${PERIODO_DEMO}`)).toBeVisible({ timeout: 20_000 })
  await page.getByRole("button", { name: "Crear Agenda" }).click()
  await page.getByRole("button", { name: "Siguiente" }).click()
  await expect(page.getByText("1.2 Otras Actividades de Docencia")).toBeVisible()

  // Cursos del catálogo — las horas se calculan solas (Acuerdo 048).
  await anunciar(page, "Cursos del catálogo oficial", "Al elegir cada curso, SAGE calcula las horas (factor × horas + 1) × semanas_clases")
  for (const codigo of CURSOS_DEMO) await agregarCurso(page, codigo)
  await expect(page.getByTestId("curso-0-total")).toHaveText(`${HORAS_CURSO_DEMO}h`)

  // Consejería precargada (compromiso vigente) — registra sus 48h.
  await anunciar(page, "Consejería Académica precargada", "Su cohorte amarrada aparece sola; registra las 48h (Art. 11)")
  await page.locator(`input[name="otrasActividadesDocencia.0.dedicacionPeriodo"]`).fill(String(CONSEJERIA_HORAS_DEMO))

  // Investigación — proyecto APROBADO precargado y bloqueado.
  await page.getByRole("button", { name: "Siguiente" }).click()
  await expect(page.getByText("2. Actividades de Investigación")).toBeVisible()
  await anunciar(page, "Proyecto aprobado precargado", `"${PROYECTO_APROBADO_DEMO.titulo}" aparece solo y bloqueado, con sus ${PROYECTO_APROBADO_DEMO.horas}h asignadas`)
  await expect(page.getByText(new RegExp(esc(PROYECTO_APROBADO_DEMO.titulo))).first()).toBeVisible()
  await expect(page.getByText(new RegExp(`${PROYECTO_APROBADO_DEMO.horas}h`)).first()).toBeVisible()

  // Revisión + envío.
  await irAUltimoPaso(page)
  await anunciar(page, "Revisión y envío de la agenda", "Diana revisa el total del semestre y envía su FO-19")
  await page.getByRole("button", { name: /Enviar Agenda/ }).click()
  await expect(page.getByText("¿Enviar agenda definitivamente?")).toBeVisible()
  await page.getByRole("button", { name: "Confirmar Envío" }).click()
  const toastEnvio = page.locator("[data-sonner-toast]").first()
  await expect(toastEnvio).toBeVisible({ timeout: 15_000 })
  await expect(toastEnvio).toContainText(/enviada exitosamente/i)
  console.log("[demo] ACTO 1 ✓ — Diana envió su agenda")

  // ════════════ ACTO 2 — El jefe CARLOS revisa y aprueba ════════════
  await page.context().clearCookies()
  await anunciar(page, "ACTO 2 — El Jefe de Programa revisa", `${JEFE_DEMO.nombre} · jefe de ${JEFE_DEMO.programa}`)
  await login(page, JEFE_DEMO.email, JEFE_DEMO.password)

  // Vista de consejeros de su programa.
  await page.goto("/gestion/consejeria")
  await anunciar(page, "Consejeros de su programa", "El jefe ve quién ejerce consejería en su programa")
  await expect(page.getByText(new RegExp(esc(DOCENTE_DEMO.nombre))).first()).toBeVisible({ timeout: 20_000 })

  // Aprobar el proyecto pendiente (horas propuestas ya pre-cargadas en el panel).
  await page.goto("/gestion/proyectos")
  await anunciar(page, "Aprobación de proyecto", `El jefe abre "${PROYECTO_PENDIENTE_DEMO.titulo}" y confirma las horas propuestas (${PROYECTO_PENDIENTE_DEMO.horasPropuestas}h)`)
  await expect(page.getByText(new RegExp(esc(PROYECTO_PENDIENTE_DEMO.titulo))).first()).toBeVisible({ timeout: 20_000 })
  await page.getByRole("link", { name: /Revisar/ }).first().click()
  await expect(page.getByText(/Asignar horas y tiempo para aprobar/)).toBeVisible({ timeout: 15_000 })
  await page.getByRole("button", { name: /Aprobar y asignar/ }).click()
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: /Proyecto aprobado/i }).first()).toBeVisible({ timeout: 15_000 })
  console.log("[demo] ACTO 2.1 ✓ — proyecto aprobado")

  // Aprobar la agenda de Diana.
  await page.goto("/gestion/agendas")
  await anunciar(page, "Aprobación de la agenda", `El jefe revisa y aprueba la agenda de ${DOCENTE_DEMO.nombre}`)
  await expect(page.getByText(new RegExp(esc(DOCENTE_DEMO.nombre))).first()).toBeVisible({ timeout: 20_000 })
  await page.getByRole("link", { name: /^Ver$/ }).first().click()
  await page.getByRole("button", { name: /^Aprobar$/ }).click()
  await expect(page.getByText("¿Aprobar esta agenda?")).toBeVisible()
  await page.getByRole("button", { name: /Sí, aprobar/ }).click()
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: /aprobada/i }).first()).toBeVisible({ timeout: 15_000 })
  console.log("[demo] ACTO 2.2 ✓ — agenda aprobada")

  await anunciar(page, "✓ Historia completa", "De la planeación del docente (FO-19) a la aprobación de la autoridad académica — todo trazable y según el Acuerdo 048")

  if (process.env.KEEP_OPEN) {
    console.log("[demo] 👀 Fin del demo. Pulsa Resume (▶) para cerrar.")
    await page.pause()
  }
})
