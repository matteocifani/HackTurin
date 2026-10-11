/** Read-only value rendered at the height of a control. Part of the IAMAimpresa design system. */
import type { ReactNode } from 'react'
import { LockIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

const TAGLIA_CAMPO = {
  xs: { riquadro: 'h-(--control-h-xs) gap-1 px-2 text-xs', lucchetto: 'size-3' },
  sm: { riquadro: 'h-(--control-h-sm) gap-1.5 px-3 text-sm', lucchetto: 'size-3.5' },
  md: { riquadro: 'h-(--control-h) gap-2 px-3 text-sm', lucchetto: 'size-3.5' },
} as const

export function ValoreLetto({
  valore,
  attributo,
  title,
  variant = 'nudo',
  size = 'md',
}: {
  valore: ReactNode | null

  attributo?: string

  title?: string

  variant?: 'nudo' | 'campo'

  size?: 'xs' | 'sm' | 'md'
}) {
  const vuoto = valore == null
  const parola = typeof valore === 'string' || typeof valore === 'number'
  const contenuto = vuoto ? (
    <span className='truncate'>—</span>
  ) : parola ? (
    <span className='truncate'>{valore}</span>
  ) : (
    valore
  )

  if (variant === 'campo') {
    const taglia = TAGLIA_CAMPO[size]
    return (
      <div
        className={cn(
          'border-input bg-muted flex min-w-0 items-center rounded-md border',
          taglia.riquadro,
          vuoto ? 'text-muted-foreground' : 'text-foreground-secondary'
        )}
        title={title}
        aria-disabled='true'
        data-sola-lettura={attributo ?? ''}
        data-variant='campo'
        data-size={size}
      >
        <span className='flex min-w-0 flex-1 items-center gap-1.5'>{contenuto}</span>
        <LockIcon aria-hidden className={cn('text-muted-foreground shrink-0', taglia.lucchetto)} />
      </div>
    )
  }

  return (
    <div
      className={cn('flex h-(--control-h) min-w-0 items-center text-sm', vuoto && 'text-muted-foreground')}
      title={title}
      data-sola-lettura={attributo ?? ''}
    >
      {contenuto}
    </div>
  )
}
