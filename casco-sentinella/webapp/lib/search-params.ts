/** Helpers for `searchParams` in Server Components (Next 16 passes them as a Promise). */
export type SearchParams = Record<string, string | string[] | undefined>

/** The first value of a parameter, or `undefined`. */
export function firstParam(params: SearchParams, key: string): string | undefined {
  const value = params[key]
  return Array.isArray(value) ? value[0] : value
}

/** A comma-separated parameter as a list (`?stato=todo,done` → `['todo', 'done']`). */
export function listParam(params: SearchParams, key: string): string[] {
  return (firstParam(params, key) ?? '').split(',').filter(Boolean)
}

/** The values of a list parameter that belong to an allowed set, typed. */
export function enumListParam<T extends string>(
  params: SearchParams,
  key: string,
  allowed: readonly T[]
): T[] {
  return listParam(params, key).filter((value): value is T => (allowed as readonly string[]).includes(value))
}

/** A single-valued parameter that belongs to an allowed set, typed. */
export function enumParam<T extends string>(
  params: SearchParams,
  key: string,
  allowed: readonly T[]
): T | undefined {
  const value = firstParam(params, key)
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : undefined
}
