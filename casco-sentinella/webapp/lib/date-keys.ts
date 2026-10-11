/** Date keys (YYYY-MM-DD) and the arithmetic around them, free of time zones. Part of the IAMAimpresa design system. */
export function dateKey(d: Date): string {
  return d.toLocaleDateString('sv-SE')
}

export function todayKey(): string {
  return dateKey(new Date())
}

export function dateKeyUtc(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function todayKeyUtc(): string {
  return dateKeyUtc(new Date())
}

export const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'] as const

export function addDays(key: string, days: number): string {
  const d = new Date(`${key}T00:00:00`)
  d.setDate(d.getDate() + days)
  return dateKey(d)
}

export function mondayOf(key: string): string {
  const d = new Date(`${key}T00:00:00`)
  return addDays(key, -((d.getDay() + 6) % 7))
}

export function monthWorkDays(year: number, month1: number): string[] {
  const out: string[] = []
  const last = new Date(year, month1, 0).getDate()
  for (let day = 1; day <= last; day++) {
    const d = new Date(year, month1 - 1, day)
    if (d.getDay() !== 0) out.push(dateKey(d))
  }
  return out
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function monthCells(cursor: Date): Date[] {
  const first = startOfMonth(cursor)
  const offset = (first.getDay() + 6) % 7
  const start = new Date(first)
  start.setDate(first.getDate() - offset)
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}
