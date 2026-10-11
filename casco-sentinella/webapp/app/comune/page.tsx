'use client'

// Dashboard Comune "/comune" (SPEC §8): KPI, mappa con caschi e eventi, top hotspot, grafici,
// tabella con filtri, pannello di dettaglio con cambio stato, export CSV.

import type { ColumnDef } from '@tanstack/react-table'
import {
  ActivityIcon,
  AlertTriangleIcon,
  CircleDotIcon,
  DownloadIcon,
  HardHatIcon,
  InboxIcon,
  RadioIcon,
  TagIcon,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import { toast } from 'sonner'

import type { Fuoco } from '@/components/casco/mappa'
import { Vivo } from '@/components/casco/vivo'
import { Avviso } from '@/components/ds/avviso'
import { CHART_AXIS_TICK, CHART_GRID, ChartCard, ChartTip, LegendPill } from '@/components/ds/chart-frame'
import { DataTable } from '@/components/ds/data-table'
import { EmptyState } from '@/components/ds/empty-state'
import { InfoDot } from '@/components/ds/info-dot'
import { FacetToolbar, type FacetSpec } from '@/components/ds/facet-toolbar'
import { BarraParti } from '@/components/ds/grafico-barra-parti'
import { KpiCard, KpiGrid } from '@/components/ds/kpi-card'
import { MeterRow } from '@/components/ds/meter-row'
import PageHeader from '@/components/ds/page-header'
import { Scelta } from '@/components/ds/scelta'
import { SectionCard } from '@/components/ds/section-card'
import { StatusBadge } from '@/components/ds/status-badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  ALLARME,
  api,
  cambiaStato,
  coloreTipo,
  etichettaTipo,
  FASCE,
  FASCIA_LABEL,
  fmtDataOra,
  fmtDataOraCompleta,
  FONTI,
  isoGiorniFa,
  misura,
  NOTA_TIPO,
  ORDINE_FONTI,
  ORDINE_STATI,
  ORDINE_TIPI,
  POLL_MS,
  STATI,
  STATI_APERTI,
  TIPI,
  type Dispositivo,
  type Evento,
  type Stato,
  type Stats,
} from '@/lib/casco/api'
import { useEventi } from '@/lib/casco/use-eventi'
import { COLONNA_MAX } from '@/lib/grafici-geometria'

const Mappa = dynamic(() => import('@/components/casco/mappa').then(m => m.Mappa), {
  ssr: false,
  loading: () => <div className='bg-muted h-full w-full animate-pulse rounded-lg' />,
})

const PERIODI = [
  { value: '7', label: 'Ultimi 7 giorni' },
  { value: '30', label: 'Ultimi 30 giorni' },
  { value: '90', label: 'Ultimi 90 giorni' },
]
const OPZIONI_STATO = ORDINE_STATI.map(s => ({ value: s, label: STATI[s].label }))

export default function PaginaComune() {
  const [giorni, setGiorni] = useState(30)
  const { eventi, freschi, online, aggiornatoAlle, applica } = useEventi({ query: '', ricaricaMs: 20000, notifiche: true })
  const [dispositivi, setDispositivi] = useState<Dispositivo[]>([])
  const [stats, setStats] = useState<Stats | null>(null)

  // filtri (tabella e mappa)
  const [cerca, setCerca] = useState('')
  const [tipi, setTipi] = useState<string[]>([])
  const [stati, setStati] = useState<string[]>([])
  const [fonti, setFonti] = useState<string[]>([])
  const [soloAperti, setSoloAperti] = useState(false)
  const [ordine, setOrdine] = useState<{ chiave: string | null; desc: boolean }>({ chiave: 'ts', desc: true })

  const [selezionatoId, setSelezionatoId] = useState<number | null>(null)
  const [fuoco, setFuoco] = useState<Fuoco | null>(null)

  // ---- dati di contorno: caschi (ogni 2 s) e statistiche (ogni 5 s, dipendono dal periodo) ----
  useEffect(() => {
    let vivo = true
    const carica = async () => {
      try {
        const d = await api<Dispositivo[]>('/api/devices')
        if (vivo) setDispositivi(d)
      } catch {
        /* lo segnala già il polling degli eventi */
      }
    }
    void carica()
    const t = setInterval(carica, POLL_MS)
    return () => {
      vivo = false
      clearInterval(t)
    }
  }, [])

  const caricaStats = useCallback(async () => {
    try {
      setStats(await api<Stats>(`/api/stats?from=${encodeURIComponent(isoGiorniFa(giorni))}`))
    } catch {
      /* idem */
    }
  }, [giorni])
  useEffect(() => {
    void caricaStats()
    const t = setInterval(caricaStats, 5000)
    return () => clearInterval(t)
  }, [caricaStats])

  // ---- ?focus=id (link da /emergenza) ----
  const [focusIniziale, setFocusIniziale] = useState<number | null>(null)
  useEffect(() => {
    const f = Number(new URLSearchParams(window.location.search).get('focus'))
    if (f) setFocusIniziale(f)
  }, [])
  useEffect(() => {
    if (focusIniziale == null) return
    const e = eventi.find(x => x.id === focusIniziale)
    if (!e) return
    setFocusIniziale(null)
    setSelezionatoId(e.id)
    setFuoco({ lat: e.lat, lon: e.lon, zoom: 17, chiave: Date.now() })
  }, [eventi, focusIniziale])

  // ---- derivati ----
  const da = Date.now() - giorni * 86400000
  const inizioOggi = new Date().setHours(0, 0, 0, 0)
  const nelPeriodo = useMemo(() => eventi.filter(e => new Date(e.ts).getTime() >= da), [eventi, da])

  const kpi = {
    oggi: eventi.filter(e => new Date(e.ts).getTime() >= inizioOggi && e.status !== 'FALSO_POSITIVO').length,
    aperti: nelPeriodo.filter(e => STATI_APERTI.includes(e.status)).length,
    emergenze: nelPeriodo.filter(e => e.emergency).length,
    caschiOnline: dispositivi.filter(d => d.online).length,
  }

  const q = cerca.trim().toLowerCase()
  const filtrati = useMemo(
    () =>
      nelPeriodo.filter(
        e =>
          (tipi.length === 0 || tipi.includes(e.type)) &&
          (stati.length === 0 || stati.includes(e.status)) &&
          (fonti.length === 0 || fonti.includes(e.source)) &&
          (!soloAperti || STATI_APERTI.includes(e.status)) &&
          (!q || String(e.id) === q || (e.device_id ?? '').toLowerCase().includes(q) || e.event_id.toLowerCase().includes(q))
      ),
    [nelPeriodo, tipi, stati, fonti, soloAperti, q]
  )

  const righe = useMemo(() => {
    const k = ordine.chiave ?? 'ts'
    const dir = ordine.desc ? -1 : 1
    const val = (e: Evento) => (k === 'ts' ? new Date(e.ts).getTime() : ((e as unknown as Record<string, unknown>)[k] ?? ''))
    return [...filtrati].sort((a, b) => {
      const va = val(a) as number | string
      const vb = val(b) as number | string
      return (va < vb ? -1 : va > vb ? 1 : 0) * dir
    })
  }, [filtrati, ordine])

  const selezionato = useMemo(() => eventi.find(e => e.id === selezionatoId) ?? null, [eventi, selezionatoId])

  const serieGiorni = useMemo(() => {
    const n = Math.min(giorni, 30)
    const oggi = new Date()
    oggi.setHours(0, 0, 0, 0)
    const chiave = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    const giorniArr = Array.from({ length: n }, (_, i) => {
      const d = new Date(oggi)
      d.setDate(d.getDate() - (n - 1 - i))
      return d
    })
    const idx = new Map(giorniArr.map((d, i) => [chiave(d), i]))
    const righe = giorniArr.map(d => ({
      giorno: d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
      ...Object.fromEntries(ORDINE_TIPI.map(t => [t, 0])),
    })) as Array<Record<string, number | string>>
    for (const e of nelPeriodo) {
      if (e.status === 'FALSO_POSITIVO') continue
      const i = idx.get(chiave(new Date(e.ts)))
      if (i != null) righe[i][e.type] = (righe[i][e.type] as number) + 1
    }
    return righe
  }, [nelPeriodo, giorni])

  const fasce = useMemo(() => {
    const c = Object.fromEntries(FASCE.map(f => [f, 0])) as Record<string, number>
    for (const e of nelPeriodo) if (e.status !== 'FALSO_POSITIVO' && e.time_slot) c[e.time_slot] = (c[e.time_slot] ?? 0) + 1
    return FASCE.map(f => ({ nome: FASCIA_LABEL[f], valore: c[f] ?? 0 }))
  }, [nelPeriodo])

  // ---- azioni ----
  const aggiornaStato = useCallback(
    async (e: Evento, s: Stato) => {
      try {
        const upd = await cambiaStato(e, s)
        applica(upd)
        toast.success(`Evento #${upd.id}: ${STATI[s].label}`)
        void caricaStats()
      } catch {
        toast.error('Cambio stato non riuscito: server non raggiungibile?')
      }
    },
    [applica, caricaStats]
  )
  const inquadra = useCallback((e: Evento) => setFuoco({ lat: e.lat, lon: e.lon, zoom: 17, chiave: Date.now() }), [])
  const apriRiga = useCallback(
    (e: Evento) => {
      setSelezionatoId(e.id)
      inquadra(e)
    },
    [inquadra]
  )

  // ---- tabella ----
  const colonne = useMemo<ColumnDef<Evento>[]>(
    () => [
      {
        id: 'id',
        accessorKey: 'id',
        header: '#',
        cell: ({ row }) => <span className='text-muted-foreground tabular-nums'>{row.original.id}</span>,
      },
      {
        id: 'ts',
        accessorKey: 'ts',
        header: 'Data',
        cell: ({ row }) => <span className='tabular-nums'>{fmtDataOra(row.original.ts)}</span>,
      },
      {
        id: 'type',
        accessorKey: 'type',
        header: 'Tipo',
        cell: ({ row }) => (
          <span className='flex items-center gap-2'>
            <span className='size-2.5 shrink-0 rounded-full border border-black/20' style={{ background: coloreTipo(row.original.type) }} />
            {etichettaTipo(row.original.type)}
          </span>
        ),
      },
      {
        id: 'severity',
        accessorKey: 'severity',
        header: 'Sev.',
        cell: ({ row }) => <span className='font-semibold tabular-nums'>{row.original.severity}</span>,
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Stato',
        cell: ({ row }) => (
          <StatusBadge tone={STATI[row.original.status].tone} dot size='sm'>
            {STATI[row.original.status].label}
          </StatusBadge>
        ),
      },
      {
        id: 'source',
        accessorKey: 'source',
        header: 'Fonte',
        cell: ({ row }) => (
          <StatusBadge tone={FONTI[row.original.source].tone} size='sm'>
            {FONTI[row.original.source].label}
          </StatusBadge>
        ),
      },
      { id: 'alarm_state', accessorKey: 'alarm_state', header: 'Allarme', cell: ({ row }) => ALLARME[row.original.alarm_state] },
      {
        id: 'device_id',
        accessorKey: 'device_id',
        header: 'Dispositivo',
        cell: ({ row }) => <span className='font-mono text-xs'>{row.original.device_id ?? '—'}</span>,
      },
    ],
    []
  )

  const alternaIn = (set: (f: (prev: string[]) => string[]) => void) => (v: string) =>
    set(prev => (prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]))
  const conteggio = (campo: keyof Evento) => {
    const c = new Map<string, number>()
    for (const e of nelPeriodo) c.set(String(e[campo]), (c.get(String(e[campo])) ?? 0) + 1)
    return c
  }
  const nTipi = conteggio('type')
  const nStati = conteggio('status')
  const nFonti = conteggio('source')
  const facets: FacetSpec[] = [
    {
      key: 'tipo',
      label: 'Tipo',
      icon: TagIcon,
      options: ORDINE_TIPI.map(t => ({ value: t, label: TIPI[t].label, count: nTipi.get(t) ?? 0 })),
      selected: tipi,
      onToggle: alternaIn(setTipi),
    },
    {
      key: 'stato',
      label: 'Stato',
      icon: CircleDotIcon,
      options: ORDINE_STATI.map(s => ({ value: s, label: STATI[s].label, count: nStati.get(s) ?? 0 })),
      selected: stati,
      onToggle: alternaIn(setStati),
    },
    {
      key: 'fonte',
      label: 'Fonte',
      icon: RadioIcon,
      options: ORDINE_FONTI.map(f => ({ value: f, label: FONTI[f].label, count: nFonti.get(f) ?? 0 })),
      selected: fonti,
      onToggle: alternaIn(setFonti),
    },
  ]
  const filtriAttivi = tipi.length + stati.length + fonti.length + (soloAperti ? 1 : 0)
  const azzeraFiltri = () => {
    setTipi([])
    setStati([])
    setFonti([])
    setSoloAperti(false)
    setCerca('')
  }

  const hotspots = stats?.top_hotspots ?? []
  const maxScore = Math.max(1, ...hotspots.map(h => h.score))

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader
        title='Dashboard Comune'
        description='Segnalazioni dei caschi e del simulatore, da verificare e prendere in carico. Nessuna autenticazione in demo.'
        badges={<Vivo online={online} alle={aggiornatoAlle} />}
        actions={
          <>
            <Scelta opzioni={PERIODI} value={String(giorni)} onValueChange={v => setGiorni(Number(v))} />
            <Button variant='outline' asChild>
              <a href='/api/export.csv?public=1' download>
                <DownloadIcon /> CSV pubblico
              </a>
            </Button>
            <Button asChild>
              <a href='/api/export.csv' download>
                <DownloadIcon /> Esporta CSV
              </a>
            </Button>
          </>
        }
      />

      <KpiGrid count={4}>
        <KpiCard title='Eventi oggi' value={kpi.oggi} icon={ActivityIcon} hint='falsi positivi esclusi' />
        <KpiCard
          title='Aperti'
          value={kpi.aperti}
          icon={InboxIcon}
          tone={kpi.aperti > 0 ? 'warning' : 'default'}
          hint='nuovi, verificati, in lavorazione'
          onClick={() => setSoloAperti(v => !v)}
          active={soloAperti}
        />
        <KpiCard
          title='Emergenze 112'
          value={kpi.emergenze}
          icon={AlertTriangleIcon}
          tone={kpi.emergenze > 0 ? 'destructive' : 'default'}
          hint='allarme inviato (SIMULATO)'
        />
        <KpiCard
          title='Caschi online'
          value={kpi.caschiOnline}
          icon={HardHatIcon}
          tone={kpi.caschiOnline > 0 ? 'success' : 'default'}
          hint={`${dispositivi.length} registrati`}
        />
      </KpiGrid>

      <div className='grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]'>
        <SectionCard title='Mappa' info={<InfoDot label='Come leggere la mappa'>Clic su un evento per i dettagli. Posizione dei caschi SIMULATA (percorso predefinito, nessun GPS).</InfoDot>}>
          <Mappa
            className='h-[52vh] min-h-[380px]'
            eventi={filtrati}
            freschi={freschi}
            dispositivi={dispositivi}
            completo
            onDettagli={e => setSelezionatoId(e.id)}
            fuoco={fuoco}
          />
        </SectionCard>
        <div className='flex min-w-0 flex-col gap-6'>
          <SectionCard title='Caschi' info={<InfoDot label='Stato dei caschi'>Heartbeat ogni 5 s; un casco è online se visto negli ultimi 15 s.</InfoDot>}>
            {dispositivi.length === 0 ? (
              <EmptyState compatto testo='Nessun casco ha mai inviato heartbeat.' />
            ) : (
              <div className='flex flex-col gap-2'>
                {dispositivi.map(d => (
                  <div key={d.device_id} className='flex flex-col gap-1 rounded-md border p-3 text-sm'>
                    <div className='flex items-center justify-between gap-2'>
                      <span className='font-mono text-xs font-semibold'>{d.device_id}</span>
                      <StatusBadge tone={d.online ? 'success' : 'muted'} dot size='sm'>
                        {d.online ? 'online' : `offline · ${Math.round(d.seconds_ago)} s fa`}
                      </StatusBadge>
                    </div>
                    <div className='text-muted-foreground text-xs'>
                      MCU {d.mcu_ok ? (d.mcu_state ?? 'ok') : 'non risponde'} · IMU {d.imu_hz ?? '–'} Hz · coda {d.queue_len ?? '–'} · fw{' '}
                      {d.fw ?? '–'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
          <SectionCard
            title='Top 10 hotspot'
            info={<InfoDot label='Come si calcola'>Somma delle severità per cella di ~100 m nel periodo, falsi positivi esclusi. Clic su una riga per inquadrare.</InfoDot>}
          >
            {hotspots.length === 0 ? (
              <EmptyState compatto testo='Nessun dato nel periodo.' />
            ) : (
              <div className='flex flex-col gap-2'>
                {hotspots.map((h, i) => (
                  <MeterRow
                    key={h.cell_id}
                    label={`${i + 1}. ${h.lat.toFixed(4)}, ${h.lon.toFixed(4)}`}
                    labelClassName='w-40 font-mono text-xs'
                    value={`${h.score} · ${h.count} ev.`}
                    valueClassName='w-24 text-right text-xs tabular-nums'
                    pct={(h.score / maxScore) * 100}
                    fillClassName='bg-destructive'
                    onClick={() => setFuoco({ lat: h.lat, lon: h.lon, zoom: 17, chiave: Date.now() })}
                  />
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      <div className='grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]'>
        <ChartCard
          title='Eventi per giorno'
          sottotitolo={`ultimi ${Math.min(giorni, 30)} giorni, per tipo, falsi positivi esclusi`}
          legend={
            <>
              {ORDINE_TIPI.map(t => (
                <LegendPill key={t} forma='pila' colore={TIPI[t].colore} label={TIPI[t].label} />
              ))}
            </>
          }
        >
          <ResponsiveContainer width='100%' height={220}>
            <BarChart data={serieGiorni} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...CHART_GRID} />
              <XAxis dataKey='giorno' tick={CHART_AXIS_TICK} tickLine={false} axisLine={false} interval='preserveStartEnd' minTickGap={24} />
              <YAxis tick={CHART_AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
              <RTooltip
                content={<ChartTip format={(v, n) => `${v} · ${etichettaTipo(String(n))}`} />}
                cursor={{ fill: 'var(--chart-context)', opacity: 0.2 }}
              />
              {ORDINE_TIPI.map(t => (
                <Bar key={t} dataKey={t} name={t} stackId='giorno' fill={TIPI[t].colore} maxBarSize={COLONNA_MAX} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <SectionCard title='Fasce orarie' info={<InfoDot label='Fasce orarie'>Quando avvengono gli eventi del periodo (ora locale del server), falsi positivi esclusi.</InfoDot>}>
          <BarraParti parti={fasce} />
        </SectionCard>
      </div>

      <SectionCard title='Eventi'>
        <div className='flex flex-col gap-3'>
          <FacetToolbar
            search={{ placeholder: 'Cerca per id o dispositivo', value: cerca, onChange: setCerca }}
            facets={facets}
            activeCount={filtriAttivi}
            onClearAll={azzeraFiltri}
            resultCount={righe.length}
            extraSummary={soloAperti ? ['Solo aperti'] : undefined}
          />
          <DataTable
            data={righe}
            columns={colonne}
            onRowClick={apriRiga}
            rowLabel={e => `Evento #${e.id}`}
            rowClassName={e => (e.id === selezionatoId ? 'bg-accent' : freschi.has(e.id) ? 'bg-warning/10' : undefined)}
            ordinamento={{
              chiave: ordine.chiave,
              desc: ordine.desc,
              imposta: (chiave, desc) => setOrdine({ chiave, desc }),
              ordinabili: new Set(['id', 'ts', 'type', 'severity', 'status', 'source', 'alarm_state', 'device_id']),
            }}
            densita='media'
            cornice={false}
            footer={({ rese, totali }) => `${rese} di ${totali} eventi nel periodo`}
          />
        </div>
      </SectionCard>

      <PannelloEvento e={selezionato} onChiudi={() => setSelezionatoId(null)} onStato={aggiornaStato} onMappa={inquadra} />
    </div>
  )
}

// ---- pannello laterale di dettaglio: unico punto in cui si cambia lo stato ----
function PannelloEvento({
  e,
  onChiudi,
  onStato,
  onMappa,
}: {
  e: Evento | null
  onChiudi: () => void
  onStato: (e: Evento, s: Stato) => void
  onMappa: (e: Evento) => void
}) {
  const f = e?.features ?? {}
  const urto =
    f.shock_to_impact_ms != null && f.shock_to_impact_ms >= 0
      ? `${misura(f.shock_peak_g, 'g')} · ${f.shock_to_impact_ms} ms prima`
      : 'nessuno'
  return (
    <Sheet
      open={e !== null}
      onOpenChange={aperto => {
        if (!aperto) onChiudi()
      }}
    >
      <SheetContent side='right' className='w-full overflow-y-auto sm:max-w-md'>
        {e && (
          <>
            <SheetHeader>
              <SheetTitle className='flex flex-wrap items-center gap-2'>
                {etichettaTipo(e.type)}
                <StatusBadge tone={FONTI[e.source].tone} size='sm'>
                  {FONTI[e.source].label}
                </StatusBadge>
              </SheetTitle>
              <SheetDescription>
                Evento #{e.id} · {fmtDataOra(e.ts)} · severità {e.severity}/5
              </SheetDescription>
            </SheetHeader>
            <div className='flex flex-col gap-5 px-4 pb-6'>
              {e.emergency && (
                <Avviso tono='destructive' className='px-3 py-2 text-sm'>
                  Allarme 112 inviato automaticamente (SIMULAZIONE, nessuna chiamata reale).
                </Avviso>
              )}
              {NOTA_TIPO[e.type] && (
                <p className='text-muted-foreground text-sm'>{NOTA_TIPO[e.type]} Classificazione automatica indicativa.</p>
              )}

              <Blocco titolo='Stato'>
                <Scelta opzioni={OPZIONI_STATO} value={e.status} onValueChange={s => onStato(e, s as Stato)} />
                <div className='flex flex-wrap gap-2'>
                  <Button
                    size='sm'
                    onClick={() => onStato(e, 'IN_LAVORAZIONE')}
                    disabled={e.status === 'IN_LAVORAZIONE' || e.status === 'RISOLTO'}
                  >
                    Presa in carico
                  </Button>
                  <Button size='sm' variant='outline' onClick={() => onStato(e, 'RISOLTO')} disabled={e.status === 'RISOLTO'}>
                    Risolto
                  </Button>
                  <Button size='sm' variant='ghost' onClick={() => onStato(e, 'FALSO_POSITIVO')} disabled={e.status === 'FALSO_POSITIVO'}>
                    Falso positivo
                  </Button>
                </div>
              </Blocco>

              <Blocco titolo='Segnalazione'>
                <Riga label='ID evento'>
                  <span className='font-mono text-xs'>{e.event_id}</span>
                </Riga>
                <Riga label='Ora evento'>{fmtDataOraCompleta(e.ts)}</Riga>
                <Riga label='Ricevuto'>{fmtDataOraCompleta(e.received_at)}</Riga>
                <Riga label='Fascia oraria'>{e.time_slot ? FASCIA_LABEL[e.time_slot] : '—'}</Riga>
                <Riga label='Allarme'>{ALLARME[e.alarm_state]}</Riga>
                <Riga label='Classificatore'>{e.classifier ?? '—'}</Riga>
              </Blocco>

              <Blocco titolo='Posizione'>
                <Riga label='Coordinate'>
                  <span className='font-mono'>
                    {e.lat.toFixed(5)}, {e.lon.toFixed(5)}
                  </span>
                </Riga>
                <Riga label='Origine'>
                  {e.position_source === 'simulated_route' ? 'SIMULATA (percorso predefinito, nessun GPS)' : e.position_source}
                </Riga>
                <Button size='sm' variant='outline' className='self-start' onClick={() => onMappa(e)}>
                  Inquadra sulla mappa
                </Button>
              </Blocco>

              <Blocco titolo='Dati del sensore'>
                <Riga label='Picco impatto'>{misura(f.impact_peak_g, 'g')}</Riga>
                <Riga label='Rotazione della testa'>{misura(f.rotation_deg, '°', 0)}</Riga>
                <Riga label='Immobilità misurata'>{misura(f.still_s, 's')}</Riga>
                <Riga label='Urto precedente'>{urto}</Riga>
              </Blocco>

              <Blocco titolo='Fonte'>
                <Riga label='Dispositivo'>
                  <span className='font-mono text-xs'>{e.device_id ?? '—'}</span>
                </Riga>
                <Riga label='Origine'>{FONTI[e.source].label}</Riga>
                <Riga label='Firmware'>{e.fw ?? '—'}</Riga>
              </Blocco>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function Blocco({ titolo, children }: { titolo: string; children: ReactNode }) {
  return (
    <section className='flex flex-col gap-2'>
      <h3 className='text-muted-foreground text-xs font-semibold tracking-wide uppercase'>{titolo}</h3>
      {children}
    </section>
  )
}

function Riga({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className='grid grid-cols-[9rem_minmax(0,1fr)] gap-2 text-sm'>
      <span className='text-muted-foreground'>{label}</span>
      <span className='min-w-0 break-words'>{children}</span>
    </div>
  )
}
