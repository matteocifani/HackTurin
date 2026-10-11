/** Chat message bubble for a user or an assistant turn, with pending and error states. Part of the IAMAimpresa design system. */
'use client'

import type { ReactNode } from 'react'

import { LockIcon } from 'lucide-react'

import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

export const CORNICE_STATO = 'bg-muted/40 rounded-lg border'
export const CORNICE_NOTA = 'border-warning/40 bg-warning/5'

export function Bubble({
  lato,
  tono = 'messaggio',
  avatar,
  firma,
  marcatore,
  inInvio = false,
  children,
}: {
  lato: 'richiedente' | 'staff'

  tono?: 'messaggio' | 'nota'

  avatar: ReactNode

  firma: string

  marcatore?: ReactNode

  inInvio?: boolean
  children: ReactNode
}) {
  const staff = lato === 'staff'
  const nota = tono === 'nota'
  return (
    <div
      className={cn(
        'flex items-start gap-2',
        staff && 'flex-row-reverse',
        inInvio && 'opacity-70 transition-opacity motion-reduce:transition-none'
      )}
      aria-busy={inInvio || undefined}
    >
      {avatar}
      <div className={cn('min-w-0 max-w-[85%] space-y-1', staff && 'flex flex-col items-end')}>
        <div
          className={cn(
            'rounded-lg border px-3 py-2 text-sm',
            nota ? CORNICE_NOTA : staff ? 'bg-card' : 'bg-muted'
          )}
        >
          {children}
        </div>
        <p className={cn('text-muted-foreground text-xs', staff && 'text-end')}>
          {nota && (
            <span className='text-warning me-1.5 inline-flex items-center gap-1 font-medium'>
              <LockIcon className='size-3' aria-hidden />
              Nota interna
            </span>
          )}
          {firma}
          {inInvio && (
            <span className='ms-1.5 inline-flex items-center gap-1'>
              <Spinner className='size-3 motion-reduce:animate-none' aria-label='Invio in corso' />
              invio…
            </span>
          )}
          {marcatore}
        </p>
      </div>
    </div>
  )
}
