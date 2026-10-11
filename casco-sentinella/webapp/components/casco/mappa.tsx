'use client'

// Mappa Leaflet (react-leaflet) con lo stesso linguaggio visivo della UI precedente:
// cerchio pieno con bordo bianco = evento del casco; chiaro e tratteggiato = dato SIMULATO;
// etichetta "SIM" = simulatore; dimensione = severità; heatmap pesata per severità; casco "C".
// Va caricata solo nel browser (next/dynamic con ssr: false): Leaflet usa `window`.

import * as L from 'leaflet'
import 'leaflet.heat'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'

import { StatusBadge } from '@/components/ds/status-badge'
import { Button } from '@/components/ui/button'
import { ALLARME, coloreTipo, etichettaTipo, fmtDataOra, FONTI, TORINO, type Dispositivo, type Evento } from '@/lib/casco/api'
import { cn } from '@/lib/utils'

export type Fuoco = { lat: number; lon: number; zoom?: number; chiave: number }

type Props = {
  eventi: Evento[]
  freschi?: Set<number>
  dispositivi?: Dispositivo[]
  calore?: boolean
  marker?: boolean
  completo?: boolean // popup con stato, id e coordinate (dashboard Comune)
  onDettagli?: (e: Evento) => void
  fuoco?: Fuoco | null
  className?: string
  zoom?: number
  centro?: [number, number]
}

export function Mappa({
  eventi,
  freschi,
  dispositivi = [],
  calore = false,
  marker = true,
  completo = false,
  onDettagli,
  fuoco,
  className,
  zoom = 13,
  centro = TORINO,
}: Props) {
  return (
    <div className={cn('isolate z-0 overflow-hidden rounded-lg border', className)}>
      <MapContainer center={centro} zoom={zoom} className='h-full w-full' scrollWheelZoom>
        <TileLayer
          url='https://tile.openstreetmap.org/{z}/{x}/{y}.png'
          maxZoom={19}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {calore && <StratoCalore punti={eventi.map(e => [e.lat, e.lon, e.severity / 5] as [number, number, number])} />}
        {marker &&
          eventi.map(e => (
            <MarkerEvento
              key={`${e.id}-${freschi?.has(e.id) ? 'nuovo' : ''}`}
              e={e}
              fresco={!!freschi?.has(e.id)}
              completo={completo}
              onDettagli={onDettagli}
            />
          ))}
        {dispositivi.map(d =>
          d.lat != null && d.lon != null ? (
            <Marker key={d.device_id} position={[d.lat, d.lon]} icon={iconaCasco(d.online)} zIndexOffset={1000}>
              <Tooltip>{d.device_id} — posizione SIMULATA</Tooltip>
            </Marker>
          ) : null
        )}
        <Inquadra fuoco={fuoco} />
      </MapContainer>
    </div>
  )
}

function MarkerEvento({
  e,
  fresco,
  completo,
  onDettagli,
}: {
  e: Evento
  fresco: boolean
  completo: boolean
  onDettagli?: (e: Evento) => void
}) {
  const sim = e.simulated
  return (
    <CircleMarker
      center={[e.lat, e.lon]}
      radius={4 + e.severity}
      pathOptions={{
        color: sim ? '#444' : '#fff',
        weight: sim ? 1 : 2,
        dashArray: sim ? '2 2' : undefined,
        fillColor: coloreTipo(e.type),
        fillOpacity: sim ? 0.5 : 0.95,
        className: fresco ? 'pulse' : undefined,
      }}
    >
      {e.source === 'simulator' && (
        <Tooltip permanent direction='right' offset={[6, 0]} className='sim-tag'>
          SIM
        </Tooltip>
      )}
      <Popup>
        <div className='flex flex-col gap-1 text-sm'>
          <div className='flex items-center gap-2 font-semibold'>
            {etichettaTipo(e.type)}
            <StatusBadge tone={FONTI[e.source].tone} size='sm'>
              {FONTI[e.source].label}
            </StatusBadge>
          </div>
          <div>
            {fmtDataOra(e.ts)} · severità {e.severity}/5
          </div>
          {e.alarm_state !== 'NONE' && <div>Allarme: {ALLARME[e.alarm_state]}</div>}
          {completo && (
            <div>
              Stato: {e.status} · #{e.id}
              <br />
              {e.lat.toFixed(5)}, {e.lon.toFixed(5)}{' '}
              <i>(posizione {e.position_source === 'simulated_route' ? 'SIMULATA' : e.position_source})</i>
            </div>
          )}
          {onDettagli && (
            <Button size='sm' variant='outline' className='mt-1 self-start' onClick={() => onDettagli(e)}>
              Dettagli
            </Button>
          )}
        </div>
      </Popup>
    </CircleMarker>
  )
}

function iconaCasco(online: boolean) {
  return L.divIcon({ className: `helmet-icon${online ? '' : ' offline'}`, html: 'C', iconSize: [22, 22] })
}

function StratoCalore({ punti }: { punti: Array<[number, number, number]> }) {
  const map = useMap()
  const ref = useRef<L.HeatLayer | null>(null)
  useEffect(() => {
    // leaflet.heat si aggancia all'oggetto globale window.L (lo stesso che Leaflet esporta a runtime),
    // non al namespace ESM che il bundler consegna a questo modulo: si passa quindi dal globale.
    const globale = (globalThis as unknown as { L?: typeof L }).L
    const heatLayer = globale?.heatLayer ?? L.heatLayer
    const layer = heatLayer([], { radius: 22, blur: 18, maxZoom: 16 }).addTo(map)
    ref.current = layer
    return () => {
      layer.remove()
      ref.current = null
    }
  }, [map])
  useEffect(() => {
    ref.current?.setLatLngs(punti)
  }, [punti])
  return null
}

function Inquadra({ fuoco }: { fuoco?: Fuoco | null }) {
  const map = useMap()
  useEffect(() => {
    if (fuoco) map.setView([fuoco.lat, fuoco.lon], fuoco.zoom ?? 17)
  }, [map, fuoco])
  return null
}
