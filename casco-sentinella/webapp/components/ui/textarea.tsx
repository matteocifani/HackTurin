/** shadcn/ui Textarea primitive on the IAMAimpresa tokens. Part of the IAMAimpresa design system. */
import * as React from 'react'

import { cn } from '@/lib/utils'

const SUPERFICIE = {
  default: 'bg-(--surface-command)',
  piatta: 'bg-transparent',
} as const

const MINIMO = {
  default: 'min-h-16 max-md:min-h-28',
  title: '',
} as const

function Textarea({
  className,
  size = 'default',
  variant = 'default',
  ...props
}: React.ComponentProps<'textarea'> & {
  size?: keyof typeof MINIMO

  variant?: keyof typeof SUPERFICIE
}) {
  return (
    <textarea
      data-slot='textarea'
      data-size={size}
      data-variant={variant}
      className={cn(
        'flex field-sizing-content w-full rounded-md border border-input px-3 py-2 text-base transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-(length:--focus-ring-width) focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-(--ring-destructive) md:text-sm',
        SUPERFICIE[variant],
        MINIMO[size],
        'max-md:!text-base max-md:placeholder:text-sm',
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
