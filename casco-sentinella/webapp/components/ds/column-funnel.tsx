/** Column-header filter that opens the same facet as the filter panel. Part of the IAMAimpresa design system. */
'use client'

import { useLayoutEffect, useMemo, useRef, useState } from 'react'

let orfano: string | null = null
const identitaImbuto = (chiave: string, percorso: string): string => `${percorso}|${chiave}`

import { FilterIcon } from 'lucide-react'

import { DateRangeFacetPanel, EMPTY_RANGE, hasRange } from '@/components/ds/date-range-facet'
import {
  FormaFacetPanel,
  IconaVoceFacet,
  RigaEscludi,
  facetConIcone,
  formaAccesa,
  opzioniInOrdine,
  prefissoEscluso,
  riassuntoForma,
  type FacetSpec,
} from '@/components/ds/mega-filter'
import { FilterCheck } from '@/components/ds/toolbar-bits'
import { Button } from '@/components/ui/button'
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

export type ColumnFunnelProps = {
  facet: FacetSpec

  label?: string

  onPulisci?: () => void

  searchThreshold?: number

  className?: string
}

const SOGLIA_RICERCA_DEFAULT = 8

export function ColumnFunnel({
  facet,
  label,
  onPulisci,
  searchThreshold = SOGLIA_RICERCA_DEFAULT,
  className,
}: ColumnFunnelProps) {
  const [aperto, setAperto] = useState(false)

  const [ripreso, setRipreso] = useState(false)

  const apertoSu = useRef<string | null>(null)
  const chiaveFacet = facet.key
  useLayoutEffect(() => {
    if (orfano != null && orfano === identitaImbuto(chiaveFacet, window.location.pathname)) {
      orfano = null
      apertoSu.current = window.location.pathname
      setAperto(true)
      setRipreso(true)
    }
    return () => {
      if (apertoSu.current == null) return
      const io = identitaImbuto(chiaveFacet, apertoSu.current)
      orfano = io
      queueMicrotask(() => {
        if (orfano === io) orfano = null
      })
    }
  }, [chiaveFacet])
  const cambiaAperto = (v: boolean): void => {
    apertoSu.current = v ? window.location.pathname : null
    setAperto(v)
    if (!v) setRipreso(false)
  }
  const nome = label ?? facet.label
  const forma = facet.forma
  const conRange = forma == null && facet.range != null
  const attivo =
    forma != null
      ? formaAccesa(forma)
      : facet.selected.length > 0 || (facet.range != null && hasRange(facet.range.value))
  const riassunto = forma != null && attivo ? riassuntoForma(forma) : undefined
  const opzioni = useMemo(() => (facet.ordine === 'logico' ? facet.options : opzioniInOrdine(facet)), [facet])
  const conRicerca = opzioni.length > searchThreshold

  const conIcone = useMemo(() => facetConIcone(opzioni), [opzioni])

  const non = prefissoEscluso(facet)

  return (
    <Popover open={aperto} onOpenChange={cambiaAperto}>
      <PopoverTrigger asChild>
        <button
          type='button'
          aria-label={`Filtra ${nome}`}
          aria-pressed={attivo}
          title={riassunto}

          onClick={e => e.stopPropagation()}
          onKeyDown={e => e.stopPropagation()}
          className={cn(
            'focus-visible:ring-ring flex size-5 shrink-0 items-center justify-center rounded-sm outline-none focus-visible:ring-2',
            attivo
              ? 'ring-ring text-foreground ring-2'
              : 'text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent'
          )}
        >
          <FilterIcon className={cn('size-3', attivo && 'fill-current')} />
          {attivo && riassunto != null && <span className='sr-only'>{riassunto}</span>}
          {attivo && forma == null && (
            <span className='sr-only'>
              {facet.selected.length}{' '}
              {non !== ''
                ? facet.selected.length === 1
                  ? 'valore escluso'
                  : 'valori esclusi'
                : facet.selected.length === 1
                  ? 'valore selezionato'
                  : 'valori selezionati'}
            </span>
          )}
        </button>
      </PopoverTrigger>

      {forma != null ? (
        <PopoverContent
          align='start'
          style={ripreso ? { animation: 'none' } : undefined}
          className={cn('w-auto p-0', className)}
          onClick={e => e.stopPropagation()}
          onKeyDown={e => e.stopPropagation()}
        >
          <FormaFacetPanel forma={forma} nome={nome} />
        </PopoverContent>
      ) : conRange && facet.range != null ? (
        <PopoverContent
          align='start'
          style={ripreso ? { animation: 'none' } : undefined}
          className={cn('w-auto min-w-64 p-0', className)}
          onClick={e => e.stopPropagation()}
          onKeyDown={e => e.stopPropagation()}
        >
          <div className='p-1'>
            <DateRangeFacetPanel
              options={facet.options}
              selected={facet.selected}
              onToggle={facet.onToggle}
              range={facet.range.value}
              onRangeChange={facet.range.onChange}
              onApply={() => cambiaAperto(false)}
              single={facet.single}
            />
          </div>
          <div className='flex justify-end border-t p-1'>
            <Button
              variant='ghost'
              size='sm'
              className='text-muted-foreground h-(--control-h-xs) px-2 text-xs'
              disabled={!attivo}
              onClick={() => {
                if (onPulisci != null) return onPulisci()
                for (const v of facet.selected) facet.onToggle(v)
                facet.range?.onChange(EMPTY_RANGE)
              }}
            >
              Pulisci
            </Button>
          </div>
        </PopoverContent>
      ) : (
        <PopoverContent
          align='start'
          style={ripreso ? { animation: 'none' } : undefined}
          className={cn('w-64 p-0', className)}
          onClick={e => e.stopPropagation()}
          onKeyDown={e => e.stopPropagation()}
        >
          <Command shouldFilter={conRicerca}>
            {conRicerca && (
              <CommandInput placeholder={facet.search?.placeholder ?? `Cerca in ${nome.toLowerCase()}…`} />
            )}
            <CommandList className='max-h-64'>
              <CommandEmpty>{facet.search?.emptyLabel ?? 'Nessun valore'}</CommandEmpty>
              <CommandGroup>
                {opzioni.map(o => (
                  <CommandItem
                    key={o.value}
                    value={o.label}
                    title={o.title}
                    onSelect={() => facet.onToggle(o.value)}
                  >
                    <FilterCheck checked={facet.selected.includes(o.value)} />
                    <IconaVoceFacet icon={o.icon} iconClass={o.iconClass} riserva={conIcone} />
                    <span className='flex-1 truncate'>
                      {facet.selected.includes(o.value) ? non + o.label : o.label}
                    </span>
                    {o.count != null && (
                      <span className='text-muted-foreground text-xs tabular-nums'>
                        {o.count.toLocaleString('it-IT')}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>

          <RigaEscludi facet={facet} className='border-t p-1' filo={false} />
          <div className='flex justify-end border-t p-1'>
            <Button
              variant='ghost'
              size='sm'
              className='text-muted-foreground h-(--control-h-xs) px-2 text-xs'
              disabled={!attivo}
              onClick={() => {
                if (onPulisci != null) return onPulisci()

                for (const v of facet.selected) facet.onToggle(v)
              }}
            >
              Pulisci
            </Button>
          </div>
        </PopoverContent>
      )}
    </Popover>
  )
}
