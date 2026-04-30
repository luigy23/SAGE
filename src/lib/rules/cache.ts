/**
 * Cache TTL en memoria (proceso) — usado por el resolver de reglas paramétricas
 * para evitar martillar la DB en cada request.
 *
 * El SUPERADMIN escribe muy poco; los docentes leen mucho. TTL corto (60s)
 * es suficiente para que cambios sean visibles en menos de un minuto en producción.
 */

const DEFAULT_TTL_MS = 60_000 // 60s

type Entry<T> = {
  value: T
  expiresAt: number
}

const store = new Map<string, Entry<unknown>>()

export async function memoize<T>(
  key: string,
  loader: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<T> {
  const now = Date.now()
  const hit = store.get(key) as Entry<T> | undefined
  if (hit && hit.expiresAt > now) {
    return hit.value
  }
  const value = await loader()
  store.set(key, { value, expiresAt: now + ttlMs })
  return value
}

/**
 * Invalida una clave o un prefijo (ej. "params:modalidad:*").
 * Llamar cuando el SUPERADMIN actualiza una regla.
 */
export function invalidate(prefix: string): void {
  if (prefix.endsWith("*")) {
    const root = prefix.slice(0, -1)
    for (const key of store.keys()) {
      if (key.startsWith(root)) store.delete(key)
    }
  } else {
    store.delete(prefix)
  }
}

/** Limpia todo el cache (útil en tests o tras seed). */
export function clearAll(): void {
  store.clear()
}
