/** Titled card for a block of content, plus the shared text classes. Part of the IAMAimpresa design system. */
'use client'

import type { ReactNode } from 'react'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export const TITOLO_CARTA = 'text-foreground text-base leading-snug font-semibold'

export const CAPITOLO = 'text-foreground text-base leading-snug font-semibold'

export const EYEBROW = 'text-foreground text-base leading-snug font-semibold'

export const EYEBROW_MICRO = 'text-foreground text-xs font-semibold'

export const FIELD = 'h-(--control-h-sm) text-sm'

export function SectionCard({
  title,
  info,
  action,
  appiattita = true,
  colonna = false,
  className,
  children,
}: {
  title?: string

  info?: ReactNode
  action?: ReactNode

  appiattita?: boolean

  colonna?: boolean

  className?: string
  children: ReactNode
}) {
  const occhiello =
    title == null ? null : info ? (
      <p className={cn(TITOLO_CARTA, 'flex items-center gap-1')}>
        {title}
        {info}
      </p>
    ) : (
      <p className={TITOLO_CARTA}>{title}</p>
    )

  return (
    <Card
      data-section-card=''
      className={cn(
        'gap-0 py-4',

        appiattita && 'max-sm:rounded-none max-sm:border-0 max-sm:bg-transparent max-sm:shadow-none',
        appiattita && 'max-sm:[[data-section-card]+&]:border-t',
        colonna && 'flex flex-col',
        className
      )}
    >
      <CardContent className={cn('space-y-4 px-4', colonna && 'flex flex-1 flex-col')}>
        {action ? (
          <div
            className={cn(
              'flex flex-wrap items-center gap-2',
              occhiello != null ? 'justify-between' : 'justify-end'
            )}
          >
            {occhiello}
            {action}
          </div>
        ) : (
          occhiello
        )}
        {children}
      </CardContent>
    </Card>
  )
}
