/** Italian number formatting: integers, decimals, counts, percentages, shares. Part of the IAMAimpresa design system. */
import { LOCALE } from '@/lib/locale'

export type OpzioniNumero = {
  massimo?: number

  minimo?: number

  raggruppa?: boolean
}

export function numeroIt(n: number | null | undefined, opzioni: OpzioniNumero = {}): string {
  if (n == null || Number.isNaN(n)) return '—'
  return n.toLocaleString(LOCALE, {
    minimumFractionDigits: opzioni.minimo,
    maximumFractionDigits: opzioni.massimo,
    useGrouping: opzioni.raggruppa === true ? 'always' : undefined,
  })
}

export function decimaliIt(
  n: number | null | undefined,
  decimali: number,
  opzioni: Pick<OpzioniNumero, 'raggruppa'> = {}
): string {
  return numeroIt(n, { minimo: decimali, massimo: decimali, raggruppa: opzioni.raggruppa })
}

export function conteggioIt(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—'
  return n < 10_000 ? String(n) : numeroIt(n)
}

export function percentoIt(valore: number | null | undefined, decimali = 0): string {
  if (valore == null || Number.isNaN(valore)) return '—'
  return `${decimaliIt(valore, decimali)}%`
}

export function quotaIt(parte: number, totale: number, decimali = 0): string {
  if (!(totale > 0)) return '—'
  return percentoIt((parte / totale) * 100, decimali)
}
