/** Checkbox with select-all and shift-range selection helpers. Part of the IAMAimpresa design system. */
'use client'

import type { RefObject } from 'react'

import { Checkbox } from '@/components/ui/checkbox'

export function CasellaFascia({
  stato,
  inCorso,
  etichetta,
  className,
  onSeleziona,
}: {
  stato: boolean | 'indeterminate'
  inCorso?: boolean
  etichetta: string
  className?: string
  onSeleziona: (shift: boolean) => void
}) {
  return (
    <Checkbox
      className={className}
      checked={stato}
      disabled={inCorso}
      onClick={e => {
        e.preventDefault()
        onSeleziona(e.shiftKey)
      }}
      aria-label={etichetta}
    />
  )
}

export const statoCasella = (selezionate: number, totale: number): boolean | 'indeterminate' =>
  selezionate === 0 ? false : selezionate === totale ? true : 'indeterminate'

export function fascia<T>(
  ordine: T[],
  ancora: RefObject<T | null>,
  chiave: T,
  shift: boolean,
  gia: boolean,
  alterna: (k: T) => void,
  applica: (chiavi: T[], stato: boolean) => void
): void {
  const da = ancora.current
  if (!shift || da == null) {
    ancora.current = chiave
    alterna(chiave)
    return
  }
  const i = ordine.indexOf(da)
  const j = ordine.indexOf(chiave)
  if (i < 0 || j < 0) {
    alterna(chiave)
    return
  }
  const [a, b] = i < j ? [i, j] : [j, i]
  applica(ordine.slice(a, b + 1), !gia)
}
