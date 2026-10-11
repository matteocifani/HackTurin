/** Sort menu placed outside the filter panel. Part of the IAMAimpresa design system. */
'use client'

import { ArrowUpDownIcon, ChevronDownIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export function SortMenu({
  value,
  options,
  onChange,
  evidenzia,
  className,
}: {
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void

  evidenzia?: boolean
  className?: string
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='outline' size='sm' className={cn(evidenzia && 'border-ring', className)}>
          <ArrowUpDownIcon className='text-muted-foreground' />
          <span className='max-lg:hidden'>Ordina</span>
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuLabel className='text-muted-foreground text-xs'>Ordina per</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map(o => (
            <DropdownMenuRadioItem key={o.value} value={o.value}>
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
