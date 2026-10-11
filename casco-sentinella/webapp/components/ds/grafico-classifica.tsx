/** Ranking bars with optional share of total. Part of the IAMAimpresa design system. */
import type { ReactNode } from 'react'

import { numeroIt, quotaIt } from '@/lib/format-number'
import { cn } from '@/lib/utils'

export type VoceClassifica = {
  nome: string
  valore: number

  testo?: ReactNode
}

export function Classifica({
  voci,
  massimo,
  nomeAltri = n => `Altri, ${n}`,
  formato = numeroIt,
  conQuota = true,
  larghezzaNome = 'w-26',
  larghezzaValore = 'w-16',
  className,
}: {
  voci: readonly VoceClassifica[]

  massimo?: number
  nomeAltri?: (quante: number) => string

  formato?: (valore: number) => ReactNode

  conQuota?: boolean

  larghezzaNome?: string
  larghezzaValore?: string
  className?: string
}) {
  const taglia = massimo != null && voci.length > massimo
  const righe = [
    ...(taglia ? voci.slice(0, massimo) : voci).map(v => ({ ...v, altri: false })),
    ...(taglia
      ? [
          {
            nome: nomeAltri(voci.length - (massimo ?? 0)),
            valore: voci.slice(massimo).reduce((s, v) => s + Math.max(0, v.valore), 0),
            altri: true,
          },
        ]
      : []),
  ]
  const totale = righe.reduce((s, r) => s + Math.max(0, r.valore), 0)
  const cima = Math.max(0, ...righe.map(r => r.valore))

  return (
    <ul className={cn('flex flex-col gap-1.5', className)}>
      {righe.map((r, i) => (
        <li key={`${i}-${r.nome}`} className='flex items-center gap-2 text-sm whitespace-nowrap'>
          <span className={cn('shrink-0 truncate', larghezzaNome)} title={r.nome}>
            {r.nome}
          </span>
          <span aria-hidden className='h-2 min-w-0 flex-1'>
            {r.valore > 0 && cima > 0 && (
              <span
                className={cn('block h-2 min-w-0.5', r.altri ? 'bg-chart-context' : 'bg-chart-1')}
                style={{ width: `${(r.valore / cima) * 100}%` }}
              />
            )}
          </span>
          <span className={cn('shrink-0 text-end tabular-nums', larghezzaValore)}>
            {'testo' in r && r.testo != null ? r.testo : formato(r.valore)}
          </span>
          {conQuota && (
            <span className='text-muted-foreground w-10 shrink-0 text-end tabular-nums'>
              {quotaIt(Math.max(0, r.valore), totale)}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}
