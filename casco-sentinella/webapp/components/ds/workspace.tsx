/** Two-column workspace frame and the hooks that manage a resizable right panel. Part of the IAMAimpresa design system. */
'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { ChevronLeftIcon } from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const SOGLIA_COLONNA_REM = 80
const ColonnaPannelloContext = createContext<boolean>(false)

export function useColonnaPannello(): boolean {
  return useContext(ColonnaPannelloContext)
}

const TransizionePannelloContext = createContext<{
  inTransizione: boolean
  segnala: (attiva: boolean) => void
}>({
  inTransizione: false,
  segnala: () => {},
})

export function useTransizionePannello(): boolean {
  return useContext(TransizionePannelloContext).inTransizione
}

export function useSegnalaTransizionePannello(): (attiva: boolean) => void {
  return useContext(TransizionePannelloContext).segnala
}

export function ContenitoreSoglie({
  sogliaColonnaRem = SOGLIA_COLONNA_REM,
  className,
  children,
}: {
  sogliaColonnaRem?: number
  className?: string
  children: ReactNode
}) {
  const contenitore = useRef<HTMLDivElement>(null)
  const [colonna, setColonna] = useState(false)
  useEffect(() => {
    const el = contenitore.current
    if (el == null || typeof ResizeObserver === 'undefined') return
    const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
    const misura = () => setColonna(el.getBoundingClientRect().width >= sogliaColonnaRem * rem)
    misura()
    const oss = new ResizeObserver(misura)
    oss.observe(el)
    return () => oss.disconnect()
  }, [sogliaColonnaRem])

  const [inTransizione, setInTransizione] = useState(false)
  const transizione = useMemo(() => ({ inTransizione, segnala: setInTransizione }), [inTransizione])
  return (
    <div
      ref={contenitore}

      data-transizione={inTransizione ? '' : undefined}
      className={cn('bg-card @container/workspace flex min-h-0 flex-1', className)}
    >
      <ColonnaPannelloContext.Provider value={colonna}>
        <TransizionePannelloContext.Provider value={transizione}>
          {children}
        </TransizionePannelloContext.Provider>
      </ColonnaPannelloContext.Provider>
    </div>
  )
}

export function WorkspaceCornice({
  titolo,
  testata,
  mostraThread: _mostraThread,
  onEsc,
  children,
}: {
  titolo: string

  testata: ReactNode

  mostraThread: boolean

  onEsc: () => void
  children: ReactNode
}) {
  return (
    <div
      className='flex min-h-96 min-w-0 flex-1 flex-col overflow-hidden'
      onKeyDown={event => {
        if (event.key === 'Escape' && !event.defaultPrevented) onEsc()
      }}
    >
      <div className='bg-card flex h-12 shrink-0 items-center gap-3 border-b px-4'>
        <h1 className='text-base font-semibold'>{titolo}</h1>
        {testata}
      </div>

      <ContenitoreSoglie>{children}</ContenitoreSoglie>
    </div>
  )
}

export function ColonnaLista({ mostraThread, children }: { mostraThread: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        '@3xl/workspace:w-72 @5xl/workspace:w-80 flex w-full shrink-0 flex-col border-r',
        mostraThread && '@max-3xl/workspace:hidden'
      )}
    >
      {children}
    </div>
  )
}

export function ColonnaCentro({ mostraThread, children }: { mostraThread: boolean; children: ReactNode }) {
  return (
    <div className={cn('flex min-w-0 flex-1 flex-col', !mostraThread && '@max-3xl/workspace:hidden')}>
      {children}
    </div>
  )
}

export function usePannelloDestro(chiave: string): { aperto: boolean; toggle: () => void } {
  const [aperto, setAperto] = useState(true)
  useEffect(() => {
    try {
      if (window.localStorage.getItem(chiave) === 'chiuso') setAperto(false)
    } catch {}
  }, [chiave])
  const toggle = () =>
    setAperto(v => {
      const prossimo = !v
      try {
        window.localStorage.setItem(chiave, prossimo ? 'aperto' : 'chiuso')
      } catch {}
      return prossimo
    })
  return { aperto, toggle }
}

export const LARGHEZZA_PANNELLO = { min: 320, max: 640, predefinita: 360 } as const

export function useLarghezzaPannello(
  chiave: string | undefined,
  {
    min = LARGHEZZA_PANNELLO.min,
    max = LARGHEZZA_PANNELLO.max,
    predefinita = LARGHEZZA_PANNELLO.predefinita,
  }: { min?: number; max?: number; predefinita?: number } = {}
): { larghezza: number; setLarghezza: (px: number, opzioni?: { salva?: boolean }) => void } {
  const [larghezza, setStato] = useState(predefinita)
  useEffect(() => {
    if (chiave == null) return
    try {
      const letto = Number.parseInt(window.localStorage.getItem(`${chiave}:larghezza`) ?? '', 10)
      if (Number.isFinite(letto)) setStato(Math.min(max, Math.max(min, letto)))
    } catch {}
  }, [chiave, min, max])
  const setLarghezza = useCallback(
    (px: number, { salva = true }: { salva?: boolean } = {}) => {
      const prossima = Math.round(Math.min(max, Math.max(min, px)))
      setStato(prossima)
      if (!salva || chiave == null) return
      try {
        window.localStorage.setItem(`${chiave}:larghezza`, String(prossima))
      } catch {}
    },
    [chiave, min, max]
  )
  return { larghezza, setLarghezza }
}

export function SkeletonThread() {
  return (
    <div className='flex h-full min-h-0 flex-col'>
      <div className='flex h-14 shrink-0 items-center gap-2 border-b px-3'>
        <ChevronLeftIcon
          className='text-muted-foreground/40 @3xl/workspace:hidden size-5 shrink-0'
          aria-hidden
        />
        <Skeleton className='h-4 w-24' />
        <Skeleton className='h-4 w-64' />
      </div>
      <div className='min-h-0 flex-1 space-y-4 p-4'>
        <Skeleton className='ms-auto h-16 w-2/3' />
        <Skeleton className='h-16 w-2/3' />
        <Skeleton className='ms-auto h-16 w-1/2' />
      </div>
      <div className='shrink-0 border-t p-3'>
        <Skeleton className='h-24 w-full' />
      </div>
    </div>
  )
}

export function useAutoAdvance({
  ids,
  impronta,
  selezione,
  setSelezione,
}: {
  ids: string[]
  impronta: string
  selezione: string | null
  setSelezione: (id: string | null) => void
}) {
  const idsPrima = useRef<string[]>([])
  const filtroPrima = useRef<string>('')
  useEffect(() => {
    const filtroCambiato = filtroPrima.current !== '' && filtroPrima.current !== impronta
    if (selezione != null && !ids.includes(selezione) && idsPrima.current.includes(selezione)) {
      if (filtroCambiato) {
        setSelezione(null)
      } else {
        const indice = idsPrima.current.indexOf(selezione)
        setSelezione(ids[Math.min(indice, ids.length - 1)] ?? null)
      }
    }
    idsPrima.current = ids
    filtroPrima.current = impronta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, selezione])
}
