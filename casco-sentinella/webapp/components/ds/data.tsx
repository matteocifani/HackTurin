/** A date rendered in one of the shared Italian formats inside a <time> element. Part of the IAMAimpresa design system. */
import type { ComponentProps } from 'react'

import {
  formatDataOraIt,
  formatDateIt,
  formatDateItCorta,
  formatEtaIt,
  formatGiornoMeseIt,
  formatMeseIt,
  formatTempoCompattoIt,
  isoDi,
  type ValoreData,
} from '@/lib/format-date'
import { cn } from '@/lib/utils'

export type FormaData = 'intera' | 'corta' | 'giornoMese' | 'mese' | 'ora' | 'eta' | 'compatta'

const FORME: Record<FormaData, (v: ValoreData) => string> = {
  intera: v => formatDateIt(v),
  corta: v => formatDateItCorta(v),
  giornoMese: v => formatGiornoMeseIt(v),
  mese: v => formatMeseIt(v),
  ora: v => formatDataOraIt(v),
  eta: v => formatEtaIt(isoDi(v)),
  compatta: v => (isoDi(v) == null ? '—' : formatTempoCompattoIt(isoDi(v) as string)),
}

const CON_TITOLO: ReadonlySet<FormaData> = new Set(['corta', 'giornoMese', 'eta', 'compatta'])

export function Data({
  valore,
  forma = 'intera',
  className,
  ...props
}: { valore: ValoreData; forma?: FormaData } & Omit<ComponentProps<'time'>, 'dateTime' | 'children'>) {
  const iso = isoDi(valore)
  if (iso == null) return <span className={cn('text-muted-foreground', className)}>—</span>
  return (
    <time
      dateTime={iso}
      title={CON_TITOLO.has(forma) ? formatDataOraIt(iso) : undefined}
      className={cn('tabular-nums', className)}
      {...props}
    >
      {FORME[forma](valore)}
    </time>
  )
}
