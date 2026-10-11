/** Horizontal bar split into parts of a whole. Part of the IAMAimpresa design system. */
import type { ReactNode } from 'react'

import { numeroIt, quotaIt } from '@/lib/format-number'
import { cn } from '@/lib/utils'

export const PIGMENTI_BG = ['bg-chart-1', 'bg-chart-slate', 'bg-chart-ochre', 'bg-chart-plum'] as const

export const ALTRI_BG = 'bg-chart-context'

const NOMI_MAX = PIGMENTI_BG.length

export type Parte = {
  nome: string
  valore: number

  testo?: ReactNode
}

export function BarraParti({
  parti,
  formato = numeroIt,
  nomeAltri = n => `Altri, ${n}`,
  className,
}: {
  parti: readonly Parte[]

  formato?: (valore: number) => ReactNode

  nomeAltri?: (quante: number) => string
  className?: string
}) {
  const nominate = parti.length > NOMI_MAX ? parti.slice(0, NOMI_MAX) : parti
  const resto = parti.length > NOMI_MAX ? parti.slice(NOMI_MAX) : []
  const voci = [
    ...nominate.map((p, i) => ({ ...p, colore: PIGMENTI_BG[i] as string })),
    ...(resto.length
      ? [
          {
            nome: nomeAltri(resto.length),
            valore: resto.reduce((s, p) => s + Math.max(0, p.valore), 0),
            colore: ALTRI_BG,
          },
        ]
      : []),
  ]
  const totale = voci.reduce((s, v) => s + Math.max(0, v.valore), 0)

  return (
    <div className={cn('flex flex-col gap-3.5', className)}>
      <div aria-hidden className='flex h-2 gap-0.5'>
        {voci
          .filter(v => v.valore > 0)
          .map((v, i) => (
            <span
              key={`${i}-${v.nome}`}
              className={cn('h-2 min-w-0.5', v.colore)}
              style={{ flexGrow: v.valore, flexBasis: 0 }}
            />
          ))}
      </div>
      <ul className='flex flex-col gap-1.5'>
        {voci.map((v, i) => (
          <li key={`${i}-${v.nome}`} className='flex items-center gap-2 text-sm whitespace-nowrap'>
            <span aria-hidden className={cn('h-2 w-3.5 shrink-0', v.colore)} />
            <span className='min-w-0 flex-1 truncate' title={v.nome}>
              {v.nome}
            </span>
            <span className='shrink-0 tabular-nums'>
              {'testo' in v && v.testo != null ? v.testo : formato(v.valore)}
            </span>
            <span className='text-muted-foreground w-10 shrink-0 text-end tabular-nums'>
              {quotaIt(Math.max(0, v.valore), totale)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
