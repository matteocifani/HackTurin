/** Status with a tone, as a badge, a flat label or a dot. Part of the IAMAimpresa design system. */
import type { ComponentType, ReactNode } from 'react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type StatusTone = 'success' | 'warning' | 'info' | 'destructive' | 'muted'

export const STATUS_SURFACE: Record<StatusTone, string> = {
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  info: 'bg-info/10 text-info',
  destructive: 'bg-destructive/10 text-destructive',
  muted: 'bg-muted text-foreground-secondary',
}

export const STATUS_BORDER: Record<StatusTone, string> = {
  success: 'border-success/25',
  warning: 'border-warning/25',
  info: 'border-info/25',
  destructive: 'border-destructive/25',
  muted: 'border-border',
}

export const STATUS_TEXT: Record<StatusTone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  info: 'text-info',
  destructive: 'text-destructive',
  muted: 'text-muted-foreground',
}

const SIZE_MD = 'gap-1.5 px-2.5 py-1'

export function StatusBadge({
  tone,
  icon: Icon,
  dot = false,
  variant = 'badge',
  size,
  title,
  'aria-label': ariaLabel,
  className,
  children,
}: {
  tone: StatusTone

  icon?: ComponentType<{ className?: string }>

  dot?: boolean

  variant?: 'piatta' | 'bordata' | 'badge'

  size?: 'sm' | 'md'
  title?: string
  'aria-label'?: string
  className?: string
  children: ReactNode
}) {
  const posa = size ?? (variant === 'piatta' ? 'md' : 'sm')

  const iconClass =
    variant === 'piatta'
      ? posa === 'md'
        ? 'size-4 shrink-0'
        : 'size-3.5 shrink-0'
      : posa === 'md'
        ? 'size-3.5 shrink-0'
        : 'size-3 shrink-0'
  const inner = (
    <>
      {dot && <span aria-hidden className='size-1.5 shrink-0 rounded-full bg-current' />}
      {Icon != null && <Icon className={iconClass} aria-hidden />}
      {children}
    </>
  )

  if (variant === 'piatta') {
    return (
      <span
        title={title}
        aria-label={ariaLabel}
        className={cn(
          'inline-flex items-center',
          posa === 'md' ? 'gap-1.5 text-sm' : 'gap-1 text-xs',
          STATUS_TEXT[tone],
          className
        )}
      >
        {inner}
      </span>
    )
  }

  return (
    <Badge
      variant='secondary'
      title={title}
      aria-label={ariaLabel}
      className={cn(
        variant === 'bordata' ? STATUS_BORDER[tone] : 'border-none',
        STATUS_SURFACE[tone],
        posa === 'md' && SIZE_MD,
        className
      )}
    >
      {inner}
    </Badge>
  )
}
