// Sedes de la Universidad Surcolombiana
// `value` debe coincidir con el enum Prisma `Sede` en schema.prisma
// `label` es la etiqueta visual mostrada al usuario
export const SEDES = [
  { value: "NEIVA", label: "Neiva" },
  { value: "GARZON", label: "Garzón" },
  { value: "PITALITO", label: "Pitalito" },
  { value: "LA_PLATA", label: "La Plata" },
] as const

export type SedeValue = (typeof SEDES)[number]["value"]
