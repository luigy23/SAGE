import { defineConfig, devices } from "@playwright/test"

/**
 * Configuración Playwright para SAGE.
 *
 * Pensada para CORRER EN VIVO Y VERLA:
 *   - headless: false  → abre el navegador
 *   - slowMo: 700ms    → cada acción se ve con calma (ideal para detectar fallos)
 *   - workers: 1       → un solo escenario a la vez, sin condiciones de carrera
 *
 * Reutiliza el `npm run dev` si ya está corriendo en :3000; si no, lo levanta.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: "http://localhost:3000",
    headless: false,
    viewport: { width: 1920, height: 1080 }, // 1080p para mejor calidad
    locale: "es-CO",
    launchOptions: { slowMo: 300 }, // Reducido de 700ms a 300ms para que no sea tan lento
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
    trace: "on",
    video: {
      mode: "on",
      size: { width: 1920, height: 1080 } // Forzar grabación en 1080p
    },
    screenshot: "on",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
