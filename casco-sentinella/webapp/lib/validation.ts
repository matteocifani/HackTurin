import { z } from 'zod'

/** `YYYY-MM-DD`, the format used by `date` columns and by `DateTrigger`. */
export const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data non valida')

export const uuidSchema = z.string().uuid('Identificativo non valido')

/** Trims and turns an empty string into `null`, so optional text fields can be sent as they are typed. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Massimo ${max} caratteri`)
    .transform(value => (value === '' ? null : value))
    .nullable()
    .optional()

/** Flattens a zod error into `{ field: 'first message' }`, the shape `ActionResult.fieldErrors` expects. */
export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.map(String).join('.') || '_'
    if (!(key in out)) out[key] = issue.message
  }
  return out
}

/** Escapes `%` and `_` so user text can be used inside an `ilike` pattern. */
export function escapeLike(text: string) {
  return text.replace(/[\\%_]/g, char => `\\${char}`)
}
