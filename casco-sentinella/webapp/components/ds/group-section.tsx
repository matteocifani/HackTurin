/** Collapsible section with title, count and actions. Part of the IAMAimpresa design system. */
'use client'

import { useState, type ComponentType, type ReactNode } from 'react'

import { ChevronRightIcon } from 'lucide-react'

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

type GroupSectionProps = {
  title: ReactNode
  count?: number
  icon?: ComponentType<{ className?: string }>
  iconClassName?: string

  leading?: ReactNode

  actions?: ReactNode
  defaultOpen?: boolean

  open?: boolean
  onOpenChange?: (open: boolean) => void
  sticky?: boolean

  superficie?: 'pagina' | 'scheda'
  className?: string
  headerClassName?: string

  actionsClassName?: string
  children: ReactNode
}

export function GroupSection({
  title,
  count,
  icon: Icon,
  iconClassName,
  leading,
  actions,
  defaultOpen = true,
  open,
  onOpenChange,
  sticky = true,
  superficie = 'pagina',
  className,
  headerClassName,
  actionsClassName,
  children,
}: GroupSectionProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const isOpen = open ?? internalOpen
  const setOpen = (next: boolean) => {
    setInternalOpen(next)
    onOpenChange?.(next)
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setOpen} className={cn(sticky && 'overflow-y-clip', className)}>
      <div
        className={cn(
          'flex items-center gap-2 py-1.5',

          sticky &&
            'sticky top-2 z-(--z-sticky) before:pointer-events-none before:absolute before:inset-x-0 before:bottom-full before:h-2',
          sticky && (superficie === 'scheda' ? 'before:bg-card' : 'before:bg-background'),

          (sticky || superficie === 'scheda') && (superficie === 'scheda' ? 'bg-card' : 'bg-background'),
          headerClassName
        )}
      >
        {leading}

        <CollapsibleTrigger asChild>
          <button
            type='button'
            aria-label={isOpen ? 'Chiudi il gruppo' : 'Apri il gruppo'}
            className='text-muted-foreground hover:bg-muted hover:text-foreground relative -ms-1 shrink-0 rounded p-0.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:after:absolute max-md:after:-inset-2 max-md:after:content-[""] [&[data-state=open]>svg]:rotate-90'
          >
            <ChevronRightIcon className='size-4 transition-transform' />
          </button>
        </CollapsibleTrigger>
        {Icon && <Icon className={cn('size-4 shrink-0', iconClassName)} aria-hidden />}
        <span className='min-w-0 truncate text-sm font-semibold'>{title}</span>
        {count != null && (
          <span className='text-muted-foreground shrink-0 text-xs tabular-nums'>{count}</span>
        )}
        {actions && (
          <span className={cn('ms-auto flex shrink-0 items-center gap-1', actionsClassName)}>{actions}</span>
        )}
      </div>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  )
}
