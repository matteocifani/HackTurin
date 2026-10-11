/** KPI tile (optionally a filter handle) and the grid that lays tiles out. Part of the IAMAimpresa design system. */
'use client'

import type { ComponentType } from 'react'

import { InfoDot } from '@/components/ds/info-dot'
import { Card, CardContent } from '@/components/ui/card'
import { NumberTicker } from '@/components/ui/number-ticker'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export type KpiTone = 'default' | 'destructive' | 'warning' | 'success' | 'info'

export type KpiDeltaTone = 'positivo' | 'negativo' | 'neutro'

export const KPI_DELTA_TONE_CLASS: Record<KpiDeltaTone, string> = {
  positivo: 'text-success',
  negativo: 'text-destructive',
  neutro: 'text-muted-foreground',
}

export type KpiCardProps = {
  icon?: ComponentType<{ className?: string }>

  value?: number

  display?: string

  suffix?: string

  hint?: string

  nota?: string

  delta?: { testo: string; tono: KpiDeltaTone; titolo?: string }
  title: string

  peso?: 'normale' | 'media'
  tone?: KpiTone

  active?: boolean

  dimmed?: boolean
  onClick?: () => void

  hoverTitle?: string

  info?: string
}

function valueTone(tone: KpiTone, value: number): string {
  if (value <= 0) return ''
  if (tone === 'destructive') return 'text-destructive'
  if (tone === 'warning') return 'text-warning'
  return ''
}

const NUMERO = 'text-xl leading-6 font-medium tabular-nums'

export function KpiCard({
  value,
  display,
  suffix,
  hint,
  nota,
  delta,
  title,
  peso = 'normale',
  tone = 'default',
  active,
  dimmed,
  onClick,
  hoverTitle,
  info,
}: KpiCardProps) {
  const clickable = onClick != null
  const testoNota = nota ?? hint

  return (
    <Card
      {...(clickable
        ? {
            role: 'button' as const,
            tabIndex: 0,
            'aria-pressed': active,
            title: hoverTitle ?? (active ? 'Rimuovi il filtro' : 'Filtra'),
            onClick,
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            },
          }
        : {})}
      className={cn(
        'relative gap-0 py-3',

        'max-sm:rounded-none max-sm:border-0 max-sm:bg-transparent max-sm:py-2.5',

        clickable &&
          'cursor-pointer transition-[background-color,opacity] outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring',
        active && 'ring-2 ring-ring',

        active && 'max-sm:bg-selected max-sm:ring-0',
        dimmed && 'opacity-55 hover:opacity-100'
      )}
    >
      {info && (
        <InfoDot label={`Cosa contiene «${title}»`} className='absolute end-2 top-2'>
          {info}
        </InfoDot>
      )}

      <CardContent className='grid gap-y-0.5 px-4 max-sm:px-3'>
        <p
          className={cn(
            'text-foreground text-sm leading-4.5 max-sm:line-clamp-2 sm:truncate',
            peso === 'media' && 'font-medium',
            info && 'pe-5'
          )}
        >
          {title}
        </p>

        <div className='flex flex-wrap items-baseline gap-x-1.5'>
          <span className={cn('flex items-baseline gap-x-0.5', valueTone(tone, value ?? 0))}>
            {display != null ? (
              <span className={NUMERO}>{display}</span>
            ) : (
              <NumberTicker value={value ?? 0} className={NUMERO} />
            )}
            {suffix && <span className={NUMERO}>{suffix}</span>}
          </span>
          {delta && (
            <span
              className={cn(
                'text-sm font-medium whitespace-nowrap tabular-nums',
                KPI_DELTA_TONE_CLASS[delta.tono]
              )}
              title={delta.titolo}
            >
              {delta.testo}
            </span>
          )}
        </div>

        {testoNota ? (
          <p data-nota='' className='text-muted-foreground truncate text-xs leading-4'>
            {testoNota}
          </p>
        ) : (
          <span aria-hidden className='hidden min-h-4 group-has-[[data-nota]]/kpi:block' />
        )}
      </CardContent>
    </Card>
  )
}

export function KpiGrid({
  children,
  count = 4,
  contenitore = false,
}: {
  children: React.ReactNode
  count?: 3 | 4 | 5
  contenitore?: boolean
}) {
  const griglia = (
    <div
      className={cn(
        'group/kpi grid grid-cols-2 gap-3 sm:gap-4',

        contenitore
          ? count === 3
            ? '@[36rem]/kpi:grid-cols-3'
            : count === 5
              ? '@[36rem]/kpi:grid-cols-3 @[60rem]/kpi:grid-cols-5'
              : '@[48rem]/kpi:grid-cols-4'
          : count === 3
            ? 'lg:grid-cols-3'
            : count === 5
              ? 'lg:grid-cols-5'
              : 'lg:grid-cols-4',
        'max-sm:gap-0 max-sm:overflow-hidden max-sm:rounded-xl max-sm:border max-sm:bg-card',
        'max-sm:[&>*:nth-child(2n)]:border-s max-sm:[&>*:nth-child(n+3)]:border-t',

        count === 3 && 'max-sm:[&>*:nth-child(3)]:col-span-2',
        count === 5 && 'max-sm:[&>*:nth-child(5)]:col-span-2',
        'max-sm:[&>*]:border-border'
      )}
    >
      {children}
    </div>
  )

  return contenitore ? <div className='@container/kpi'>{griglia}</div> : griglia
}

export function KpiGridSkeleton({ count = 4 }: { count?: 3 | 4 | 5 }) {
  return (
    <KpiGrid count={count}>
      {Array.from({ length: count }).map((_, i) => (
        <Card
          key={i}
          className='gap-0 py-3 max-sm:rounded-none max-sm:border-0 max-sm:bg-transparent max-sm:py-2.5'
        >
          <CardContent className='grid gap-y-0.5 px-4 max-sm:px-3'>
            <div className='flex h-4.5 items-center'>
              <Skeleton className='h-3.5 w-24' />
            </div>
            <div className='flex h-6 items-center'>
              <Skeleton className='h-5 w-14' />
            </div>
          </CardContent>
        </Card>
      ))}
    </KpiGrid>
  )
}
