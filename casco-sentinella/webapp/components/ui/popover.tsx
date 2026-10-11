/** shadcn/ui Popover primitive on the IAMAimpresa tokens. Part of the IAMAimpresa design system. */
'use client'

import * as React from 'react'
import { Popover as PopoverPrimitive } from 'radix-ui'

import {
  SHEET_ESCAPE,
  SHEET_MARK,
  SHEET_SAFE_BOTTOM,
  SHEET_SURFACE,
  SheetGrabber,
  SheetTapGuard,
  SheetScrim,
} from '@/components/ui/bottom-sheet'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

export const POPOVER_SURFACE = 'rounded-md border bg-popover text-popover-foreground shadow-md'

function Popover({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot='popover' {...props} />
}

function PopoverTrigger({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot='popover-trigger' {...props} />
}

function PopoverContent({
  className,
  align = 'center',
  sideOffset = 4,
  children,
  container,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content> & {
  container?: React.ComponentProps<typeof PopoverPrimitive.Portal>['container']
}) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <PopoverPrimitive.Portal container={container}>
        <PopoverPrimitive.Content
          data-slot='popover-content'
          {...{ [SHEET_MARK]: '' }}
          align='start'
          side='bottom'
          sideOffset={0}
          className={cn(
            'z-(--z-modal) border bg-popover text-popover-foreground outline-hidden',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
            className,
            SHEET_ESCAPE,
            SHEET_SURFACE,
            'overflow-y-auto overscroll-contain px-4 pt-0 pb-4',
            SHEET_SAFE_BOTTOM
          )}
          {...props}
        >
          <SheetScrim />
          <SheetTapGuard />
          <SheetGrabber className='pb-3' />
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    )
  }

  return (
    <PopoverPrimitive.Portal container={container}>
      <PopoverPrimitive.Content
        data-slot='popover-content'
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-(--z-modal) w-72 origin-(--radix-popover-content-transform-origin)',
          POPOVER_SURFACE,
          'p-4 outline-hidden data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          className
        )}
        {...props}
      >
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  )
}

function PopoverAnchor({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot='popover-anchor' {...props} />
}

function PopoverHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot='popover-header' className={cn('flex flex-col gap-1 text-sm', className)} {...props} />
  )
}

function PopoverTitle({ className, ...props }: React.ComponentProps<'h2'>) {
  return <div data-slot='popover-title' className={cn('font-medium', className)} {...props} />
}

function PopoverDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p data-slot='popover-description' className={cn('text-muted-foreground', className)} {...props} />
}

export {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverAnchor,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
}
