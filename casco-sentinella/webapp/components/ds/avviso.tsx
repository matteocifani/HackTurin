/** Inline notice with a tone (info, warning, destructive, success). Part of the IAMAimpresa design system. */
import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

export type TonoAvviso = 'info' | 'warning' | 'destructive' | 'success'

const PELLE: Record<TonoAvviso, string> = {
  info: 'border-info/40 bg-info/5',
  warning: 'border-warning/40 bg-warning/5',
  destructive: 'border-destructive/40 bg-destructive/5',
  success: 'border-success/40 bg-success/5',
}

export function Avviso({ tono, className, ...props }: ComponentProps<'div'> & { tono: TonoAvviso }) {
  return <div {...props} className={cn('rounded-lg border', PELLE[tono], className)} />
}
