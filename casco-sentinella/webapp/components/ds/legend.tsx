/** Chart legend rows. Part of the IAMAimpresa design system. */
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export function Legend({ children }: { children: ReactNode }) {
  return <ul className='space-y-1.5'>{children}</ul>
}

export function LegendRow({
  swatch,
  fill,
  shape = 'bar',
  children,
}: {
  swatch: string

  fill?: boolean

  shape?: 'bar' | 'cell' | 'dashed' | 'line'
  children: ReactNode
}) {
  return (
    <li className='flex items-start gap-2'>
      {shape === 'bar' ? (
        <span aria-hidden className='mt-1.25 flex w-5 shrink-0 justify-center'>
          <span className='bg-card relative h-2 w-3.5 overflow-hidden'>
            <span className={cn('absolute inset-0', swatch)} />
            {fill && <span className='bg-foreground/25 absolute inset-y-0 start-0 w-1/2' />}
          </span>
        </span>
      ) : shape === 'dashed' ? (
        <span aria-hidden className='mt-0.5 flex w-5 shrink-0 justify-center'>
          <span className={cn('bg-card block size-4 border border-dashed', swatch)} />
        </span>
      ) : shape === 'line' ? (
        <span aria-hidden className='mt-0.5 flex w-5 shrink-0 justify-center'>
          <span className={cn('h-4 w-0.5', swatch)} />
        </span>
      ) : (
        <span
          aria-hidden
          className='bg-card border-border mt-0.5 block size-4 shrink-0 overflow-hidden border'
        >
          <span className={cn('relative block size-full', swatch)}>
            {fill && <span className='bg-foreground/25 absolute inset-y-0 start-0 w-1/2' />}
          </span>
        </span>
      )}
      <span className='min-w-0'>{children}</span>
    </li>
  )
}
