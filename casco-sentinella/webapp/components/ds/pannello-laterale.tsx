/** Resizable side panel next to a list; becomes a bottom sheet on phones. Part of the IAMAimpresa design system. */
'use client'

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'

import { PanelLeftIcon, PanelRightIcon } from 'lucide-react'

import { BottoneIcona } from '@/components/ds/bottone-icona'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import {
  LARGHEZZA_PANNELLO,
  useColonnaPannello,
  useLarghezzaPannello,
  useSegnalaTransizionePannello,
} from '@/components/ds/workspace'
import { cn } from '@/lib/utils'

const SOGLIA = {
  '7xl': '@max-7xl/workspace:hidden',
  '5xl': '@max-5xl/workspace:hidden',
} as const

const PASSO = 16
const PASSO_GRANDE = 64

const TINTA = 'bg-muted'

const PIEDE_AL_FONDO =
  'flex items-end sm:min-h-[calc(var(--flottanti-riserva,0px)-1.25rem)] sm:pe-[max(1rem,calc(var(--flottanti-riserva,0px)-1.25rem))]'

const GRONDA_CORPO = 'sm:pb-[max(0.75rem,calc(var(--flottanti-riserva,0px)-0.5rem))]'

const BINARIO = 48

const SOGLIA_COMPRIME = 96

const dentro = (px: number, tetto: number) => Math.min(tetto, Math.max(LARGHEZZA_PANNELLO.min, px))

export function PannelloLaterale({
  titolo,
  visibile,
  aperto,
  sheetAperto,
  onChiudiSheet,
  soglia = '7xl',
  chiaveMemoria,
  riservaRem = 40,
  larghezzaPredefinita = LARGHEZZA_PANNELLO.predefinita,
  lato = 'destro',
  comprimibile,
  children,
  piede,
}: {
  titolo: string

  visibile: boolean

  aperto: boolean

  sheetAperto: boolean
  onChiudiSheet: () => void

  soglia?: keyof typeof SOGLIA

  chiaveMemoria?: string

  riservaRem?: number

  larghezzaPredefinita?: number

  lato?: 'destro' | 'sinistro'

  comprimibile?: { icona: ReactNode; onCambia: () => void }
  children: ReactNode

  piede?: ReactNode
}) {
  const predefinita = dentro(larghezzaPredefinita, LARGHEZZA_PANNELLO.max)
  const { larghezza, setLarghezza } = useLarghezzaPannello(chiaveMemoria, {
    ...LARGHEZZA_PANNELLO,
    predefinita,
  })
  const ridimensionabile = chiaveMemoria != null
  const asideRef = useRef<HTMLElement>(null)
  const [inResize, setInResize] = useState(false)

  const segnala = useSegnalaTransizionePannello()
  useEffect(() => {
    const el = asideRef.current
    if (el == null) return
    const mia = (e: Event) => e.target === el && (e as globalThis.TransitionEvent).propertyName === 'width'

    const contenitore = () => el.parentElement
    const inizio = (e: Event) => {
      if (!mia(e)) return
      contenitore()?.setAttribute('data-transizione', '')
      segnala(true)
    }
    const fine = (e: Event) => {
      if (!mia(e)) return
      contenitore()?.removeAttribute('data-transizione')
      segnala(false)
    }
    el.addEventListener('transitionstart', inizio)
    el.addEventListener('transitionend', fine)
    el.addEventListener('transitioncancel', fine)
    return () => {
      el.removeEventListener('transitionstart', inizio)
      el.removeEventListener('transitionend', fine)
      el.removeEventListener('transitioncancel', fine)
      segnala(false)
    }
  }, [segnala])

  const presa = useRef<{ x0: number; da: number; tetto: number; ultima: number; comprime: boolean } | null>(
    null
  )

  const tettoAttuale = () => {
    const io = asideRef.current
    const contenitore = io?.parentElement
    if (io == null || contenitore == null) return LARGHEZZA_PANNELLO.max
    const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16

    let altri = 0
    for (const figlio of contenitore.children) {
      if (figlio !== io && figlio.hasAttribute('data-pannello-laterale'))
        altri += figlio.getBoundingClientRect().width
    }
    const libero = Math.floor(contenitore.getBoundingClientRect().width - altri - riservaRem * rem)
    return Math.max(LARGHEZZA_PANNELLO.min, Math.min(LARGHEZZA_PANNELLO.max, libero))
  }
  const sinistro = lato === 'sinistro'

  const iniziaResize = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.preventDefault()
    presa.current = {
      x0: e.clientX,
      da: larghezza,
      tetto: tettoAttuale(),
      ultima: larghezza,
      comprime: false,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    setInResize(true)

    asideRef.current?.parentElement?.setAttribute('data-transizione', '')
    segnala(true)

    document.body.classList.add('select-none', 'cursor-col-resize')
  }
  const muovi = (e: PointerEvent<HTMLDivElement>) => {
    const p = presa.current
    if (p == null) return

    const grezza = p.da + (sinistro ? e.clientX - p.x0 : p.x0 - e.clientX)

    p.comprime = comprimibile != null && grezza < LARGHEZZA_PANNELLO.min - SOGLIA_COMPRIME
    p.ultima = dentro(grezza, p.tetto)
    setLarghezza(p.ultima, { salva: false })
  }
  const fine = () => {
    const p = presa.current
    if (p == null) return
    presa.current = null
    setInResize(false)
    asideRef.current?.parentElement?.removeAttribute('data-transizione')
    segnala(false)
    document.body.classList.remove('select-none', 'cursor-col-resize')

    if (p.comprime && comprimibile != null) {
      setLarghezza(p.da)
      comprimibile.onCambia()
      return
    }

    setLarghezza(p.ultima)
  }
  const tastiera = (e: KeyboardEvent<HTMLDivElement>) => {
    const passo = e.shiftKey ? PASSO_GRANDE : PASSO
    let prossima: number | null = null

    if (e.key === 'ArrowLeft') prossima = sinistro ? larghezza - passo : larghezza + passo
    else if (e.key === 'ArrowRight') prossima = sinistro ? larghezza + passo : larghezza - passo
    else if (e.key === 'Home') prossima = LARGHEZZA_PANNELLO.min
    else if (e.key === 'End') prossima = LARGHEZZA_PANNELLO.max
    if (prossima == null) return
    e.preventDefault()
    setLarghezza(dentro(prossima, tettoAttuale()))
  }

  const colonna = useColonnaPannello()
  const colonnaAperta = aperto && visibile

  const corpo = (
    <div
      className={cn(TINTA, 'flex h-full min-h-0 flex-col overflow-y-auto p-3', piede == null && GRONDA_CORPO)}
    >
      <div className='shrink-0 space-y-6'>{children}</div>
      {piede != null && (
        <div
          data-piede-pannello=''
          className={cn('text-muted-foreground mt-auto border-t px-4 py-3 text-xs', PIEDE_AL_FONDO)}
        >
          <div className='min-w-0'>{piede}</div>
        </div>
      )}
    </div>
  )
  const conBinario = comprimibile != null && visibile

  const segnoComando = sinistro ? <PanelLeftIcon aria-hidden /> : <PanelRightIcon aria-hidden />

  const testata = comprimibile != null && (
    <div
      className={cn('flex h-14 shrink-0 items-center gap-2 border-b px-3', !sinistro && 'flex-row-reverse')}
    >
      <h2 className='min-w-0 flex-1 truncate text-sm font-semibold'>{titolo}</h2>
      <BottoneIcona etichetta={`Comprimi «${titolo}»`} icona={segnoComando} onClick={comprimibile.onCambia} />
    </div>
  )
  return (
    <>
      <aside
        ref={asideRef}
        inert={!colonnaAperta && !conBinario}
        data-resizing={inResize ? '' : undefined}
        data-compresso={conBinario && !colonnaAperta ? '' : undefined}

        data-pannello-laterale={lato}
        style={{ width: colonnaAperta ? larghezza : conBinario ? BINARIO : 0 }}
        className={cn(
          SOGLIA[soglia],

          'relative flex shrink-0 overflow-hidden',
          sinistro ? 'justify-start border-r' : 'justify-end border-l',
          inResize
            ? 'transition-none'
            : 'transition-[width] duration-(--duration-slow) ease-(--ease-out) motion-reduce:transition-none',
          !colonnaAperta && !conBinario && (sinistro ? 'border-r-0' : 'border-l-0')
        )}
        aria-label={titolo}
      >
        {visibile && (
          <div
            inert={!colonnaAperta}
            className={cn(
              'flex h-full shrink-0 flex-col',

              conBinario &&
                'transition-[visibility] duration-(--duration-slow) motion-reduce:transition-none',
              conBinario && !colonnaAperta && 'invisible'
            )}
            style={{ width: larghezza }}
          >
            {testata}
            <div className='min-h-0 flex-1'>{corpo}</div>
          </div>
        )}
        {comprimibile != null && visibile && !colonnaAperta && (
          <div className={cn('bg-card absolute inset-y-0 w-12', sinistro ? 'start-0' : 'end-0')}>
            <button
              type='button'
              onClick={comprimibile.onCambia}
              aria-label={`Espandi «${titolo}»`}
              title={titolo}
              className={cn(
                TINTA,
                'hover:bg-muted text-muted-foreground hover:text-foreground focus-visible:ring-ring flex size-full flex-col items-center outline-none focus-visible:ring-2 focus-visible:ring-inset [&_svg]:size-4'
              )}
            >
              <span className='flex h-14 w-full shrink-0 items-center justify-center border-b'>
                {segnoComando}
              </span>
              <span className='pt-3' aria-hidden>
                {comprimibile.icona}
              </span>
            </button>
          </div>
        )}
        {ridimensionabile && colonnaAperta && (
          <div
            role='separator'
            aria-orientation='vertical'
            aria-label='Larghezza del pannello'
            aria-valuemin={LARGHEZZA_PANNELLO.min}
            aria-valuemax={LARGHEZZA_PANNELLO.max}
            aria-valuenow={larghezza}
            tabIndex={0}
            onPointerDown={iniziaResize}
            onPointerMove={muovi}
            onPointerUp={fine}
            onPointerCancel={fine}
            onKeyDown={tastiera}
            onDoubleClick={() => setLarghezza(predefinita)}
            className={cn(
              'absolute inset-y-0 z-(--z-raised) w-2 cursor-col-resize touch-none select-none outline-none',
              sinistro ? 'end-0' : 'start-0',

              'before:absolute before:inset-y-0 before:w-0.5 hover:before:bg-foreground/60 focus-visible:before:bg-foreground/60',
              sinistro ? 'before:end-0' : 'before:start-0',
              inResize && 'before:bg-foreground/60'
            )}
          />
        )}
      </aside>

      <Sheet open={sheetAperto && visibile && !colonna} onOpenChange={next => !next && onChiudiSheet()}>
        <SheetContent side={sinistro ? 'left' : 'right'} className='w-80 gap-0 p-0'>
          {comprimibile != null ? (
            <div className='flex h-14 shrink-0 items-center border-b ps-3 pe-12'>
              <SheetTitle className='truncate text-sm font-semibold'>{titolo}</SheetTitle>
            </div>
          ) : (
            <SheetTitle className='sr-only'>{titolo}</SheetTitle>
          )}
          {visibile && <div className='min-h-0 flex-1'>{corpo}</div>}
        </SheetContent>
      </Sheet>
    </>
  )
}
