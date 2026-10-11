'use client'

// Pannello "/emergenza": console di dispatch SIMULATA (SPEC §8). Coda delle cadute, scheda della
// segnalazione modellata sull'MSD eCall, scheda rossa a schermo intero con suono per le priorità alte.
// Testo fisso obbligatorio: "SIMULAZIONE — nessuna chiamata reale al 112". Tema scuro (shell).

import { ExternalLinkIcon, SirenIcon } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { Vivo } from '@/components/casco/vivo'
import { Avviso } from '@/components/ds/avviso'
import { EmptyState } from '@/components/ds/empty-state'
import { Interruttore } from '@/components/ds/interruttore'
import PageHeader from '@/components/ds/page-header'
import { Scelta } from '@/components/ds/scelta'
import { SectionCard } from '@/components/ds/section-card'
import { StatusBadge } from '@/components/ds/status-badge'
import { Button } from '@/components/ui/button'
import {
  cambiaStato,
  etichettaTipo,
  fmtDataOraCompleta,
  fmtOra,
  misura,
  NOTA_TIPO,
  STATI,
  TIPI_CADUTA,
  type Evento,
  type Stato,
} from '@/lib/casco/api'
import { useEventi } from '@/lib/casco/use-eventi'
import { cn } from '@/lib/utils'

const Mappa = dynamic(() => import('@/components/casco/mappa').then(m => m.Mappa), {
  ssr: false,
  loading: () => <div className='bg-muted h-full w-full animate-pulse rounded-lg' />,
})

const PERIODI = [
  { value: '1', label: 'Ultime 24 ore' },
  { value: '7', label: 'Ultimi 7 giorni' },
  { value: '90', label: 'Ultimi 90 giorni' },
]
const QUERY = `type=${TIPI_CADUTA.join(',')}`
const CHIUSI: Stato[] = ['RISOLTO', 'FALSO_POSITIVO']

const pad = (n: number) => String(n).padStart(2, '0')
function trascorso(ts: string) {
  let s = Math.max(0, Math.floor((Date.now() - new Date(ts).getTime()) / 1000))
  const g = Math.floor(s / 86400)
  s %= 86400
  const t = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`
  return g ? `${g} g ${t}` : t
}
function esitoAllarme(e: Evento) {
  const s = e.features?.still_s
  const fermo = s == null ? '—' : `${s} s`
  if (e.alarm_state === 'SENT') return `Allarme inviato automaticamente dopo ${fermo} di immobilità; non annullato dall'utente.`
  if (e.alarm_state === 'CANCELED') return `Allarme annullato dall'utente durante il conto alla rovescia (immobilità ${fermo}).`
  if (e.alarm_state === 'MOVEMENT_RESUMED') return `Allarme non inviato: la persona si è mossa dopo la caduta (immobilità ${fermo}).`
  return 'Nessun allarme.'
}

export default function PaginaEmergenza() {
  const [giorni, setGiorni] = useState(1)
  const [selezionatoId, setSelezionatoId] = useState<number | null>(null)
  const [nonLetti, setNonLetti] = useState<Set<number>>(() => new Set())
  const [allarmeId, setAllarmeId] = useState<number | null>(null) // scheda rossa a schermo intero
  const [audio, setAudio] = useState(false)
  const audioRef = useRef(false)
  const ctxRef = useRef<AudioContext | null>(null)
  const [adesso, setAdesso] = useState(() => Date.now())
  const avviato = useRef(false)

  // ---- avviso acustico: tono breve e discreto, al massimo 3 volte ----
  const tono = useCallback((volte: number) => {
    const ctx = ctxRef.current
    if (!ctx || !audioRef.current) return
    for (let i = 0; i < Math.min(volte, 3); i++) {
      const t0 = ctx.currentTime + i * 1.1
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = 740
      g.gain.setValueAtTime(0, t0)
      g.gain.linearRampToValueAtTime(0.12, t0 + 0.02)
      g.gain.linearRampToValueAtTime(0, t0 + 0.18)
      o.connect(g).connect(ctx.destination)
      o.start(t0)
      o.stop(t0 + 0.2)
    }
  }, [])
  const impostaAudio = (acceso: boolean) => {
    setAudio(acceso)
    audioRef.current = acceso
    if (acceso) {
      ctxRef.current = ctxRef.current ?? new AudioContext()
      void ctxRef.current.resume()
      tono(1)
    }
  }

  // ---- nuovi eventi: non letti; priorità alta → tono, scheda rossa e selezione ----
  const onNuovi = useCallback(
    (nuovi: Evento[]) => {
      setNonLetti(prev => new Set([...prev, ...nuovi.map(e => e.id)]))
      const alta = nuovi.filter(e => e.emergency).at(-1)
      if (alta) {
        tono(3)
        setSelezionatoId(alta.id)
        setAllarmeId(alta.id)
      }
    },
    [tono]
  )
  const { eventi, online, aggiornatoAlle, applica } = useEventi({ query: QUERY, ricaricaMs: 20000, onNuovi })

  const daMs = adesso - giorni * 86400000
  const coda = useMemo(
    () => eventi.filter(e => new Date(e.ts).getTime() >= daMs).sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()),
    [eventi, daMs]
  )
  const selezionato = eventi.find(e => e.id === selezionatoId) ?? null
  const allarme = eventi.find(e => e.id === allarmeId) ?? null

  // all'apertura seleziono la segnalazione ad alta priorità più recente ancora aperta
  useEffect(() => {
    if (avviato.current || eventi.length === 0) return
    avviato.current = true
    const aperta = coda.find(e => e.emergency && !CHIUSI.includes(e.status))
    if (aperta) setSelezionatoId(aperta.id)
  }, [eventi, coda])

  useEffect(() => {
    const t = setInterval(() => setAdesso(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const seleziona = (id: number) => {
    setSelezionatoId(id)
    setNonLetti(prev => {
      const n = new Set(prev)
      n.delete(id)
      return n
    })
  }
  const aggiornaStato = async (e: Evento, s: Stato) => {
    try {
      applica(await cambiaStato(e, s))
      toast.success(`Segnalazione #${e.id}: ${STATI[s].label}`)
      if (allarmeId === e.id) setAllarmeId(null)
    } catch {
      toast.error('Cambio stato non riuscito: server non raggiungibile?')
    }
  }

  return (
    <div className='flex flex-col gap-4'>
      <Avviso tono='destructive' className='px-3 py-2 text-center text-sm font-semibold tracking-wide'>
        AMBIENTE DI SIMULAZIONE — nessuna chiamata reale al 112 · Demo HackTurin, include dati storici simulati
      </Avviso>
      <PageHeader
        title='Centrale operativa — Simulazione allarmi'
        description='Cadute e impatti rilevati dai caschi, con esito dell’allarme automatico. Pagina dimostrativa: nessun servizio reale.'
        badges={
          <>
            <Vivo online={online} alle={aggiornatoAlle} />
            <StatusBadge tone='muted' variant='bordata' size='sm'>
              <span className='font-mono tabular-nums'>{new Date(adesso).toLocaleTimeString('it-IT')}</span>
            </StatusBadge>
          </>
        }
        actions={
          <>
            <Interruttore etichetta='Avviso acustico' acceso={audio} onAcceso={impostaAudio} />
            <Scelta opzioni={PERIODI} value={String(giorni)} onValueChange={v => setGiorni(Number(v))} />
          </>
        }
      />

      <div className='grid gap-4 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]'>
        <SectionCard title={`Coda segnalazioni · ${coda.length}`} info='Più recenti in alto. Rosso = allarme inviato (priorità alta).'>
          {coda.length === 0 ? (
            <EmptyState compatto testo='Nessuna segnalazione nel periodo.' />
          ) : (
            <ol className='flex max-h-[70vh] flex-col gap-1 overflow-y-auto'>
              {coda.map(e => (
                <li key={e.id}>
                  <button
                    type='button'
                    onClick={() => seleziona(e.id)}
                    aria-current={e.id === selezionatoId}
                    className={cn(
                      'grid w-full grid-cols-[4rem_1fr] gap-x-3 gap-y-0.5 rounded-md border-l-4 px-3 py-2 text-left text-sm transition-colors',
                      e.emergency ? 'border-l-destructive' : 'border-l-transparent',
                      e.id === selezionatoId ? 'bg-accent' : 'hover:bg-muted'
                    )}
                  >
                    <StatusBadge tone={e.emergency ? 'destructive' : 'muted'} variant={e.emergency ? 'badge' : 'bordata'} size='sm'>
                      {e.emergency ? 'ALTA' : 'MEDIA'}
                    </StatusBadge>
                    <span className='font-semibold'>{etichettaTipo(e.type)}</span>
                    <span className='font-mono text-xs tabular-nums'>{fmtOra(e.ts)}</span>
                    <span className='text-muted-foreground flex flex-wrap items-center gap-1 text-xs'>
                      {nonLetti.has(e.id) && <span className='text-foreground font-bold'>NUOVA ·</span>}
                      {STATI[e.status].label}
                      {e.source === 'simulator' && <TagSim>SIM</TagSim>}
                      {e.source === 'demo_seed' && <TagSim>STORICO SIM.</TagSim>}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </SectionCard>

        {selezionato ? (
          <Scheda e={selezionato} adesso={adesso} onStato={aggiornaStato} />
        ) : (
          <SectionCard title='Segnalazione'>
            <EmptyState icon={SirenIcon} title='Nessuna segnalazione selezionata' description='Scegli una voce dalla coda.' />
          </SectionCard>
        )}
      </div>

      {allarme && (
        <SchedaRossa e={allarme} onPresaInCarico={() => aggiornaStato(allarme, 'IN_LAVORAZIONE')} onChiudi={() => setAllarmeId(null)} />
      )}
    </div>
  )
}

// ---- scheda della segnalazione (campi modellati sull'MSD eCall) ----
function Scheda({ e, adesso, onStato }: { e: Evento; adesso: number; onStato: (e: Evento, s: Stato) => void }) {
  const f = e.features ?? {}
  const urto =
    f.shock_to_impact_ms != null && f.shock_to_impact_ms >= 0
      ? `${misura(f.shock_peak_g, 'g')} · ${f.shock_to_impact_ms} ms prima`
      : 'nessuno'
  const ns = e.lat >= 0 ? 'N' : 'S'
  const ew = e.lon >= 0 ? 'E' : 'W'
  void adesso // il tempo trascorso si aggiorna perché il genitore ridisegna ogni secondo
  return (
    <div className='flex min-w-0 flex-col gap-4'>
      <div className='flex flex-wrap items-center gap-3'>
        <StatusBadge tone={e.emergency ? 'destructive' : 'muted'} variant={e.emergency ? 'badge' : 'bordata'}>
          {e.emergency ? 'PRIORITÀ ALTA' : 'PRIORITÀ MEDIA'}
        </StatusBadge>
        <h2 className='text-xl font-semibold'>{etichettaTipo(e.type)}</h2>
        <StatusBadge tone={STATI[e.status].tone} dot variant='bordata'>
          {STATI[e.status].label}
        </StatusBadge>
        {e.source === 'simulator' && <TagSim>SIM</TagSim>}
        {e.source === 'demo_seed' && <TagSim>STORICO SIM.</TagSim>}
      </div>
      <p className='text-muted-foreground text-sm'>
        {NOTA_TIPO[e.type]} Classificazione automatica indicativa{e.classifier ? ` (${e.classifier})` : ''}.
      </p>

      <div className='grid gap-4 lg:grid-cols-2'>
        <SectionCard title='Segnalazione'>
          <Riga label='ID evento'>
            <span className='font-mono text-xs'>{e.event_id}</span>
          </Riga>
          <Riga label='Ora evento'>
            <span className='font-mono'>{fmtDataOraCompleta(e.ts)}</span>
          </Riga>
          <Riga label='Ora ricezione'>
            <span className='font-mono'>{fmtDataOraCompleta(e.received_at)}</span>
          </Riga>
          <Riga label='Tempo trascorso'>
            <span className='font-mono text-lg tabular-nums'>{trascorso(e.ts)}</span>
          </Riga>
        </SectionCard>

        <SectionCard title='Esito dell’allarme'>
          <p className='text-sm'>{esitoAllarme(e)}</p>
          <div className='mt-3 flex flex-col gap-1'>
            <Riga label='Dispositivo'>
              <span className='font-mono text-xs'>{e.device_id ?? '—'}</span>
            </Riga>
            <Riga label='Origine'>
              {e.source === 'simulator' ? (
                <b>Evento generato dal simulatore</b>
              ) : e.source === 'demo_seed' ? (
                <b>Dato storico simulato (script di seed)</b>
              ) : (
                'Casco (dispositivo reale)'
              )}
            </Riga>
          </div>
        </SectionCard>

        <SectionCard title='Posizione (WGS84)'>
          <div className='font-mono text-lg'>
            {Math.abs(e.lat).toFixed(6)}° {ns}, {Math.abs(e.lon).toFixed(6)}° {ew}
          </div>
          <p className='text-muted-foreground mt-1 text-xs'>
            Posizione {e.position_source === 'simulated_route' ? 'simulata (percorso predefinito, nessun GPS)' : e.position_source}
          </p>
          <Mappa key={e.id} className='mt-3 h-56' eventi={[e]} centro={[e.lat, e.lon]} zoom={16} />
          <Button variant='outline' size='sm' className='mt-3' asChild>
            <a href={`/comune?focus=${e.id}`} target='_blank' rel='noreferrer'>
              <ExternalLinkIcon /> Apri nella dashboard Comune
            </a>
          </Button>
        </SectionCard>

        <SectionCard title='Dati del sensore'>
          <Riga label='Picco impatto'>
            <span className='font-mono'>{misura(f.impact_peak_g, 'g')}</span>
          </Riga>
          <Riga label='Rotazione della testa'>
            <span className='font-mono'>{misura(f.rotation_deg, '°', 0)}</span>
          </Riga>
          <Riga label='Immobilità misurata'>
            <span className='font-mono'>{misura(f.still_s, 's')}</span>
          </Riga>
          <Riga label='Urto precedente'>
            <span className='font-mono'>{urto}</span>
          </Riga>
          <div className='mt-4 flex flex-wrap gap-2'>
            <Button onClick={() => onStato(e, 'IN_LAVORAZIONE')} disabled={e.status === 'IN_LAVORAZIONE' || e.status === 'RISOLTO'}>
              Presa in carico
            </Button>
            <Button variant='outline' onClick={() => onStato(e, 'RISOLTO')} disabled={e.status === 'RISOLTO'}>
              Chiudi
            </Button>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

// ---- scheda rossa a schermo intero per un allarme appena arrivato (SPEC §8) ----
function SchedaRossa({ e, onPresaInCarico, onChiudi }: { e: Evento; onPresaInCarico: () => void; onChiudi: () => void }) {
  return (
    <div
      role='alertdialog'
      aria-modal='true'
      aria-label='Allarme simulato'
      className='bg-destructive text-destructive-foreground fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 p-8 text-center'
    >
      <SirenIcon className='size-16 animate-pulse' />
      <div className='text-sm font-semibold tracking-widest uppercase opacity-90'>SIMULAZIONE — nessuna chiamata reale al 112</div>
      <h2 className='text-4xl font-bold'>{etichettaTipo(e.type)}</h2>
      <p className='max-w-xl text-lg'>
        Allarme inviato automaticamente alle <span className='font-mono'>{fmtOra(e.ts)}</span>
        {e.features?.still_s != null ? ` dopo ${e.features.still_s} s di immobilità` : ''}. Dispositivo{' '}
        <span className='font-mono'>{e.device_id ?? '—'}</span>.
      </p>
      <p className='font-mono text-xl'>
        {Math.abs(e.lat).toFixed(6)}° {e.lat >= 0 ? 'N' : 'S'}, {Math.abs(e.lon).toFixed(6)}° {e.lon >= 0 ? 'E' : 'W'}
      </p>
      <div className='flex flex-wrap justify-center gap-3'>
        <Button size='lg' variant='secondary' onClick={onPresaInCarico}>
          Presa in carico
        </Button>
        <Button size='lg' variant='outline' className='border-white/60 bg-transparent text-white hover:bg-white/10' onClick={onChiudi}>
          Chiudi avviso
        </Button>
      </div>
    </div>
  )
}

function TagSim({ children }: { children: ReactNode }) {
  return <span className='rounded-sm border px-1 text-[0.7rem] font-bold'>{children}</span>
}

function Riga({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className='grid grid-cols-[9.5rem_minmax(0,1fr)] gap-2 py-0.5 text-sm'>
      <span className='text-muted-foreground'>{label}</span>
      <span className='min-w-0 break-words'>{children}</span>
    </div>
  )
}
