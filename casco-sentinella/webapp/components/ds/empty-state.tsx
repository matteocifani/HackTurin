/** The empty state of a view, large or compact. Part of the IAMAimpresa design system. */
'use client'

import type { ComponentType, ReactNode } from 'react'

import { cn } from '@/lib/utils'

type Grande = {
  compatto?: false
  icon?: ComponentType<{ className?: string }>
  title?: string
  description?: string
  action?: ReactNode
  className?: string

  cornice?: boolean
  testo?: never
  come?: never
}

type Compatto = {
  compatto: true

  testo?: ReactNode

  title?: string

  come?: 'p' | 'li' | 'div'
  className?: string
  icon?: never
  description?: never
  action?: never
  cornice?: never
}

type EmptyStateProps = Grande | Compatto

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compatto = false,
  testo,
  come = 'p',
  cornice = true,
}: EmptyStateProps) {
  if (compatto) {
    const Tag = come
    return (
      <Tag role='status' className={cn('text-muted-foreground text-sm', className)}>
        {testo ?? title}
      </Tag>
    )
  }
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-1.5 px-6 py-16 text-center',
        cornice && 'rounded-lg border border-dashed',
        className
      )}
    >
      {Icon != null && (
        <div className='bg-muted text-muted-foreground mb-2 flex size-11 items-center justify-center rounded-full'>
          <Icon className='size-5' />
        </div>
      )}
      <p className='font-semibold'>{title}</p>
      {description != null && description !== '' && (
        <p className='text-muted-foreground max-w-sm text-sm'>{description}</p>
      )}
      {action && <div className='mt-3'>{action}</div>}
    </div>
  )
}
