import * as React from "react"

// Debajo de este ancho la barra lateral se vuelve un cajón (drawer) que abre el
// botón ☰, en vez de ocupar una columna fija. Subido a 1024 para que en pantalla
// dividida / ventanas angostas (grabaciones, pruebas) siga habiendo navegación clara.
const MOBILE_BREAKPOINT = 1024

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
