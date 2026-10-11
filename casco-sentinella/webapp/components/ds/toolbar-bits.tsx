/** Small pieces of toolbars: facet option rows, pressed-filter button, check mark. Part of the IAMAimpresa design system. */
'use client'

import { CheckIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type FacetOption<T extends string> = {
  title?: string
  value: T
  label: string

  count?: number

  icon?: React.ComponentType<{ className?: string }>
  iconClass?: string
}

export function FilterCheck({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'border-input flex size-4 shrink-0 items-center justify-center rounded-2xs border transition-colors',

        checked && 'ring-2 ring-ring'
      )}
    >
      {checked && <CheckIcon className='size-3 text-current' />}
    </span>
  )
}

export function FiltroPremuto({
  premuto,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Button>, 'variant' | 'size' | 'aria-pressed'> & {
  premuto: boolean
}) {
  return (
    <Button
      variant='outline'
      size='sm'
      aria-pressed={premuto}
      className={cn('justify-start', premuto && 'ring-2 ring-ring font-medium', className)}
      {...props}
    />
  )
}

export function FacetOptionRow({
  label,
  title,
  count,
  icon: Icon,
  iconClass,
  checked,
  single,
  onSelect,
  className,
}: {
  label: string

  count?: number
  icon?: React.ComponentType<{ className?: string }>
  iconClass?: string
  checked: boolean

  single?: boolean
  onSelect: () => void

  className?: string

  title?: string
}) {
  return (
    <button
      type='button'
      onClick={onSelect}
      className={cn(
        'hover:bg-accent focus-visible:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-start text-sm outline-none',
        className
      )}
    >
      {!single && <FilterCheck checked={checked} />}
      {Icon != null && <Icon className={cn('size-4 shrink-0', iconClass ?? 'text-muted-foreground')} />}
      <span className='truncate' title={title ?? label}>
        {label}
      </span>
      {count != null && <span className='text-muted-foreground ms-auto text-xs tabular-nums'>{count}</span>}
      {single && checked && (
        <CheckIcon className={cn('size-4 shrink-0 text-current', count == null && 'ms-auto')} />
      )}
    </button>
  )
}
