'use client'

// Mappa pubblica "/" (SPEC §8): dati ridotti (public=1, coordinate arrotondate), periodo, filtri per tipo
// con contatori (fanno anche da legenda), heatmap pesata per severità, animazione sui nuovi eventi.

import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'

import { Vivo } from '@/components/casco/vivo'
import { Interruttore } from '@/components/ds/interruttore'
import PageHeader from '@/components/ds/page-header'
import { Scelta } from '@/components/ds/scelta'
import { SectionCard } from '@/components/ds/section-card'
import { Checkbox } from '@/components/ui/checkbox'
import { isoGiorniFa, ORDINE_TIPI, TIPI, type TipoEvento } from '@/lib/casco/api'
import { useEventi } from '@/lib/casco/use-eventi'

const Mappa = dynamic(() => import('@/components/casco/mappa').then(m => m.Mappa), {
  ssr: false,
  loading: () => <div className='bg-muted h-full w-full animate-pulse rounded-lg' />,
})

const PERIODI = [
  { value: '7', label: 'Ultimi 7 giorni' },
  { value: '30', label: 'Ultimi 30 giorni' },
  { value: '90', label: 'Ultimi 90 giorni' },
]

export default function PaginaPubblica() {
  const [giorni, setGiorni] = useState(30)
  const query = useMemo(() => `public=1&from=${encodeURIComponent(isoGiorniFa(giorni))}`, [giorni])
  const { eventi, freschi, online, aggiornatoAlle } = useEventi({ query, ricaricaMs: 30000, notifiche: true })
  const [tipiAttivi, setTipiAttivi] = useState<Set<TipoEvento>>(() => new Set(ORDINE_TIPI))
  const [calore, setCalore] = useState(true)
  const [marker, setMarker] = useState(true)

  const da = Date.now() - giorni * 86400000
  const visibili = eventi.filter(e => e.status !== 'FALSO_POSITIVO' && new Date(e.ts).getTime() >= da)
  const conteggi = Object.fromEntries(ORDINE_TIPI.map(t => [t, 0])) as Record<TipoEvento, number>
  for (const e of visibili) conteggi[e.type] = (conteggi[e.type] ?? 0) + 1
  const mostrati = visibili.filter(e => tipiAttivi.has(e.type))

  function alterna(t: TipoEvento, acceso: boolean) {
    setTipiAttivi(prev => {
      const n = new Set(prev)
      if (acceso) n.add(t)
      else n.delete(t)
      return n
    })
  }

  return (
    <div className='flex flex-col gap-4'>
      <PageHeader
        title='Mappa aperta di Torino'
        description='Buche e cadute segnalate dai caschi. Coordinate arrotondate a ~100 m, nessun dato personale.'
        badges={<Vivo online={online} alle={aggiornatoAlle} />}
        actions={<Scelta opzioni={PERIODI} value={String(giorni)} onValueChange={v => setGiorni(Number(v))} />}
      />
      <div className='grid gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]'>
        <div className='flex flex-col gap-4'>
          <SectionCard title={`Eventi per tipo · ${visibili.length}`}>
            <div className='flex flex-col gap-1'>
              {ORDINE_TIPI.map(t => (
                <label key={t} className='flex cursor-pointer items-center gap-2 py-1 text-sm'>
                  <Checkbox checked={tipiAttivi.has(t)} onCheckedChange={v => alterna(t, v === true)} />
                  <span className='size-3 shrink-0 rounded-full border border-black/20' style={{ background: TIPI[t].colore }} />
                  <span className='min-w-0 flex-1 truncate'>{TIPI[t].label}</span>
                  <span className='font-semibold tabular-nums'>{conteggi[t]}</span>
                </label>
              ))}
            </div>
          </SectionCard>
          <SectionCard title='Livelli'>
            <div className='flex flex-col gap-3'>
              <Interruttore etichetta='Heatmap (pesata per severità)' acceso={calore} onAcceso={setCalore} />
              <Interruttore etichetta='Singoli eventi' acceso={marker} onAcceso={setMarker} />
            </div>
          </SectionCard>
          <SectionCard title='Legenda'>
            <p className='text-muted-foreground text-sm leading-relaxed'>
              Cerchio pieno con bordo bianco = rilevato dal casco.
              <br />
              Cerchio chiaro tratteggiato = dato SIMULATO (storico o simulatore).
              <br />
              Etichetta &laquo;SIM&raquo; = evento generato dal simulatore del casco.
              <br />
              Dimensione = severità (1–5).
              <br />
              <br />
              &laquo;Impatto violento&raquo; indica un impatto compatibile con un urto, non un investimento accertato.
              Posizione dei caschi simulata (nessun GPS nel prototipo).
            </p>
          </SectionCard>
        </div>
        <Mappa className='h-[calc(100dvh-17rem)] min-h-[420px]' eventi={mostrati} freschi={freschi} calore={calore} marker={marker} />
      </div>
    </div>
  )
}
