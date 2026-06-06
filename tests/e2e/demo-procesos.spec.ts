import { test, expect, type Page } from "@playwright/test"
import {
  PERIODO_PROC,
  DOCENTE_PROC,
  JEFE_PROC,
  PROYECTO_PROC,
  CURSOS_PROC,
  CONSEJERIA_HORAS_PROC,
  COHORTE_PROC,
} from "./fixtures/demo-procesos"
import { anunciar } from "./fixtures/anunciar"

/**
 * DEMO de PROCESOS (creación en vivo) — para grabar narrado.
 *
 *   Acto 1: el DOCENTE de planta CREA un proyecto de investigación y lo envía.
 *   Acto 2: el JEFE DE PROGRAMA (cargo administrativo) ve su módulo de consejería
 *           VACÍO y APRUEBA el proyecto asignándole las horas.
 *   Acto 3: el DOCENTE llena su agenda FO-19: el proyecto aprobado se AUTO-INYECTA
 *           bloqueado, agrega su CONSEJERÍA eligiendo una cohorte, envía y descarga
 *           el PDF FO-19.
 *   Acto 4: el JEFE ve la consejería YA REFLEJADA en su módulo y aprueba la agenda.
 *
 * Córrelo narrado y pausado:
 *   EXPLAIN=1 KEEP_OPEN=1 npx playwright test demo-procesos
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

/** Elige una fecha (día del mes actual) en el FechaPicker vacío más próximo. */
async function elegirFechaProyecto(page: Page, dia: number) {
  await page.getByRole("button", { name: /Seleccionar fecha/ }).first().click()
  // Los días del calendario tienen nombre accesible completo ("…, 9 de junio de 2026").
  const grid = page.getByRole("grid").last()
  await grid
    .getByRole("button", { name: new RegExp(`(?:^|\\s)${dia} de \\w+ de \\d{4}$`) })
    .first()
    .click()
}

async function irAUltimoPaso(page: Page) {
  for (let i = 0; i < 6; i++) {
    const next = page.getByRole("button", { name: "Siguiente" })
    if ((await next.count()) === 0 || !(await next.isVisible())) break
    await next.click()
  }
  await expect(page.getByRole("button", { name: /Enviar Agenda/ })).toBeVisible({ timeout: 15_000 })
}

test("DEMO procesos — proyecto y consejería de punta a punta", async ({ page }) => {
  test.setTimeout(360_000)

  // ════════════ ACTO 1 — El Jefe demuestra sus funciones (Módulos vacíos) ════════════
  await anunciar(page, "ACTO 1 — Funciones de Cargo Administrativo", `${JEFE_PROC.nombre} · jefe de ${JEFE_PROC.cargoAmbitoValor}`)
  await login(page, JEFE_PROC.email, JEFE_PROC.password)
  
  await page.goto("/gestion/consejeria")
  await anunciar(page, "Módulo de Consejería (Vacío)", "Actualmente no hay consejeros registrados en el programa")
  await expect(page.getByText(/No hay consejeros activos en tu ámbito/i)).toBeVisible({ timeout: 20_000 })

  await page.goto("/gestion/proyectos")
  await anunciar(page, "Módulo de Proyectos", "Aquí se aprueban los proyectos de los docentes a cargo")
  // Puede estar vacío o no tener este proyecto aún
  console.log("[demo-proc] ACTO 1 ✓ — funciones del jefe demostradas")

  // ════════════ ACTO 2 — El Docente CREA su proyecto ════════════
  await page.context().clearCookies()
  await anunciar(page, "ACTO 2 — El docente crea un proyecto", `${DOCENTE_PROC.nombre} · planta tiempo completo`)
  await login(page, DOCENTE_PROC.email, DOCENTE_PROC.password)
  await page.goto("/proyectos/nuevo")
  await expect(page.getByLabel(/Título del proyecto/)).toBeVisible({ timeout: 20_000 })

  await anunciar(page, "Datos del proyecto", "Título, tipo Investigación, rol Investigador Principal y horas propuestas")
  await page.locator("#titulo").fill(PROYECTO_PROC.titulo)
  
  // Tipo = Investigación
  await page.locator("#tipo").click()
  await page.getByRole("option", { name: "Investigación" }).click()
  // Rol = Investigador Principal
  await page.locator("#rolDocente").click()
  await page.getByRole("option", { name: "Investigador Principal" }).click()
  // Horas propuestas
  await page.locator("#horasDocente").fill(String(PROYECTO_PROC.horas))

  // Tiempo del proyecto (mes actual): inicio y fin → el sistema calcula semestres.
  await anunciar(page, "Tiempo del proyecto", "El docente marca inicio y fin; SAGE calcula los semestres que abarca")
  await elegirFechaProyecto(page, 9)
  await elegirFechaProyecto(page, 20)

  await page.getByRole("button", { name: /Enviar a revisión/ }).click()
  await expect(
    page.locator("[data-sonner-toast]").filter({ hasText: /enviado a revisión/i }).first(),
  ).toBeVisible({ timeout: 15_000 })
  console.log("[demo-proc] ACTO 2 ✓ — proyecto creado y enviado")

  // ════════════ ACTO 3 — El Jefe APRUEBA el proyecto ════════════
  await page.context().clearCookies()
  await anunciar(page, "ACTO 3 — El Jefe aprueba el proyecto", "El jefe asigna las horas definitivas")
  await login(page, JEFE_PROC.email, JEFE_PROC.password)

  await page.goto("/gestion/proyectos")
  await expect(page.getByText(new RegExp(esc(PROYECTO_PROC.titulo))).first()).toBeVisible({ timeout: 20_000 })
  await page.getByRole("link", { name: /Revisar/ }).first().click()
  await expect(page.getByText(/Asignar horas y tiempo para aprobar/)).toBeVisible({ timeout: 15_000 })
  await page.getByRole("button", { name: /Aprobar y asignar/ }).click()
  await expect(
    page.locator("[data-sonner-toast]").filter({ hasText: /Proyecto aprobado/i }).first(),
  ).toBeVisible({ timeout: 15_000 })
  console.log("[demo-proc] ACTO 3 ✓ — proyecto aprobado por el jefe")

  // ════════════ ACTO 4 — El Docente llena su agenda (proyecto auto-inyectado + consejería) ════════════
  await page.context().clearCookies()
  await anunciar(page, "ACTO 4 — El docente arma su Agenda FO-19", `Período ${PERIODO_PROC}`)
  await login(page, DOCENTE_PROC.email, DOCENTE_PROC.password)
  await page.goto("/agenda")
  await page.getByRole("button", { name: "Crear Agenda" }).click()
  await page.getByRole("button", { name: "Siguiente" }).click()
  await expect(page.getByText("1.2 Otras Actividades de Docencia")).toBeVisible()

  // Cursos del catálogo.
  await anunciar(page, "Cursos del catálogo oficial", "Al elegir cada curso, SAGE calcula sus horas automáticamente")
  for (const codigo of CURSOS_PROC) await agregarCurso(page, codigo)

  // Consejería: el docente AGREGA la actividad y ELIGE una cohorte disponible (en vivo).
  await anunciar(page, "Consejería en vivo", `El docente agrega Consejería y toma la cohorte ${COHORTE_PROC} (Art. 11)`)
  await page.getByRole("button", { name: /Agregar Otra Actividad de Docencia/ }).click()
  await page.getByRole("button", { name: /Buscar actividad del catálogo/ }).last().click()
  await page.getByPlaceholder("Buscar por nombre...").fill("Consejería")
  await page.getByRole("option", { name: /Consejería Académica/ }).first().click()
  // Elegir la cohorte disponible + duración (1 por defecto) y agregar.
  await page.getByTestId("consejeria-cohorte-select").click()
  await page.getByRole("option", { name: COHORTE_PROC, exact: true }).click()
  await page.getByTestId("consejeria-agregar").click()
  await expect(page.getByText(new RegExp(`Cohorte\\s+${esc(COHORTE_PROC)}`)).first()).toBeVisible()
  // Horas de la consejería (la actividad recién agregada es la #0).
  await page.locator(`input[name="otrasActividadesDocencia.0.dedicacionPeriodo"]`).fill(String(CONSEJERIA_HORAS_PROC))

  // Investigación: el proyecto aprobado aparece SOLO y bloqueado.
  await page.getByRole("button", { name: "Siguiente" }).click()
  await expect(page.getByText("2. Actividades de Investigación")).toBeVisible()
  await anunciar(page, "Proyecto aprobado auto-inyectado", `"${PROYECTO_PROC.titulo}" entra solo y bloqueado con sus ${PROYECTO_PROC.horas}h`)
  await expect(page.getByText(new RegExp(esc(PROYECTO_PROC.titulo))).first()).toBeVisible()
  await expect(page.getByText(new RegExp(`${PROYECTO_PROC.horas}h`)).first()).toBeVisible()

  // Revisión + envío.
  await irAUltimoPaso(page)
  await anunciar(page, "Revisión y envío de la agenda", "El docente revisa el total del semestre y envía su FO-19")
  await page.getByRole("button", { name: /Enviar Agenda/ }).click()
  await expect(page.getByText("¿Enviar agenda definitivamente?")).toBeVisible()
  await page.getByRole("button", { name: "Confirmar Envío" }).click()
  await expect(
    page.locator("[data-sonner-toast]").filter({ hasText: /enviada exitosamente/i }).first(),
  ).toBeVisible({ timeout: 15_000 })
  console.log("[demo-proc] ACTO 4 ✓ — agenda enviada con proyecto + consejería")

  // PDF FO-19: descargar y guardar como artefacto.
  await page.goto("/agenda")
  await anunciar(page, "PDF oficial FO-19", "Mismo formato MI-FOR, en un clic")
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 60_000 }),
    page.getByRole("link", { name: /Descargar PDF/ }).first().click(),
  ])
  await download.saveAs("test-results/demo-procesos-FO19.pdf")
  console.log("[demo-proc] FO-19 PDF ✓ — guardado")

  // ════════════ ACTO 5 — El Jefe ve la consejería reflejada y aprueba la agenda ════════════
  await page.context().clearCookies()
  await anunciar(page, "ACTO 5 — El Jefe cierra el ciclo", "Ve la consejería ya reflejada y aprueba la agenda")
  await login(page, JEFE_PROC.email, JEFE_PROC.password)

  // El módulo de consejería ahora SÍ muestra al docente como consejero.
  await page.goto("/gestion/consejeria")
  await anunciar(page, "Módulo de Consejería (después)", `El docente aparece como consejero de la cohorte ${COHORTE_PROC}`)
  await expect(page.getByText(new RegExp(esc(DOCENTE_PROC.nombre))).first()).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText(new RegExp(`Cohorte\\s+${esc(COHORTE_PROC)}`)).first()).toBeVisible()

  // Aprobar la agenda del docente.
  await page.goto("/gestion/agendas")
  await anunciar(page, "Aprobación de la agenda", `El jefe revisa y aprueba la agenda de ${DOCENTE_PROC.nombre}`)
  await expect(page.getByText(new RegExp(esc(DOCENTE_PROC.nombre))).first()).toBeVisible({ timeout: 20_000 })
  await page.getByRole("link", { name: /^Ver$/ }).first().click()
  await page.getByRole("button", { name: /^Aprobar$/ }).click()
  await expect(page.getByText("¿Aprobar esta agenda?")).toBeVisible()
  await page.getByRole("button", { name: /Sí, aprobar/ }).click()
  await expect(
    page.locator("[data-sonner-toast]").filter({ hasText: /aprobada/i }).first(),
  ).toBeVisible({ timeout: 15_000 })
  console.log("[demo-proc] ACTO 5 ✓ — agenda aprobada")

  await anunciar(page, "✓ Ciclo completo", "Funciones del jefe demostradas, proyecto inyectado y consejería reflejada.")

  if (process.env.KEEP_OPEN) {
    console.log("[demo-proc] 👀 Fin del demo. Pulsa Resume (▶) para cerrar.")
    await page.pause()
  }
})
