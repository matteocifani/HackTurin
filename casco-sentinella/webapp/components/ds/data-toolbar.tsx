/** Toolbar of a data view: local search on the left, filters, actions on the right; reshapes on phones. Part of the IAMAimpresa design system. */
'use client'

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { ListFilterIcon, SearchIcon, XIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useIsMobile } from '@/hooks/use-mobile'
import { RicercaALenteContext } from '@/hooks/use-ricerca-a-lente'
import { cn } from '@/lib/utils'

const RESPIRO_MS = 200

type ConTesto = ReactNode | ((testo: string) => ReactNode)

type DataToolbarProps = {
  search?: {
    placeholder: string

    value: string

    onChange: (value: string) => void
  }

  filters?: ConTesto

  actions?: ConTesto

  activeFilterCount?: number

  filtersSelfContained?: boolean

  ricercaAIcona?: boolean
}

const DataToolbar = ({
  search,
  filters,
  actions,
  activeFilterCount = 0,
  filtersSelfContained = false,
  ricercaAIcona = false,
}: DataToolbarProps) => {
  const [filtersOpen, setFiltersOpen] = useState(false)

  const isMobile = useIsMobile()

  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const lenteRef = useRef<HTMLButtonElement>(null)
  const tornaAllaLente = useRef(false)

  const esterno = search?.value ?? ''
  const [testo, setTesto] = useState(esterno)
  const spinto = useRef(esterno)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const inVolo = useRef<string | null>(null)
  const invia = useRef(search?.onChange)

  const rimettere = useRef<{ testo: string; entro: number } | null>(null)
  useEffect(() => {
    invia.current = search?.onChange
  })
  useEffect(() => {
    if (esterno.trim() === spinto.current.trim()) return

    const daRimettere = rimettere.current
    rimettere.current = null
    if (daRimettere != null && esterno === '' && Date.now() < daRimettere.entro) {
      parti(daRimettere.testo)
      return
    }
    spinto.current = esterno
    if (timer.current != null) {
      clearTimeout(timer.current)
      timer.current = null
    }
    inVolo.current = null
    setTesto(esterno)
  }, [esterno])
  useEffect(
    () => () => {
      if (timer.current != null) clearTimeout(timer.current)
    },
    []
  )
  const parti = (valore: string) => {
    if (timer.current != null) clearTimeout(timer.current)
    timer.current = null
    inVolo.current = null
    spinto.current = valore
    invia.current?.(valore)
  }
  const scrivi = (valore: string) => {
    setTesto(valore)
    if (timer.current != null) clearTimeout(timer.current)
    inVolo.current = valore
    timer.current = setTimeout(() => parti(valore), RESPIRO_MS)
  }

  const chiudiRespiro = () => {
    if (inVolo.current != null) parti(inVolo.current)
  }

  const svuota = () => {
    setTesto('')
    parti('')
  }

  const aIcona = isMobile || ricercaAIcona
  const searchEsteso = (!isMobile && !ricercaAIcona) || searchOpen || testo !== ''
  const nodoFiltri = typeof filters === 'function' ? filters(testo) : filters
  const nodoAzioni = typeof actions === 'function' ? actions(testo) : actions

  const raccontata = filtersSelfContained && (typeof filters === 'function' || typeof actions === 'function')
  const lenteARiposo = search != null && raccontata && !searchOpen && testo !== ''

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])
  useEffect(() => {
    if (searchEsteso || !tornaAllaLente.current) return
    tornaAllaLente.current = false
    lenteRef.current?.focus()
  }, [searchEsteso])

  return (
    <RicercaALenteContext.Provider
      value={
        lenteARiposo
          ? { testo, rimetti: t => void (rimettere.current = { testo: t, entro: Date.now() + 3000 }) }
          : null
      }
    >
      <div className='flex flex-wrap items-center gap-x-3 gap-y-2 max-sm:flex-nowrap max-sm:justify-end max-sm:gap-1.5'>
        {search && searchEsteso && (
          <div
            className={cn(
              'relative order-1 w-full min-w-0 sm:grow sm:basis-48',
              ricercaAIcona ? 'sm:max-w-48' : 'sm:max-w-80',
              lenteARiposo && 'max-sm:hidden'
            )}
          >
            <SearchIcon className='text-muted-foreground absolute start-2.5 top-1/2 size-4 -translate-y-1/2' />
            <Input
              ref={searchRef}
              size='sm'
              className={cn('ps-8', ricercaAIcona ? 'pe-9' : 'max-sm:pe-9')}
              placeholder={search.placeholder}
              value={testo}
              onChange={e => scrivi(e.target.value)}
              onKeyDown={e => {
                if (e.key !== 'Escape' || !aIcona) return
                e.preventDefault()
                tornaAllaLente.current = true
                svuota()
                setSearchOpen(false)
              }}
              onBlur={() => {
                chiudiRespiro()
                if (testo === '') setSearchOpen(false)
              }}
            />
            {searchOpen && (
              <button
                type='button'
                aria-label='Chiudi la ricerca'
                onClick={() => {
                  svuota()
                  setSearchOpen(false)
                }}
                className={cn(
                  'text-muted-foreground hover:text-foreground absolute end-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center',
                  !ricercaAIcona && 'sm:hidden'
                )}
              >
                <XIcon className='size-4' />
              </button>
            )}
          </div>
        )}

        {search && (!searchEsteso || lenteARiposo) && (
          <Button
            ref={lenteRef}
            variant='secondary'
            size='icon-sm'
            className={cn(
              'order-1 shrink-0 border-0 shadow-none',
              (!ricercaAIcona || searchEsteso) && 'sm:hidden',

              lenteARiposo && 'bg-selected text-selected-foreground hover:bg-selected'
            )}
            aria-label={lenteARiposo ? `Cerca: «${testo}»` : search.placeholder}
            onClick={() => setSearchOpen(true)}
          >
            <SearchIcon className={lenteARiposo ? 'text-selected-foreground' : 'text-muted-foreground'} />
          </Button>
        )}

        {((nodoFiltri && !filtersSelfContained) || nodoAzioni) && (
          <div
            className={cn(
              'order-2 flex items-center gap-1.5 max-sm:shrink-0 sm:contents',
              searchOpen && 'max-sm:hidden'
            )}
          >
            {nodoFiltri && !filtersSelfContained && (
              <Button
                variant='secondary'
                size='icon-sm'
                className='relative shrink-0 border-0 shadow-none sm:hidden'
                aria-label={activeFilterCount > 0 ? `Filtri — ${activeFilterCount} attivi` : 'Filtri'}
                aria-expanded={filtersOpen}
                onClick={() => setFiltersOpen(true)}
              >
                <ListFilterIcon className='text-muted-foreground' />

                {activeFilterCount > 0 && (
                  <Badge className='absolute -end-1 -top-1 size-4 justify-center rounded-full p-0 text-3xs tabular-nums'>
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            )}
            {nodoAzioni && (
              <div className='flex min-w-0 flex-wrap items-center justify-end gap-1.5 sm:order-4 sm:ms-auto sm:gap-2'>
                {nodoAzioni}
              </div>
            )}
          </div>
        )}

        {nodoFiltri && (!isMobile || filtersSelfContained) && (
          <div
            className={cn(
              'flex w-auto flex-row flex-wrap items-center gap-2 sm:order-2 sm:gap-x-3',

              filtersSelfContained
                ? cn('order-1 max-sm:min-w-0', raccontata ? 'max-sm:shrink' : 'max-sm:shrink-0')
                : 'order-3',
              filtersSelfContained && searchOpen && 'max-sm:hidden'
            )}
          >
            {nodoFiltri}
          </div>
        )}

        {nodoFiltri && isMobile && !filtersSelfContained && (
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetContent
              side='bottom'
              className='max-h-[80svh] gap-0 overflow-y-auto rounded-t-xl sm:hidden'
            >
              <SheetHeader className='pb-2'>
                <SheetTitle>Filtri</SheetTitle>
                <SheetDescription className='sr-only'>
                  I filtri di questa vista. Restano attivi anche chiudendo il pannello.
                </SheetDescription>
              </SheetHeader>

              <div className='flex flex-col gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] [&>*]:w-full [&_[data-slot=select-trigger]]:w-full'>
                {nodoFiltri}
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </RicercaALenteContext.Provider>
  )
}

export function DataToolbarSkeleton({ filtri = true, azioni = 1 }: { filtri?: boolean; azioni?: number }) {
  return (
    <div
      aria-hidden
      className='flex flex-wrap items-center gap-2 max-sm:flex-nowrap max-sm:justify-end max-sm:gap-1.5'
    >
      <Skeleton className='h-(--control-h-sm) w-full min-w-0 max-sm:hidden sm:max-w-80 sm:grow sm:basis-48' />
      <Skeleton className='size-(--control-h-sm) shrink-0 sm:hidden' />
      {filtri && <Skeleton className='size-(--control-h-sm) shrink-0 sm:w-24' />}
      {azioni > 0 && (
        <div className='flex items-center gap-1.5 sm:ms-auto sm:gap-2'>
          {Array.from({ length: azioni }).map((_, i) => (
            <Skeleton key={i} className='size-(--control-h-sm) shrink-0 sm:w-24' />
          ))}
        </div>
      )}
    </div>
  )
}

export default DataToolbar
