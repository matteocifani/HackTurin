/** shadcn/ui ToggleGroup primitive on the IAMAimpresa tokens. Part of the IAMAimpresa design system. */
import * as React from 'react'
import { type VariantProps } from 'class-variance-authority'
import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'
import { toggleVariants } from '@/components/ui/toggle'

type ToggleGroupVariant = VariantProps<typeof toggleVariants>['variant'] | 'segmented'

const ToggleGroupContext = React.createContext<{
  variant?: ToggleGroupVariant
  size?: VariantProps<typeof toggleVariants>['size']
  spacing?: number
}>({
  size: 'default',
  variant: 'default',
  spacing: 0,
})

function ToggleGroup({
  className,
  variant,
  size,
  spacing = 0,
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> & {
  variant?: ToggleGroupVariant
  size?: VariantProps<typeof toggleVariants>['size']
  spacing?: number
}) {
  const segmented = variant === 'segmented'
  return (
    <ToggleGroupPrimitive.Root
      data-slot='toggle-group'
      data-variant={variant}
      data-size={size}
      data-spacing={spacing}
      style={{ '--gap': spacing } as React.CSSProperties}
      className={cn(
        'group/toggle-group flex w-fit items-center gap-[--spacing(var(--gap))] rounded-md',

        !segmented &&
          'data-[spacing=0]:border-0 data-[spacing=0]:bg-transparent data-[spacing=0]:p-0 data-[spacing=0]:shadow-none',

        segmented && 'h-(--control-h-sm) bg-muted p-0.5',
        className
      )}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size, spacing }}>{children}</ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  )
}

function ToggleGroupItem({
  className,
  children,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> & {
  variant?: ToggleGroupVariant
  size?: VariantProps<typeof toggleVariants>['size']
}) {
  const context = React.useContext(ToggleGroupContext)
  const variantEffettiva = context.variant || variant
  const segmented = variantEffettiva === 'segmented'

  return (
    <ToggleGroupPrimitive.Item
      data-slot='toggle-group-item'
      data-variant={variantEffettiva}
      data-size={context.size || size}
      data-spacing={context.spacing}
      className={cn(
        toggleVariants({
          variant: segmented ? 'default' : variantEffettiva,
          size: context.size || size,
        }),
        'w-auto min-w-0 shrink-0 px-3 focus:z-(--z-raised) focus-visible:z-(--z-raised)',
        !segmented &&
          'data-[spacing=0]:rounded-none data-[spacing=0]:shadow-none data-[spacing=0]:first:rounded-l-md data-[spacing=0]:last:rounded-r-md',

        !segmented && 'data-[spacing=0]:border-0 data-[spacing=0]:bg-muted data-[spacing=0]:shadow-none',
        !segmented &&
          'data-[spacing=0]:data-[state=on]:bg-border data-[spacing=0]:data-[state=on]:text-foreground',
        !segmented &&
          'data-[spacing=0]:hover:bg-(--surface-segment-hover) data-[spacing=0]:data-[state=on]:hover:bg-border',

        segmented &&
          'h-full rounded-sm border border-transparent bg-transparent text-muted-foreground shadow-none hover:bg-transparent hover:text-foreground',
        segmented && 'data-[state=on]:border-border data-[state=on]:bg-card data-[state=on]:text-foreground',
        className
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  )
}

export { ToggleGroup, ToggleGroupItem }
