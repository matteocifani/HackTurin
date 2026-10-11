/** Searchable multi-choice list in a popover. Part of the IAMAimpresa design system. */
'use client'

import { Fragment, type KeyboardEvent, type ReactNode } from 'react'

import {
  LISTA_CON_TESTA,
  VoceCrea,
  focoAllaRicerca,
  testoDellaRiga,
  useRigaEvidenziata,
  valoreVoceCrea,
} from '@/components/ds/combobox-menu'
import { FilterCheck } from '@/components/ds/toolbar-bits'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export type MultiCommandOption = {
  value: string
  label: ReactNode

  search?: string

  trailing?: ReactNode
  disabled?: boolean

  wrap?: (riga: ReactNode) => ReactNode
}

export type MultiCommandGroup = {
  key: string
  heading?: string
  options: MultiCommandOption[]
}

type MultiCommandListProps = {
  options?: MultiCommandOption[]
  groups?: MultiCommandGroup[]
  selected: string[]
  onToggle: (value: string) => void
  placeholder: string
  emptyLabel: string

  searchValue?: string
  onSearchChange?: (value: string) => void

  shouldFilter?: boolean

  addOption?: { label: ReactNode; value: string }

  ricerca?: boolean

  onTogliUltimo?: () => void
  className?: string
  listClassName?: string
}

export function MultiCommandList({
  options,
  groups,
  selected,
  onToggle,
  placeholder,
  emptyLabel,
  searchValue,
  onSearchChange,
  shouldFilter,
  addOption,
  ricerca = true,
  onTogliUltimo,
  className,
  listClassName,
}: MultiCommandListProps) {
  const riga = (o: MultiCommandOption) => {
    const item = (
      <CommandItem
        key={o.value}
        value={o.search ?? o.value}
        disabled={o.disabled}
        data-testo={testoDellaRiga(o)}
        onSelect={() => onToggle(o.value)}
      >
        <FilterCheck checked={selected.includes(o.value)} />
        <span className='flex-1 truncate'>{o.label}</span>
        {o.trailing}
      </CommandItem>
    )
    return o.wrap != null ? <Fragment key={o.value}>{o.wrap(item)}</Fragment> : item
  }

  const evidenziata = useRigaEvidenziata(
    undefined,
    addOption != null ? valoreVoceCrea(addOption.value) : undefined
  )

  const togliUltimo =
    onTogliUltimo != null
      ? (e: KeyboardEvent<HTMLElement>) => {
          if (e.key !== 'Backspace') return
          if (e.target instanceof HTMLInputElement && e.target.value !== '') return
          e.preventDefault()
          onTogliUltimo()
        }
      : undefined
  return (
    <Command
      shouldFilter={shouldFilter}
      {...evidenziata}

      {...(ricerca ? {} : { tabIndex: 0 })}
      {...(togliUltimo != null ? { onKeyDownCapture: togliUltimo } : {})}
      className={ricerca ? className : cn('outline-none', className)}
    >
      {ricerca ? (
        <CommandInput placeholder={placeholder} value={searchValue} onValueChange={onSearchChange} />
      ) : null}
      <CommandList className={cn(addOption != null && LISTA_CON_TESTA, listClassName)}>
        {addOption != null ? (
          <VoceCrea
            valore={addOption.value}
            etichetta={addOption.label}
            onScegli={() => onToggle(addOption.value)}
          />
        ) : null}
        <CommandEmpty>{emptyLabel}</CommandEmpty>
        {options != null ? <CommandGroup>{options.map(riga)}</CommandGroup> : null}
        {groups?.map(g => (
          <CommandGroup key={g.key} heading={g.heading}>
            {g.options.map(riga)}
          </CommandGroup>
        ))}
      </CommandList>
    </Command>
  )
}

type MultiCommandProps = MultiCommandListProps & {
  trigger: ReactNode

  open?: boolean
  onOpenChange?: (open: boolean) => void
  align?: 'start' | 'center' | 'end'

  contentClassName?: string

  footer?: ReactNode
}

export function MultiCommand({
  trigger,
  open,
  onOpenChange,
  align = 'start',
  contentClassName,
  footer,
  ...list
}: MultiCommandProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align={align}
        onOpenAutoFocus={focoAllaRicerca}
        className={cn('min-w-(--radix-popover-trigger-width) p-0', contentClassName)}
      >
        <MultiCommandList {...list} />
        {footer}
      </PopoverContent>
    </Popover>
  )
}
