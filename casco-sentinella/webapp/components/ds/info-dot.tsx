/** The one way to explain something: an info icon with a tooltip (popover on touch). Part of the IAMAimpresa design system. */
'use client'

import { InfoIcon } from 'lucide-react'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

const DOT =
  'text-muted-foreground/60 hover:text-foreground focus-visible:ring-ring inline-flex shrink-0 rounded-full p-0.5 align-middle transition-colors outline-none focus-visible:ring-2 motion-reduce:transition-none' +
  ' relative max-md:after:absolute max-md:after:-inset-3.25 max-md:after:content-[""]'

export function InfoDot({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  const isMobile = useIsMobile()

  const trigger = (
    <button
      type='button'
      aria-label={label}
      onClick={e => e.stopPropagation()}
      onKeyDown={e => e.stopPropagation()}
      className={cn(DOT, className)}
    >
      <InfoIcon className='size-3.5' />
    </button>
  )

  if (isMobile) {
    return (
      <Popover>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent align='start' className='max-w-72 text-sm text-balance'>
          {children}
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipContent className='max-w-72'>{children}</TooltipContent>
    </Tooltip>
  )
}
