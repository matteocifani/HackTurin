/** Labelled group of detail rows, optionally collapsible with per-user memory. Part of the IAMAimpresa design system. */
'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import Link from 'next/link'

import { ChevronDownIcon } from 'lucide-react'

import { EYEBROW } from '@/components/ds/section-card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

function leggiMappa(chiave: string): Record<string, unknown> {
  try {
    const grezzo = window.localStorage.getItem(chiave)
    const letto: unknown = grezzo == null ? null : JSON.parse(grezzo)
    return letto != null && typeof letto === 'object' && !Array.isArray(letto)
      ? (letto as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

function statoScelto(chiave: string, nome: string): boolean | null {
  const valore = leggiMappa(chiave)[nome]
  return typeof valore === 'boolean' ? valore : null
}

function ricordaStato(chiave: string, nome: string, chiuso: boolean) {
  try {
    const mappa = leggiMappa(chiave)
    mappa[nome] = chiuso
    window.localStorage.setItem(chiave, JSON.stringify(mappa))
  } catch {}
}

export function useGruppoRipiegato(
  chiaveGruppi: string | undefined,
  nome: string | undefined,
  { apertoDefault = true, riposo }: { apertoDefault?: boolean; riposo?: () => boolean } = {}
): [aperto: boolean, cambia: (aperto: boolean) => void] {
  const [aperto, setAperto] = useState(apertoDefault)

  const riposoRef = useRef(riposo)
  riposoRef.current = riposo

  useEffect(() => {
    const chiuso = chiaveGruppi != null && nome != null ? statoScelto(chiaveGruppi, nome) : null
    if (chiuso != null) setAperto(!chiuso)
    else if (riposoRef.current != null) setAperto(riposoRef.current())
  }, [chiaveGruppi, nome])

  const cambia = useCallback(
    (valore: boolean) => {
      setAperto(valore)
      if (chiaveGruppi != null && nome != null) ricordaStato(chiaveGruppi, nome, !valore)
    },
    [chiaveGruppi, nome]
  )
  return [aperto, cambia]
}

export function PannelloScheda({
  occhiello,
  contenuto = 'space-y-4',
  className,
  children,
  ripiegabile = false,
  nome,
  chiaveGruppi,
  apertoDefault = true,
}: {
  occhiello: ReactNode

  contenuto?: string
  className?: string
  children: ReactNode

  ripiegabile?: boolean

  nome?: string

  chiaveGruppi?: string

  apertoDefault?: boolean
}) {
  const nomeGruppo = nome ?? (typeof occhiello === 'string' ? occhiello : undefined)

  const [aperto, cambia] = useGruppoRipiegato(ripiegabile ? chiaveGruppi : undefined, nomeGruppo, {
    apertoDefault,
  })

  if (!ripiegabile) {
    return (
      <section className={cn('min-w-0', className)} data-gruppo=''>
        <p className={cn(EYEBROW, 'mb-3 border-b pb-1.5')}>{occhiello}</p>
        <div className={contenuto}>{children}</div>
      </section>
    )
  }

  return (
    <Collapsible asChild open={aperto} onOpenChange={cambia}>
      <section className={cn('min-w-0', className)} data-gruppo='' data-ripiegabile=''>
        <CollapsibleTrigger asChild>
          <button
            type='button'
            className={cn(
              EYEBROW,
              'hover:text-foreground focus-visible:ring-ring flex w-full items-center justify-between gap-2 rounded-sm border-b pb-1.5 text-start outline-none focus-visible:ring-2',
              aperto && 'mb-3'
            )}
          >
            <span className='min-w-0 truncate'>{occhiello}</span>
            <ChevronDownIcon
              className={cn(
                'text-muted-foreground size-3.5 shrink-0 transition-transform',
                aperto && 'rotate-180'
              )}
              aria-hidden
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className={contenuto}>{children}</CollapsibleContent>
      </section>
    </Collapsible>
  )
}

export function RigaDettaglio({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className='flex items-baseline justify-between gap-3 text-sm'>
      <span className='text-muted-foreground shrink-0'>{label}</span>
      <span className='min-w-0 text-end font-medium'>{children}</span>
    </div>
  )
}

export function RigaRimando({ href, sopra, titolo }: { href: string; sopra: ReactNode; titolo: string }) {
  return (
    <Link
      href={href}
      className='hover:bg-accent flex w-full flex-col items-start gap-0.5 rounded-md px-1.5 py-1.5 text-start transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring'
    >
      <span className='flex items-center gap-2'>{sopra}</span>
      <span className='line-clamp-2 min-w-0 text-sm'>{titolo}</span>
    </Link>
  )
}
