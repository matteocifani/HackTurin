/** A value against a target, as a labelled bar. Part of the IAMAimpresa design system. */
'use client'

import { useEffect, useState, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

function useMounted(): boolean {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(raf)
  }, [])
  return mounted
}

export type MeterSegment = {
  className: string

  pct?: number

  grow?: boolean

  title?: string
}

const ALTEZZA = {
  xs: 'h-1',
  sm: 'h-1',
  md: 'h-2',

  lg: 'h-2',
} as const

const TACCA = {
  xs: 'h-2.5',
  sm: 'h-2.5',
  md: 'h-3',
  lg: 'h-3',
} as const

export function MeterRow({
  icon,
  label,
  labelClassName = 'w-28',
  value,
  valueClassName = 'w-7 text-sm font-medium',
  pct,
  fillClassName,
  passo,
  passoTitle,
  segments,
  height = 'md',
  track = 'muted',
  minPct = 2,
  delayMs = 0,
  animate = true,
  onClick,
  active = false,
  dimmed = false,
  title,
  className,
  barClassName,
}: {
  icon?: ReactNode
  label: ReactNode

  labelClassName?: string

  value?: ReactNode
  valueClassName?: string

  pct: number

  fillClassName?: string

  passo?: number

  passoTitle?: string

  segments?: MeterSegment[]
  height?: keyof typeof ALTEZZA

  track?: 'muted' | 'none'

  minPct?: number

  delayMs?: number
  animate?: boolean

  onClick?: () => void
  active?: boolean
  dimmed?: boolean
  title?: string
  className?: string

  barClassName?: string
}) {
  const mounted = useMounted()

  const shown = pct <= 0 ? 0 : Math.min(100, Math.max(pct, minPct))
  const width = animate && !mounted ? 0 : shown

  const tacca = passo == null || !Number.isFinite(passo) ? null : Math.min(100, Math.max(0, passo))
  const sotto = tacca != null && pct < tacca
  const riempimento =
    tacca == null ? (fillClassName ?? 'bg-chart-1') : sotto ? 'bg-chart-alert' : 'bg-chart-1'
  const testoTacca = tacca == null ? undefined : (passoTitle ?? `Atteso a oggi: ${Math.round(tacca)}%`)

  const pezzi = segments?.filter(s => s.grow || (s.pct ?? 0) > 0)

  const bar = (
    <span
      className={cn(
        'relative flex-1',
        ALTEZZA[height],
        track === 'muted' && 'bg-chart-context',
        barClassName
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute inset-y-0 start-0 overflow-hidden transition-[width] duration-(--duration-slow) ease-out motion-reduce:transition-none',

          pezzi ? 'bg-card flex gap-0.5' : riempimento
        )}
        style={{ width: `${width}%`, transitionDelay: delayMs > 0 ? `${delayMs}ms` : undefined }}
      >
        {pezzi?.map((s, i) =>
          s.grow ? (
            <span key={i} className={cn('h-full flex-1', s.className)} title={s.title} />
          ) : (
            <span
              key={i}
              className={cn('h-full', s.className)}
              style={{ width: `${s.pct ?? 0}%` }}
              title={s.title}
            />
          )
        )}
      </span>
      {tacca != null && (
        <span
          data-passo={tacca}
          title={testoTacca}
          className={cn(
            'before:border-chart-reference absolute top-1/2 w-2 -translate-x-1/2 -translate-y-1/2 before:absolute before:inset-y-0 before:start-1/2 before:border-l',
            TACCA[height]
          )}
          style={{ insetInlineStart: `min(${tacca}%, calc(100% - 1px))` }}
        />
      )}
      {testoTacca != null && <span className='sr-only'>{testoTacca}</span>}
    </span>
  )

  const contenuto = (
    <>
      {icon}
      <span className={cn('shrink-0 truncate text-sm', labelClassName, active && 'font-medium')}>
        {label}
      </span>
      {bar}
      {value != null && (
        <span
          className={cn('shrink-0 text-end tabular-nums', valueClassName, sotto && 'text-chart-alert')}
          data-sotto-passo={sotto || undefined}
        >
          {value}
        </span>
      )}
    </>
  )

  if (onClick) {
    return (
      <button
        type='button'
        aria-pressed={active}
        title={title}
        onClick={onClick}
        className={cn(
          'hover:bg-accent focus-visible:ring-ring flex w-full items-center gap-2.5 rounded-md px-1.5 py-1 text-start transition-opacity outline-none focus-visible:ring-2',
          dimmed && 'opacity-50 hover:opacity-100',
          className
        )}
      >
        {contenuto}
      </button>
    )
  }

  return (
    <div title={title} className={cn('flex items-center gap-2.5', className)}>
      {contenuto}
    </div>
  )
}
