/**
 * The shape every server action returns. Components branch on `ok` and show `message`
 * (already in the UI language) when it is false. Field errors are keyed by field name.
 */
export type ActionResult<T = void> =
  { ok: true; data: T } | { ok: false; message: string; fieldErrors?: Record<string, string> }

export function ok(): ActionResult<void>
export function ok<T>(data: T): ActionResult<T>
export function ok<T>(data?: T): ActionResult<T | void> {
  return { ok: true, data }
}

export function fail(
  message: string,
  fieldErrors?: Record<string, string>
): { ok: false; message: string; fieldErrors?: Record<string, string> } {
  return { ok: false, message, fieldErrors }
}
