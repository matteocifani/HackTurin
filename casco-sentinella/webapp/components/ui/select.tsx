/** shadcn/ui Select primitive on the IAMAimpresa tokens. Part of the IAMAimpresa design system. */
'use client'

import * as React from 'react'
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import { Select as SelectPrimitive } from 'radix-ui'

import {
  SHEET_ESCAPE,
  SHEET_ITEM,
  SHEET_LABEL,
  SHEET_MARK,
  SHEET_SAFE_BOTTOM,
  SHEET_SURFACE,
  SheetGrabber,
  SheetScrim,
  useAperturaDopoIlGesto,
} from '@/components/ui/bottom-sheet'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

function Select({ ...props }: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot='select' {...props} />
}

function SelectGroup({ ...props }: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot='select-group' {...props} />
}

function SelectValue({ ...props }: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot='select-value' {...props} />
}

const SUPERFICIE = {
  default: 'bg-(--surface-command) hover:bg-(--surface-command-hover)',
  piatta: 'bg-transparent',
} as const

const SELECT_TRIGGER =
  "flex w-fit max-w-full items-center justify-between gap-2 rounded-md border border-input px-3 py-2 text-sm whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-(length:--focus-ring-width) focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-(--ring-destructive) data-[placeholder]:text-muted-foreground data-[size=default]:h-(--control-h) data-[size=sm]:h-(--control-h-sm) *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground"
const SELECT_TRIGGER_SUPERFICIE = SUPERFICIE

function SelectTrigger({
  className,
  size = 'default',
  variant = 'default',
  children,
  onPointerDown,
  asChild,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: 'sm' | 'default'

  variant?: keyof typeof SUPERFICIE
}) {
  const alPuntatore = useAperturaDopoIlGesto(onPointerDown)

  if (asChild) {
    return (
      <SelectPrimitive.Trigger asChild data-slot='select-trigger' onPointerDown={alPuntatore} {...props}>
        {children}
      </SelectPrimitive.Trigger>
    )
  }

  return (
    <SelectPrimitive.Trigger
      data-slot='select-trigger'
      data-size={size}
      data-variant={variant}
      onPointerDown={alPuntatore}
      className={cn(SELECT_TRIGGER, SUPERFICIE[variant], className)}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className='size-4 opacity-50' />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  position = 'item-aligned',
  align = 'center',
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          data-slot='select-content'
          {...{ [SHEET_MARK]: '' }}
          className={cn(
            'z-(--z-modal) border bg-popover text-popover-foreground',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
            className,
            SHEET_ESCAPE,
            SHEET_SURFACE
          )}
          position='popper'
          side='bottom'
          align='start'
          sideOffset={0}
          {...props}
        >
          <SheetScrim />
          <SheetGrabber />

          <SelectPrimitive.Viewport
            className={cn('overflow-y-auto overscroll-contain px-2 pt-1', SHEET_SAFE_BOTTOM)}
          >
            {children}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    )
  }

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot='select-content'
        className={cn(
          'relative z-(--z-modal) max-h-(--radix-select-content-available-height) min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          position === 'popper' &&
            'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
          className
        )}
        position={position}
        align={align}
        {...props}
      >
        <SelectScrollUpButton />

        <SelectPrimitive.Viewport
          className={cn(
            'p-1.5',
            position === 'popper' &&
              'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1.5'
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot='select-label'
      className={cn('px-2 py-1.5 text-xs text-muted-foreground', SHEET_LABEL, className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  trailing,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item> & {
  trailing?: React.ReactNode
}) {
  return (
    <SelectPrimitive.Item
      data-slot='select-item'
      className={cn(
        "relative flex w-full cursor-default flex-wrap items-center gap-2 rounded-sm py-2 pr-8 pl-2 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",

        SHEET_ITEM,

        '[[data-bottom-sheet]_&]:pr-9',
        className
      )}
      {...props}
    >
      <span
        data-slot='select-item-indicator'
        className='absolute right-2 flex size-3.5 items-center justify-center'
      >
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className='size-4 text-current' />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      {trailing}
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot='select-separator'
      className={cn('pointer-events-none -mx-1.5 my-1 h-px bg-border', className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot='select-scroll-up-button'
      className={cn('flex cursor-default items-center justify-center py-1', className)}
      {...props}
    >
      <ChevronUpIcon className='size-4' />
    </SelectPrimitive.ScrollUpButton>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot='select-scroll-down-button'
      className={cn('flex cursor-default items-center justify-center py-1', className)}
      {...props}
    >
      <ChevronDownIcon className='size-4' />
    </SelectPrimitive.ScrollDownButton>
  )
}

export {
  SELECT_TRIGGER,
  SELECT_TRIGGER_SUPERFICIE,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
