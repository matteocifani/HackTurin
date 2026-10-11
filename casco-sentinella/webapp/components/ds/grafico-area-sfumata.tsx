/** Area with a vertical gradient for recharts. Part of the IAMAimpresa design system. */
'use client'

import { useId, type ComponentProps } from 'react'

import { Area } from 'recharts'

import { CARTA, RILIEVO, SFUMATURA, SPESSORE } from '@/lib/grafici-geometria'

type AreaProps = ComponentProps<typeof Area>

export function AreaSfumata({
  id,
  colore = 'var(--chart-1)',
  top,
  bottom,
  ...props
}: Omit<AreaProps, 'id' | 'fill' | 'stroke'> & {
  id?: string

  colore?: string

  top?: number
  bottom?: number
}) {
  const proprio = useId()
  const gradiente = id ?? `sfumatura-${proprio}`
  const spazio = top != null && bottom != null
  return (
    <>
      <defs>
        <linearGradient
          id={gradiente}
          x1={0}
          x2={0}
          y1={spazio ? top : 0}
          y2={spazio ? bottom : 1}
          gradientUnits={spazio ? 'userSpaceOnUse' : 'objectBoundingBox'}
        >
          <stop offset='0' stopColor={colore} stopOpacity={SFUMATURA.alto} />
          <stop offset='1' stopColor={colore} stopOpacity={SFUMATURA.base} />
        </linearGradient>
      </defs>
      <Area
        type='monotone'
        strokeWidth={SPESSORE.serie}
        strokeLinecap='round'
        strokeLinejoin='round'
        fillOpacity={1}

        dot={false}
        activeDot={{ r: RILIEVO.raggio, strokeWidth: RILIEVO.alone, stroke: CARTA, fill: colore }}
        {...props}
        stroke={colore}
        fill={`url(#${gradiente})`}
      />
    </>
  )
}
