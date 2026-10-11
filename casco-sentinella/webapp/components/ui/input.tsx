/** shadcn/ui Input primitive on the IAMAimpresa tokens. Part of the IAMAimpresa design system. */
'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

const ALTEZZA = {
  sm: 'h-(--control-h-sm)',
  default: 'h-(--control-h)',
  lg: 'h-(--control-h-lg)',
} as const

const SUPERFICIE = {
  default: 'bg-(--surface-command)',
  piatta: 'bg-transparent',
} as const

function numerico(type: string | undefined, inputMode: string | undefined) {
  return type === 'number' || inputMode === 'decimal' || inputMode === 'numeric'
}

function Input({
  className,
  type,
  size = 'default',
  variant = 'default',
  onFocus,
  ...props
}: Omit<React.ComponentProps<'input'>, 'size'> & {
  size?: keyof typeof ALTEZZA

  variant?: keyof typeof SUPERFICIE
}) {
  const alFuoco: React.FocusEventHandler<HTMLInputElement> | undefined = numerico(type, props.inputMode)
    ? e => {
        const campo = e.currentTarget
        requestAnimationFrame(() => {
          if (campo.ownerDocument.activeElement === campo) campo.select()
        })
        onFocus?.(e)
      }
    : onFocus
  return (
    <input
      type={type}
      data-slot='input'
      data-size={size}
      data-variant={variant}
      className={cn(
        'w-full min-w-0 rounded-md border border-input px-3 py-1 text-base transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        SUPERFICIE[variant],
        ALTEZZA[size],
        'max-md:!text-base max-md:placeholder:text-sm',
        'focus-visible:border-ring focus-visible:ring-(length:--focus-ring-width) focus-visible:ring-ring/50',
        'aria-invalid:border-destructive aria-invalid:ring-(--ring-destructive)',
        className
      )}
      {...props}
      onFocus={alFuoco}
    />
  )
}

export { Input }
