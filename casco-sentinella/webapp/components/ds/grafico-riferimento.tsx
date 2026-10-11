/** Reference line with the system stroke for recharts. Part of the IAMAimpresa design system. */
'use client'

import type { ComponentProps } from 'react'

import { ReferenceLine } from 'recharts'

import { SPESSORE, TRATTO } from '@/lib/grafici-geometria'

const NOME_PX = 11
const NOME_STACCO = 6

type ReferenceLineProps = ComponentProps<typeof ReferenceLine>

export function Riferimento({
  nome,
  posizione = 'right',
  ...props
}: Omit<ReferenceLineProps, 'stroke' | 'strokeDasharray' | 'strokeWidth' | 'label'> & {
  nome?: string
  posizione?:
    | 'right'
    | 'left'
    | 'top'
    | 'bottom'
    | 'insideTopRight'
    | 'insideTopLeft'
    | 'insideBottomRight'
    | 'insideBottomLeft'
}) {
  return (
    <ReferenceLine
      {...props}
      stroke='var(--chart-reference)'
      strokeDasharray={TRATTO.riferimento}
      strokeWidth={SPESSORE.riferimento}
      label={
        nome == null
          ? undefined
          : {
              value: nome,
              position: posizione,
              offset: NOME_STACCO,
              fill: 'var(--chart-reference)',
              fontSize: NOME_PX,
            }
      }
    />
  )
}
