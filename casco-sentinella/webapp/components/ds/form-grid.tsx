/** Two-column form grid that collapses to one column on small screens. Part of the IAMAimpresa design system. */
import { type ReactNode } from 'react'

import { cn } from '@/lib/utils'

type FormGridProps = {
  cols?: 1 | 2 | 3
  className?: string
  children: ReactNode
}

export function FormGrid({ cols = 2, className, children }: FormGridProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-(--space-block)',
        cols === 1 ? undefined : cols === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3',
        className
      )}
    >
      {children}
    </div>
  )
}

export function FormGridFull({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('min-w-0 sm:col-span-full', className)}>{children}</div>
}
