// Casco Sentinella — contratto dati (SPEC §3) e client HTTP. Gira nel browser.
// Le chiamate sono relative alla stessa origine: FastAPI serve sia le pagine sia /api/*.

import type { StatusTone } from '@/components/ds/status-badge'

export const POLL_MS = 2000 // aggiornamento eventi con after_id (SPEC §8)
export const TORINO: [number, number] = [45.07, 7.69]

export type TipoEvento = 'BUCA' | 'CADUTA_DA_DISSESTO' | 'IMPATTO_VIOLENTO' | 'CADUTA_SENZA_CAUSA_RILEVATA'
export type Stato = 'NUOVO' | 'VERIFICATO' | 'IN_LAVORAZIONE' | 'RISOLTO' | 'FALSO_POSITIVO'
export type Fonte = 'helmet' | 'simulator' | 'demo_seed'
export type StatoAllarme = 'NONE' | 'SENT' | 'CANCELED' | 'MOVEMENT_RESUMED'
export type Fascia = 'notte' | 'mattina' | 'pomeriggio' | 'sera'

export type Evento = {
  id: number
  event_id: string
  device_id?: string
  device_ts?: string
  ts: string
  received_at: string
  lat: number
  lon: number
  position_source: string
  type: TipoEvento
  severity: number
  status: Stato
  source: Fonte
  simulated: boolean
  emergency: boolean
  alarm_state: StatoAllarme
  confidence?: number
  classifier?: string
  features?: Partial<Record<string, number | null>>
  time_slot?: Fascia
  cell_id?: string
  fw?: string
}

export type Dispositivo = {
  device_id: string
  lat?: number | null
  lon?: number | null
  online: boolean
  seconds_ago: number
  last_seen?: string
  mcu_ok?: boolean
  mcu_state?: string | null
  imu_hz?: number | null
  queue_len?: number
  fw?: string | null
}

export type Hotspot = { cell_id: string; score: number; count: number; lat: number; lon: number }
export type Stats = { by_type: Record<string, number>; total: number; top_hotspots: Hotspot[] }

export const TIPI: Record<TipoEvento, { label: string; colore: string }> = {
  BUCA: { label: 'Buca / dissesto', colore: '#e6a100' },
  CADUTA_DA_DISSESTO: { label: 'Caduta da dissesto', colore: '#e8590c' },
  CADUTA_SENZA_CAUSA_RILEVATA: { label: 'Caduta senza causa rilevata', colore: '#7048e8' },
  IMPATTO_VIOLENTO: { label: 'Impatto violento', colore: '#c92a2a' },
}
export const ORDINE_TIPI: TipoEvento[] = ['BUCA', 'CADUTA_DA_DISSESTO', 'CADUTA_SENZA_CAUSA_RILEVATA', 'IMPATTO_VIOLENTO']
export const TIPI_CADUTA: TipoEvento[] = ['CADUTA_DA_DISSESTO', 'IMPATTO_VIOLENTO', 'CADUTA_SENZA_CAUSA_RILEVATA']

export const STATI: Record<Stato, { label: string; tone: StatusTone }> = {
  NUOVO: { label: 'Nuovo', tone: 'info' },
  VERIFICATO: { label: 'Verificato', tone: 'warning' },
  IN_LAVORAZIONE: { label: 'In lavorazione', tone: 'warning' },
  RISOLTO: { label: 'Risolto', tone: 'success' },
  FALSO_POSITIVO: { label: 'Falso positivo', tone: 'muted' },
}
export const ORDINE_STATI: Stato[] = ['NUOVO', 'VERIFICATO', 'IN_LAVORAZIONE', 'RISOLTO', 'FALSO_POSITIVO']
export const STATI_APERTI: Stato[] = ['NUOVO', 'VERIFICATO', 'IN_LAVORAZIONE']

// Fonte sempre dichiarata (SPEC §3.4): casco reale, simulatore ("SIM") o storico simulato.
export const FONTI: Record<Fonte, { label: string; tone: StatusTone }> = {
  helmet: { label: 'Casco', tone: 'info' },
  simulator: { label: 'SIM · simulatore', tone: 'muted' },
  demo_seed: { label: 'Storico simulato', tone: 'warning' },
}
export const ORDINE_FONTI: Fonte[] = ['helmet', 'simulator', 'demo_seed']

export const ALLARME: Record<StatoAllarme, string> = {
  NONE: '—',
  SENT: 'Inviato',
  CANCELED: 'Annullato',
  MOVEMENT_RESUMED: 'Si è rialzato',
}

export const FASCE: Fascia[] = ['notte', 'mattina', 'pomeriggio', 'sera']
export const FASCIA_LABEL: Record<Fascia, string> = {
  notte: 'Notte',
  mattina: 'Mattina',
  pomeriggio: 'Pomeriggio',
  sera: 'Sera',
}

// La classificazione è indicativa, mai una diagnosi (SPEC §4).
export const NOTA_TIPO: Partial<Record<TipoEvento, string>> = {
  IMPATTO_VIOLENTO: 'Impatto compatibile con un urto, non accertato.',
  CADUTA_DA_DISSESTO: 'Caduta preceduta da un urto (possibile buca o dissesto), non accertato.',
  CADUTA_SENZA_CAUSA_RILEVATA: 'Caduta senza urto precedente rilevato (es. scivolata), causa non accertata.',
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!r.ok) throw new Error(`${r.status} ${path}`)
  return (await r.json()) as T
}

export function cambiaStato(e: Evento, status: Stato) {
  return api<Evento>(`/api/events/${encodeURIComponent(e.event_id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export const isoGiorniFa = (giorni: number) => new Date(Date.now() - giorni * 86400000).toISOString()
export const etichettaTipo = (t: string) => (TIPI as Record<string, { label: string }>)[t]?.label ?? t
export const coloreTipo = (t: string) => (TIPI as Record<string, { colore: string }>)[t]?.colore ?? '#888'
export const fmtDataOra = (ts: string) =>
  new Date(ts).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
export const fmtDataOraCompleta = (ts: string) =>
  new Date(ts).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
export const fmtOra = (ts: string) => new Date(ts).toLocaleTimeString('it-IT')
export const misura = (v: number | null | undefined, unita: string, dec = 1) =>
  v == null ? '—' : `${Number(v).toFixed(dec)} ${unita}`
