/** Toggle chip, pressable or removable. Part of the IAMAimpresa design system. */
'use client'

import { XIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

type ChipPremibileProps = Omit<React.ComponentProps<'button'>, 'type' | 'aria-pressed'> & {
  acceso: boolean
}

type ChipRimovibileProps = {
  acceso: true

  onRimuovi: () => void

  etichettaRimuovi: string
  disabled?: boolean
  className?: string
  children: React.ReactNode
}

export function ChipInterruttore(props: ChipPremibileProps | ChipRimovibileProps) {
  if ('onRimuovi' in props) {
    const { onRimuovi, etichettaRimuovi, disabled, className, children } = props
    return (
      <span
        className={cn(
          'bg-foreground text-background border-foreground dark:bg-foreground dark:border-foreground inline-flex h-(--control-h-xs) items-center gap-1 rounded-md border px-2 text-xs font-medium whitespace-nowrap',
          className
        )}
      >
        {children}
        <button
          type='button'
          aria-label={etichettaRimuovi}
          onClick={onRimuovi}
          disabled={disabled}

          className='relative -me-0.5 ms-0.5 rounded-sm outline-none hover:opacity-70 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default max-md:after:absolute max-md:after:-inset-2.5 max-md:after:content-[""]'
        >
          <XIcon className='size-3' aria-hidden />
        </button>
      </span>
    )
  }

  const { acceso, className, children, ...resto } = props
  return (
    <button
      type='button'
      {...resto}
      aria-pressed={acceso}

      className={cn(
        'relative inline-flex h-(--control-h-xs) items-center gap-1 rounded-md border px-2 text-xs font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default max-md:after:absolute max-md:after:-inset-x-0.5 max-md:after:-inset-y-1.5 max-md:after:content-[""]',
        acceso
          ? 'bg-foreground text-background border-foreground dark:bg-foreground dark:border-foreground'
          : 'bg-card text-muted-foreground hover:text-foreground',
        className
      )}
    >
      {children}
    </button>
  )
}
