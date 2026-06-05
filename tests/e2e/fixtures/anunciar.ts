import type { Page } from "@playwright/test"

/**
 * Muestra un banner explicativo en pantalla ANTES de cada validación, para
 * entender en vivo qué está comprobando el test. Solo se activa con EXPLAIN=1:
 *
 *     EXPLAIN=1 npx playwright test agenda-modalidades
 *
 * Sin EXPLAIN, es un no-op (las corridas normales/CI no se ralentizan).
 * El banner tiene pointer-events:none para no interferir con los clics del test.
 */
export async function anunciar(page: Page, titulo: string, detalle = "") {
  if (!process.env.EXPLAIN) return

  console.log(`  ▶ Validando: ${titulo}${detalle ? ` — ${detalle}` : ""}`)

  await page.evaluate(
    ({ titulo, detalle }) => {
      let el = document.getElementById("__qa_anuncio__")
      if (!el) {
        el = document.createElement("div")
        el.id = "__qa_anuncio__"
        el.style.cssText = [
          "position:fixed", "top:0", "left:0", "right:0", "z-index:2147483647",
          "background:rgba(15,23,42,.96)", "color:#fff", "padding:14px 22px",
          "font:600 17px/1.4 system-ui,-apple-system,sans-serif",
          "box-shadow:0 2px 14px rgba(0,0,0,.45)", "border-bottom:3px solid #22c55e",
          "pointer-events:none",
        ].join(";")
        document.body.appendChild(el)
      }
      el.innerHTML =
        `<div style="font-size:12px;color:#22c55e;letter-spacing:.08em;text-transform:uppercase;font-weight:700">✓ Validando</div>` +
        `<div>${titulo}</div>` +
        (detalle
          ? `<div style="font-size:13px;font-weight:400;color:#cbd5e1;margin-top:3px">${detalle}</div>`
          : "")
    },
    { titulo, detalle },
  )

  await page.waitForTimeout(1800)
}
