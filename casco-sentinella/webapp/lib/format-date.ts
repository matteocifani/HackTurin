/** Italian date and time formatting (full, short, relative, month). Part of the IAMAimpresa design system. */
import { LOCALE } from '@/lib/locale'
import { dateKey as chiaveLocale, todayKey } from '@/lib/date-keys'

export type ValoreData = string | Date | null | undefined

export function isoDi(v: ValoreData): string | null {
  if (v == null) return null
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : chiaveLocale(v)
  return v === '' ? null : v
}

function dataDi(v: ValoreData): Date | null {
  if (v == null || v === '') return null
  const d = v instanceof Date ? v : new Date(v.length === 10 ? `${v}T00:00:00` : v)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatDateIt(valore: ValoreData): string {
  const iso = isoDi(valore)
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

export function formatDateItCorta(valore: ValoreData, oggi = new Date()): string {
  const iso = isoDi(valore)
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  if (!y || !m || !d) return iso
  return Number(y) === oggi.getFullYear() ? `${d}/${m}` : `${d}/${m}/${y}`
}

export function formatDataOraIt(valore: ValoreData, oggi = new Date()): string {
  if (valore == null || valore === '') return '—'
  const d = dataDi(valore)
  if (d == null) return String(valore)
  const tz = { timeZone: 'Europe/Rome' } as const
  const anno = Number(d.toLocaleDateString('en-US', { ...tz, year: 'numeric' }))
  const data =
    anno === oggi.getFullYear()
      ? d.toLocaleDateString(LOCALE, { ...tz, day: '2-digit', month: '2-digit' })
      : d.toLocaleDateString(LOCALE, { ...tz, day: '2-digit', month: '2-digit', year: 'numeric' })
  return `${data}, ${d.toLocaleTimeString(LOCALE, { ...tz, hour: '2-digit', minute: '2-digit' })}`
}

export function formatEtaIt(iso: string | null, oggi = new Date()): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const minuti = Math.floor((oggi.getTime() - d.getTime()) / 60_000)
  if (minuti < 1) return 'adesso'
  if (minuti < 60) return `da ${minuti} min`
  const ore = Math.floor(minuti / 60)
  if (ore < 24) return ore === 1 ? 'da 1 ora' : `da ${ore} ore`
  const giorni = Math.floor(ore / 24)
  if (giorni <= 7) return giorni === 1 ? 'da ieri' : `da ${giorni} giorni`
  return `dal ${formatDateItCorta(iso, oggi)}`
}

export function formatTempoCompattoIt(iso: string, oggi = new Date()): string {
  const min = Math.max(0, Math.round((oggi.getTime() - new Date(iso).getTime()) / 60000))
  if (min < 1) return 'ora'
  if (min < 60) return `${min}m`
  const ore = Math.round(min / 60)
  if (ore < 24) return `${ore}h`
  const giorni = Math.round(ore / 24)
  if (giorni < 14) return `${giorni}g`
  return `${Math.round(giorni / 7)}sett`
}

export function formatDueDate(dateKey: string): string {
  const today = todayKey()
  if (dateKey === today) return 'Oggi'
  const d = new Date(`${dateKey}T00:00:00`)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (dateKey === chiaveLocale(tomorrow)) return 'Domani'
  return d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' })
}

export function formatGiornoMeseIt(
  valore: ValoreData,
  opzioni: { anno?: 'sempre' | 'fuori' } = {},
  oggi = new Date()
): string {
  const d = dataDi(valore)
  if (d == null) return valore == null || valore === '' ? '—' : String(valore)
  const conAnno =
    opzioni.anno === 'sempre' ||
    (opzioni.anno !== 'fuori' && d.getFullYear() !== oggi.getFullYear()) ||
    (opzioni.anno === 'fuori' && d.getFullYear() !== oggi.getFullYear())
  return d.toLocaleDateString(
    LOCALE,
    conAnno ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' }
  )
}

export function formatMeseIt(valore: ValoreData): string {
  const d = dataDi(valore)
  if (d == null) return '—'
  return d.toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' })
}

export function formatDataIt(valore: ValoreData, opzioni: Intl.DateTimeFormatOptions): string {
  const d = dataDi(valore)
  if (d == null) return valore == null || valore === '' ? '—' : String(valore)
  return d.toLocaleString(LOCALE, opzioni)
}

export function formatGiornoRomaIt(valore: ValoreData): string {
  return formatDataIt(valore, { timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatOraIt(valore: ValoreData): string {
  const d = dataDi(valore)
  if (d == null) return '—'
  return d.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' })
}
