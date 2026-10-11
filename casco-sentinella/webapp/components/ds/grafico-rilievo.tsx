/** Highlighted point on a recharts chart. Part of the IAMAimpresa design system. */
'use client'

import { ReferenceDot } from 'recharts'

import { CARTA, RILIEVO } from '@/lib/grafici-geometria'

const ETICHETTA_PX = 11
const ETICHETTA_STACCO = 6

export function Rilievo({
  x,
  y,
  colore = 'var(--chart-1)',
  secondaria = false,
  etichetta,
  posizione = 'right',
  xAxisId,
  yAxisId,
}: {
  x: number | string

  y: number

  colore?: string

  secondaria?: boolean

  etichetta?: string | number
  posizione?: 'right' | 'left' | 'top' | 'bottom'
  xAxisId?: string | number
  yAxisId?: string | number
}) {
  return (
    <ReferenceDot
      x={x}
      y={y}
      xAxisId={xAxisId}
      yAxisId={yAxisId}
      r={secondaria ? RILIEVO.raggioSecondaria : RILIEVO.raggio}
      fill={colore}
      stroke={CARTA}
      strokeWidth={RILIEVO.alone}

      ifOverflow='visible'
      label={
        etichetta == null
          ? false
          : {
              value: etichetta,
              position: posizione,
              offset: ETICHETTA_STACCO,
              fill: colore,
              fontSize: ETICHETTA_PX,
              fontWeight: secondaria ? 400 : 500,
              className: 'tabular-nums',
            }
      }
    />
  )
}
