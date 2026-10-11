/** Card, tooltip, legend pill and shared constants for recharts charts. Part of the IAMAimpresa design system. */
'use client'

import { useId, type ReactNode } from 'react'

import { TITOLO_CARTA } from '@/components/ds/section-card'
import { Card, CardContent } from '@/components/ui/card'
import { POPOVER_SURFACE } from '@/components/ui/popover'
import { CARTA, RILIEVO, SPESSORE, TRATTO } from '@/lib/grafici-geometria'
import { cn } from '@/lib/utils'

export { COLONNA_GAP, COLONNA_MAX, SPESSORE, TRATTO } from '@/lib/grafici-geometria'

export const CHART_GRID = { stroke: 'var(--chart-grid)', vertical: false } as const
export const CHART_AXIS_TICK = { fontSize: 11, fill: 'var(--chart-axis)' } as const
export const CHART_CURSOR = { stroke: 'var(--chart-context)' } as const
export const CHART_ACTIVE_DOT = { r: RILIEVO.raggio, strokeWidth: RILIEVO.alone, stroke: CARTA } as const

export function ChartCard({
  title,
  sottotitolo,
  legend,
  children,
  className,
}: {
  title: string

  sottotitolo?: string

  legend?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Card className={cn('min-w-0 gap-0 py-4', className)}>
      <CardContent className='flex h-full flex-col gap-3 px-4'>
        <div
          className={cn('flex flex-wrap justify-between gap-2', sottotitolo ? 'items-start' : 'items-center')}
        >
          {sottotitolo ? (
            <div className='flex min-w-0 flex-col gap-0.5'>
              <p className={cn(TITOLO_CARTA, 'min-w-0 truncate')} title={title}>
                {title}
              </p>
              <p className='text-muted-foreground text-xs'>{sottotitolo}</p>
            </div>
          ) : (
            <p className={cn(TITOLO_CARTA, 'min-w-0 truncate')} title={title}>
              {title}
            </p>
          )}

          {legend != null && (
            <div className='-m-1 flex min-w-0 flex-nowrap items-center gap-3 overflow-x-auto p-1 whitespace-nowrap *:shrink-0'>
              {legend}
            </div>
          )}
        </div>
        {children}
      </CardContent>
    </Card>
  )
}

export type FormaChiave =
  'barra' | 'pila' | 'area' | 'linea' | 'punto' | 'tratteggio' | 'puntini' | 'tacca' | 'manca'

const CHIAVE_W = 14
const CHIAVE_H = 10
const CHIAVE_BARRA_H = 8
const CHIAVE_FILO_TRATTEGGIO = 1.5
const CHIAVE_PUNTINI = '2 2'

export function LegendPill({
  className,
  colore,
  seconda,
  forma = 'barra',
  label,
}: {
  className?: string

  colore?: string

  seconda?: string
  forma?: FormaChiave
  label: string
}) {
  return (
    <span className='text-muted-foreground flex shrink-0 items-center gap-1.5 text-2xs whitespace-nowrap'>
      <ChiaveLegenda forma={forma} className={className} colore={colore} seconda={seconda} />
      {label}
    </span>
  )
}

function ChiaveLegenda({
  forma,
  className,
  colore,
  seconda,
}: {
  forma: FormaChiave
  className?: string
  colore?: string
  seconda?: string
}) {
  const id = useId()

  const slot = 'flex h-2.5 w-3.5 shrink-0 items-center justify-center'
  if (forma === 'barra')
    return <span aria-hidden className={cn('h-2 w-3.5 shrink-0', className ?? 'bg-chart-1')} />
  if (forma === 'pila')
    return (
      <span aria-hidden className={cn(slot, 'gap-0.5')}>
        <span className={cn('h-2 flex-1', className ?? 'bg-chart-slate-tint')} />
        <span className={cn('h-2 flex-1', seconda ?? 'bg-chart-ochre-tint')} />
      </span>
    )
  if (forma === 'linea')
    return (
      <span aria-hidden className={slot}>
        <span className={cn('h-0.5 w-full', className ?? 'bg-chart-1')} />
      </span>
    )
  if (forma === 'punto')
    return (
      <span aria-hidden className={slot}>
        <span className={cn('ring-card size-1.75 rounded-full ring-2', className ?? 'bg-chart-1')} />
      </span>
    )
  if (forma === 'tacca')
    return (
      <span aria-hidden className={slot}>
        <span className={cn('h-2.5 w-px', className ?? 'bg-chart-reference')} />
      </span>
    )

  const meta = CHIAVE_H / 2
  return (
    <svg
      aria-hidden
      width={CHIAVE_W}
      height={CHIAVE_H}
      viewBox={`0 0 ${CHIAVE_W} ${CHIAVE_H}`}
      className={cn(
        'shrink-0',
        forma === 'tratteggio'
          ? (colore ?? 'text-chart-reference')
          : forma === 'manca'
            ? undefined
            : (colore ?? 'text-chart-1')
      )}
    >
      {forma === 'area' && (
        <>
          <defs>
            <linearGradient id={id} x1='0' y1='0' x2='0' y2='1'>
              <stop offset='0' stopColor='currentColor' stopOpacity={0.16} />
              <stop offset='1' stopColor='currentColor' stopOpacity={0} />
            </linearGradient>
          </defs>
          <rect x={0} y={1} width={CHIAVE_W} height={CHIAVE_H - 1} fill={`url(#${id})`} />
          <line x1={0} y1={1} x2={CHIAVE_W} y2={1} stroke='currentColor' strokeWidth={SPESSORE.fuoco} />
        </>
      )}
      {forma === 'tratteggio' && (
        <line
          x1={0}
          y1={meta}
          x2={CHIAVE_W}
          y2={meta}
          stroke='currentColor'
          strokeWidth={CHIAVE_FILO_TRATTEGGIO}
          strokeDasharray={TRATTO.riferimento}
        />
      )}
      {forma === 'puntini' && (
        <line
          x1={0}
          y1={meta}
          x2={CHIAVE_W}
          y2={meta}
          stroke='currentColor'
          strokeWidth={SPESSORE.fuoco}
          strokeDasharray={CHIAVE_PUNTINI}
        />
      )}

      {forma === 'manca' && (
        <>
          <rect
            x={0}
            y={(CHIAVE_H - CHIAVE_BARRA_H) / 2}
            width={CHIAVE_W}
            height={CHIAVE_BARRA_H}
            className='fill-chart-alert-tint'
          />
          <rect
            x={0.5}
            y={(CHIAVE_H - CHIAVE_BARRA_H) / 2 + 0.5}
            width={CHIAVE_W - 1}
            height={CHIAVE_BARRA_H - 1}
            fill='none'
            strokeWidth={1}
            strokeDasharray={TRATTO.manca}
            className='stroke-chart-alert'
          />
        </>
      )}
    </svg>
  )
}

export function NoData({ children = 'Nessun dato nel periodo' }: { children?: ReactNode }) {
  return (
    <p className='text-muted-foreground flex flex-1 items-center justify-center py-10 text-center text-sm'>
      {children}
    </p>
  )
}

type TipEntry = { name?: string; value?: number | string; color?: string }

export function ChartTip({
  active,
  payload,
  label,
  heading,
  format,
  children,
}: {
  active?: boolean
  payload?: TipEntry[]
  label?: string

  heading?: (label: string) => string

  format?: (value: number | string, name?: string) => string

  children?: ReactNode
}) {
  if (!active) return null
  const shell = (inner: ReactNode) => (
    <div className={cn(POPOVER_SURFACE, 'px-2.5 py-1.5 text-xs')}>{inner}</div>
  )
  if (children != null) return shell(children)
  if (payload == null || payload.length === 0) return null
  return shell(
    <>
      {label != null && <p className='text-muted-foreground mb-1'>{heading ? heading(label) : label}</p>}
      {payload.map(entry => (
        <p key={entry.name} className='flex items-center gap-1.5'>
          <span aria-hidden className='size-2 shrink-0' style={{ background: entry.color }} />
          {entry.name}:{' '}
          <span className='font-medium tabular-nums'>
            {format && entry.value != null ? format(entry.value, entry.name) : entry.value}
          </span>
        </p>
      ))}
    </>
  )
}
