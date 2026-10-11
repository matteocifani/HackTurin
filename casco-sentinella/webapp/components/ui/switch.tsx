/** shadcn/ui Switch primitive on the IAMAimpresa tokens. Part of the IAMAimpresa design system. */
import * as React from 'react'
import { Switch as SwitchPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

function Switch({
  className,
  size = 'default',
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: 'sm' | 'default'
}) {
  return (
    <SwitchPrimitive.Root
      data-slot='switch'
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent max-md:after:absolute max-md:after:-inset-y-3 max-md:after:inset-x-0 max-md:after:content-[''] transition-[background-color,border-color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-(length:--focus-ring-width) focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-[1.15rem] data-[size=default]:w-8 data-[size=sm]:h-3.5 data-[size=sm]:w-6 data-[state=checked]:bg-foreground data-[state=unchecked]:bg-(--surface-switch-off)",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot='switch-thumb'
        className={cn(
          'pointer-events-none block rounded-full ring-0 transition-transform group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3 data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0 data-[state=checked]:bg-background data-[state=unchecked]:bg-(--surface-switch-thumb-off)'
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
