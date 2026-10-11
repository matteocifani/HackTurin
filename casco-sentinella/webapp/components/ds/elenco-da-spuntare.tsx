/** Checklist with optional search and detail lines. Part of the IAMAimpresa design system. */
'use client'

import type { ReactNode } from 'react'

import { SearchIcon } from 'lucide-react'

import { EmptyState } from '@/components/ds/empty-state'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export type VoceDaSpuntare = {
  valore: string
  etichetta: ReactNode

  dettaglio?: ReactNode

  bloccata?: boolean

  nomeAccessibile?: string
}

export type ElencoDaSpuntareProps = {
  voci: readonly VoceDaSpuntare[]
  scelte: readonly string[]
  onAlterna: (valore: string) => void

  ricerca?: { valore: string; onCambia: (testo: string) => void; segnaposto: string; azione?: ReactNode }

  testa?: ReactNode

  vuoto: ReactNode

  dettaglio?: 'accanto' | 'sotto'

  altezza?: 'bassa' | 'alta' | 'libera'

  cornice?: boolean
  disabled?: boolean
  className?: string
}

export function ElencoDaSpuntare({
  voci,
  scelte,
  onAlterna,
  ricerca,
  testa,
  vuoto,
  dettaglio = 'accanto',
  altezza = 'alta',
  cornice = true,
  disabled = false,
  className,
}: ElencoDaSpuntareProps) {
  return (
    <div className={cn(cornice && 'overflow-hidden rounded-md border', className)}>
      {ricerca != null && (
        <div className={cn('flex items-center gap-2', cornice ? 'border-b p-2' : 'pb-2')}>
          <div className='relative min-w-0 flex-1'>
            <SearchIcon className='text-muted-foreground pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2' />
            <Input
              value={ricerca.valore}
              onChange={e => ricerca.onCambia(e.target.value)}
              placeholder={ricerca.segnaposto}
              aria-label={ricerca.segnaposto}
              className='ps-8'
              disabled={disabled}
            />
          </div>
          {ricerca.azione}
        </div>
      )}

      {testa != null && <div className={cn(cornice ? 'border-b p-2' : 'pb-2')}>{testa}</div>}

      <ul
        className={cn(
          cornice && 'p-1',
          altezza !== 'libera' && 'overflow-y-auto',
          altezza === 'alta' && 'max-h-72',
          altezza === 'bassa' && 'max-h-56'
        )}
      >
        {voci.length === 0 ? (
          <EmptyState compatto come='li' testo={vuoto} className='px-2 py-6 text-center' />
        ) : (
          voci.map(v => {
            const spuntata = v.bloccata === true || scelte.includes(v.valore)
            const ferma = disabled || v.bloccata === true
            return (
              <li key={v.valore}>
                <label
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2 py-1.5 max-md:min-h-11',
                    dettaglio === 'sotto' && 'items-start',
                    ferma ? 'cursor-default' : 'hover:bg-accent cursor-pointer',
                    v.bloccata === true && 'opacity-60'
                  )}
                >
                  <Checkbox
                    checked={spuntata}
                    disabled={ferma}
                    aria-label={v.nomeAccessibile}
                    onCheckedChange={() => onAlterna(v.valore)}
                    className={cn(dettaglio === 'sotto' && 'mt-0.5')}
                  />
                  {dettaglio === 'sotto' ? (
                    <span className='min-w-0 flex-1'>
                      <span className='block truncate text-sm'>{v.etichetta}</span>
                      {v.dettaglio != null && (
                        <span className='text-foreground-secondary block truncate text-xs'>
                          {v.dettaglio}
                        </span>
                      )}
                    </span>
                  ) : (
                    <>
                      <span className='min-w-0 flex-1 truncate text-sm'>{v.etichetta}</span>
                      {v.dettaglio != null && (
                        <span className='text-muted-foreground max-w-1/2 shrink-0 truncate text-xs'>
                          {v.dettaglio}
                        </span>
                      )}
                    </>
                  )}
                </label>
              </li>
            )
          })
        )}
      </ul>
    </div>
  )
}
