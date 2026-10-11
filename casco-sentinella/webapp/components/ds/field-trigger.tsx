/** Field helpers: label-above-field wrapper, trigger button and the date picker. Part of the IAMAimpresa design system. */
'use client'

import { CalendarIcon, ChevronDownIcon } from 'lucide-react'
import { useState } from 'react'

import { Calendario } from '@/components/ds/calendario'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatDueDate } from '@/lib/format-date'
import { dateKey } from '@/lib/date-keys'
import { cn } from '@/lib/utils'

export function FieldTrigger({ className, children, ...props }: React.ComponentProps<'button'>) {
  return (
    <button
      type='button'
      {...props}
      className={cn(
        'border-input bg-(--surface-command) hover:bg-accent dark:hover:bg-input/50 flex h-(--control-h-sm) w-full max-w-full items-center justify-between gap-1.5 rounded-md border px-2.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
        className
      )}
    >
      <span className='flex min-w-0 items-center gap-1.5'>{children}</span>
      <ChevronDownIcon className='text-muted-foreground size-3.5 shrink-0' />
    </button>
  )
}

export function DateTrigger({
  value,
  placeholder,
  onChange,
  format,
  id,
  ariaLabel = 'Cambia data',
  trigger,
  defaultMonth,
  min,
}: {
  value?: string
  placeholder: string
  onChange: (dateKey?: string) => void
  id?: string

  defaultMonth?: string

  min?: string

  ariaLabel?: string

  format?: (dateKey: string) => string

  trigger?: React.ReactNode
}) {
  const [aperto, setAperto] = useState(false)

  const apreSu = value ? value : defaultMonth
  return (
    <Popover open={aperto} onOpenChange={setAperto}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <FieldTrigger id={id} aria-label={ariaLabel}>
            <CalendarIcon className='text-muted-foreground size-3.5 shrink-0' />
            <span className={cn('truncate', !value && 'text-muted-foreground')}>
              {value ? (format ?? formatDueDate)(value) : placeholder}
            </span>
          </FieldTrigger>
        )}
      </PopoverTrigger>
      <PopoverContent className='w-auto p-0'>
        <Calendario
          mode='single'
          selected={value ? new Date(`${value}T00:00:00`) : undefined}
          defaultMonth={apreSu ? new Date(`${apreSu}T00:00:00`) : undefined}
          disabled={min ? { before: new Date(`${min}T00:00:00`) } : undefined}
          onSelect={d => {
            onChange(d ? dateKey(d) : undefined)
            setAperto(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

export function PropertyField({
  label,
  span,
  children,
}: {
  label: string
  span?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={cn('min-w-0 space-y-(--space-field)', span && 'sm:col-span-full')}>
      <p className='text-muted-foreground text-xs'>{label}</p>
      {children}
    </div>
  )
}
