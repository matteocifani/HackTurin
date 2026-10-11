/** shadcn/ui Progress primitive on the IAMAimpresa tokens. Part of the IAMAimpresa design system. */
'use client'

import * as React from 'react'
import { Progress as ProgressPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

const RIEMPIMENTO = {
  'in-corso': 'bg-chart-1',
  finito: 'bg-chart-good',
  interrotto: 'bg-chart-alert',
} as const

function Progress({
  className,
  value,
  stato = 'in-corso',
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
  stato?: keyof typeof RIEMPIMENTO
}) {
  return (
    <ProgressPrimitive.Root
      data-slot='progress'
      data-stato={stato}
      className={cn('relative h-1 w-full overflow-hidden rounded-none bg-chart-context', className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot='progress-indicator'

        className={cn('h-full w-full flex-1 transition-transform', RIEMPIMENTO[stato])}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
