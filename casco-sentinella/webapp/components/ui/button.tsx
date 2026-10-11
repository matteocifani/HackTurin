/** shadcn/ui Button primitive on the IAMAimpresa tokens. Part of the IAMAimpresa design system. */
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-(length:--focus-ring-width) focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-(--ring-destructive) [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",

    "relative max-md:after:absolute max-md:after:-inset-y-1 max-md:after:inset-x-0 max-md:after:content-['']",

    '[&[data-attesa]>[data-slot=spinner]+svg]:hidden',
  ],
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive:
          'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-(--ring-destructive) dark:bg-destructive/60',
        outline:
          'border bg-(--surface-command) hover:bg-(--surface-outline-hover) hover:text-accent-foreground dark:border-input',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
        ghost: 'hover:bg-(--surface-ghost-hover) hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',

        aggiungi:
          'w-full border border-dashed text-muted-foreground hover:bg-(--surface-ghost-hover) hover:text-foreground',
      },

      size: {
        default: 'h-(--control-h) px-3 py-2 has-[>svg]:px-2.5',
        xs: "h-(--control-h-xs) gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: 'h-(--control-h-sm) gap-1.5 rounded-md px-2.5 has-[>svg]:px-2',
        lg: 'h-(--control-h-lg) rounded-md px-5 has-[>svg]:px-4',
        icon: 'size-(--control-h)',
        'icon-xs': "size-(--control-h-xs) rounded-md [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-(--control-h-sm)',
        'icon-lg': 'size-(--control-h-lg)',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  attesa = false,
  disabled,
  children,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean

    attesa?: boolean
  }) {
  const Comp = asChild ? Slot.Root : 'button'
  const piccolo = size === 'xs' || size === 'icon-xs'

  return (
    <Comp
      data-slot='button'
      data-variant={variant}
      data-size={size}
      data-attesa={attesa ? '' : undefined}
      aria-busy={attesa || undefined}
      disabled={disabled || attesa}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {attesa && !asChild ? (
        <>
          <Spinner
            data-slot='spinner'
            aria-hidden='true'
            aria-label={undefined}
            role={undefined}
            className={piccolo ? 'size-3' : undefined}
          />
          {children}
        </>
      ) : (
        children
      )}
    </Comp>
  )
}

export { Button, buttonVariants }
