/** Title edited in place, saved on blur. Part of the IAMAimpresa design system. */
'use client'

import { createElement, useEffect, useRef, useState, type ReactNode } from 'react'

import { Textarea } from '@/components/ui/textarea'
import { eseguiConEsito } from '@/lib/esegui-con-esito'
import { cn } from '@/lib/utils'

export type EsitoTitolo = { ok: boolean; motivo?: string }

const SCALA = 'min-w-0 text-xl leading-snug font-semibold break-normal lg:text-2xl'

const SCALA_RIGA = 'min-w-0 text-sm leading-snug break-normal'

const CAMPO_RIGA =
  'hover:bg-accent field-sizing-content -mx-1.5 min-h-0 w-[calc(100%+0.75rem)] resize-none rounded-md border border-transparent px-1.5 py-0.5 !text-sm leading-snug break-normal shadow-none focus-visible:border-ring focus-visible:ring-0'

export function TitoloModificabile({
  valore,
  salva,
  etichetta,
  minimo = 2,
  guscio = 'h1',
  dopo,
  taglia = 'titolo',
  className,
}: {
  valore: string

  salva?: (testo: string) => Promise<EsitoTitolo>

  etichetta: string

  minimo?: number

  guscio?: 'h1' | 'nessuno'

  dopo?: ReactNode

  taglia?: 'titolo' | 'riga'

  className?: string
}) {
  const [bozza, setBozza] = useState(valore)
  const [errore, setErrore] = useState<string | null>(null)
  const [inCorso, setInCorso] = useState(false)
  const ignoraUscita = useRef(false)

  useEffect(() => setBozza(valore), [valore])

  const riga = taglia === 'riga'
  const involucro = riga ? 'nessuno' : guscio
  const scala = riga ? SCALA_RIGA : SCALA

  if (salva == null) {
    const titolo =
      involucro === 'nessuno' ? (
        <p className={cn(scala, className)}>{valore}</p>
      ) : (
        <h1 className={cn(scala, className)}>{valore}</h1>
      )
    if (dopo == null) return titolo
    return (
      <div className='flex min-w-0 items-baseline gap-x-2'>
        {titolo}
        <span className='shrink-0'>{dopo}</span>
      </div>
    )
  }

  const conferma = () => {
    const testo = bozza.replace(/\s+/g, ' ').trim()
    if (testo.length < minimo || testo === valore) {
      setBozza(valore)
      return
    }
    if (inCorso) return
    setInCorso(true)
    setErrore(null)
    eseguiConEsito(
      salva(testo),
      r => {
        if (!r.ok) {
          setErrore(r.motivo ?? (riga ? 'Il nome non è stato salvato.' : 'Il titolo non è stato salvato.'))
          setBozza(valore)
        }
      },
      { infine: () => setInCorso(false) }
    )
  }

  const campo = (
    <Textarea
      value={bozza}
      rows={1}

      size='title'

      variant='piatta'
      aria-label={etichetta}
      disabled={inCorso}
      onChange={e => setBozza(e.target.value.replace(/\n/g, ' '))}
      onBlur={() => {
        if (ignoraUscita.current) {
          ignoraUscita.current = false
          return
        }
        conferma()
      }}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          e.preventDefault()
          e.currentTarget.blur()
        }
        if (e.key === 'Escape') {
          e.preventDefault()
          ignoraUscita.current = true
          setBozza(valore)
          e.currentTarget.blur()
        }
      }}
      className={cn(
        riga
          ? CAMPO_RIGA
          : 'hover:bg-accent field-sizing-content -mx-1.5 min-h-0 w-[calc(100%+0.75rem)] resize-none rounded-md border border-transparent px-1.5 py-0 !text-xl leading-snug font-semibold break-normal shadow-none focus-visible:border-ring focus-visible:ring-0 max-md:!text-xl lg:!text-2xl',

        dopo != null && 'absolute top-0 -start-1.5 m-0 h-full',
        className
      )}
    />
  )

  const avviso = errore != null && (
    <p role='status' className='text-destructive text-xs'>
      {errore}
    </p>
  )

  if (dopo != null) {
    const specchio = (
      <span
        aria-hidden
        className={
          riga
            ? 'invisible block border border-transparent py-0.5 text-sm leading-snug break-normal whitespace-pre-wrap max-md:text-base'
            : 'invisible block border border-transparent text-xl leading-snug font-semibold break-normal whitespace-pre-wrap lg:text-2xl'
        }
      >
        {`${bozza} `}
      </span>
    )
    return (
      <div className='min-w-0'>
        <div className='group/titolo flex min-w-0 items-baseline gap-x-2'>
          {createElement(
            involucro === 'nessuno' ? 'div' : 'h1',
            { className: 'relative min-w-0 break-normal group-focus-within/titolo:flex-1' },
            specchio,
            campo
          )}
          <span className='shrink-0 group-focus-within/titolo:hidden'>{dopo}</span>
        </div>
        {avviso}
      </div>
    )
  }

  return (
    <div className='min-w-0'>
      {involucro === 'nessuno' ? campo : <h1 className='min-w-0 break-normal'>{campo}</h1>}
      {avviso}
    </div>
  )
}
