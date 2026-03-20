// Sedes de la Universidad Surcolombiana
// Parametrizable: agregar o quitar sedes aquí se refleja en toda la app
export const SEDES = ["Neiva", "Garzón", "Pitalito", "La Plata"] as const

export type Sede = (typeof SEDES)[number]
