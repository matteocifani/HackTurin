/** Bar of actions for the selected rows of a list. Part of the IAMAimpresa design system. */
'use client'

import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type BulkActionBarProps = {
  count: number

  noun: string

  children: ReactNode
  onClear: () => void
  className?: string
}

export function BulkActionBar({ count, noun, children, onClear, className }: BulkActionBarProps) {
  if (count === 0) return null

  return (
    <div
      className={cn(
        'bg-card animate-in fade-in-0 slide-in-from-top-1 sticky top-16 z-(--z-sticky) flex flex-wrap items-center gap-2 rounded-lg border p-2 shadow-xs duration-(--duration-fast) motion-reduce:animate-none',
        className
      )}
    >
      <span className='ps-1 text-sm font-medium tabular-nums'>
        {count} {noun}
      </span>
      {children}

      <Button variant='ghost' size='sm' className='ms-auto' onClick={onClear}>
        Annulla
      </Button>
    </div>
  )
}
