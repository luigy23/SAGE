import { resolveGlobales } from "@/lib/rules/resolver"
import { RegisterForm } from "./register-form"

export default async function RegisterPage() {
  const globales = await resolveGlobales(null)
  return <RegisterForm maxSemanas={globales.semanasPeriodo} />
}
