/** Date facet: presets, from/to calendar and the helpers that describe a range. Part of the IAMAimpresa design system. */
'use client'

import { useState } from 'react'

import { CalendarIcon } from 'lucide-react'
import type { DateRange } from 'react-day-picker'

import { Calendario } from '@/components/ds/calendario'
import { ChipInterruttore } from '@/components/ds/chip-interruttore'
import { FacetOptionRow, type FacetOption } from '@/components/ds/toolbar-bits'
import { Button } from '@/components/ui/button'
import { addDays, todayKey } from '@/lib/date-keys'
import { formatDateIt } from '@/lib/format-date'
import { cn } from '@/lib/utils'

export type DayRange = { from: string | null; to: string | null }

export const EMPTY_RANGE: DayRange = { from: null, to: null }

export const hasRange = (r: DayRange): boolean => r.from != null || r.to != null

function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fromKey(k: string | null): Date | undefined {
  return k ? new Date(`${k}T00:00:00`) : undefined
}

export function rangeLabel(r: DayRange): string {
  if (r.from && r.to) return `${formatDateIt(r.from)} – ${formatDateIt(r.to)}`
  if (r.from) return `dal ${formatDateIt(r.from)}`
  if (r.to) return `fino al ${formatDateIt(r.to)}`
  return ''
}

export function inRange(day: string, r: DayRange): boolean {
  if (r.from && day < r.from) return false
  if (r.to && day > r.to) return false
  return true
}

export function DateRangeFacetPanel<T extends string>({
  options,
  selected,
  onToggle,
  range,
  onRangeChange,
  onApply,
  rowClassName,
  single = false,
}: {
  options: Array<FacetOption<T>>
  selected: T[]
  onToggle: (value: T) => void
  range: DayRange
  onRangeChange: (r: DayRange) => void

  onApply?: () => void

  rowClassName?: string

  single?: boolean
}) {
  const bandless = options.length === 0
  const [picking, setPicking] = useState(bandless)
  const custom = hasRange(range)

  const apply = (r: DateRange | undefined): void => {
    const from = r?.from ? toKey(r.from) : null
    const to = r?.to ? toKey(r.to) : null

    const next = from && to && to < from ? { from: to, to: from } : { from, to }
    onRangeChange(next)
  }

  if (picking) {
    return (
      <div className='p-1'>
        <Calendario
          mode='range'
          autoFocus
          defaultMonth={fromKey(range.from) ?? fromKey(range.to)}
          selected={{ from: fromKey(range.from), to: fromKey(range.to) }}
          onSelect={apply}
          numberOfMonths={1}
        />
        <div className='flex items-center justify-between gap-2 border-t px-2 pt-2'>
          <span className='text-muted-foreground text-xs tabular-nums'>
            {custom ? rangeLabel(range) : 'Scegli il primo giorno'}
          </span>
          <div className='flex gap-1'>
            {!bandless && (
              <Button
                size='sm'
                variant='ghost'
                className='h-(--control-h-xs) px-2 text-xs'
                onClick={() => setPicking(false)}
              >
                Indietro
              </Button>
            )}
            {custom && (
              <Button
                size='sm'
                variant='ghost'
                className='h-(--control-h-xs) px-2 text-xs'
                onClick={() => onRangeChange(EMPTY_RANGE)}
              >
                Azzera
              </Button>
            )}
            <Button
              size='sm'
              className='h-(--control-h-xs) px-2 text-xs'
              onClick={() => onApply?.()}
              disabled={!custom}
            >
              Applica
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='flex flex-col'>
      {options.map(opt => (
        <FacetOptionRow
          key={opt.value}
          label={opt.label}
          count={opt.count}
          checked={selected.includes(opt.value)}
          single={single}
          onSelect={() => onToggle(opt.value)}
          className={rowClassName}
        />
      ))}
      <div aria-hidden className='bg-muted my-1 h-px' />

      <button
        type='button'
        onClick={() => setPicking(true)}
        className={cn(
          'hover:bg-accent focus-visible:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-start text-sm outline-none',
          rowClassName
        )}
      >
        <CalendarIcon className='text-muted-foreground size-4 shrink-0' />
        <span className='truncate'>{custom ? rangeLabel(range) : 'Personalizzato…'}</span>
      </button>
    </div>
  )
}

export type IntervalloDate = { da: string | null; a: string | null }

export type PresetData =
  'oggi' | '7g' | '30g' | 'mese' | 'anno' | 'passati' | 'futuri' | 'entro7g' | 'entro30g'

export type FormaData = {
  tipo: 'data'

  valore: IntervalloDate | null
  onChange: (valore: IntervalloDate | null) => void

  preset?: readonly PresetData[]
}

export const PRESET_DATA_DEFAULT: readonly PresetData[] = ['oggi', '7g', '30g', 'mese', 'anno']

export const ETICHETTA_PRESET_DATA: Readonly<Record<PresetData, string>> = {
  oggi: 'Oggi',
  '7g': '7 giorni',
  '30g': '30 giorni',
  mese: 'Questo mese',
  anno: "Quest'anno",
  passati: 'Passati',
  futuri: 'Futuri',
  entro7g: 'Entro 7 giorni',
  entro30g: 'Entro 30 giorni',
}

function fineMese(giorno: string): string {
  const d = new Date(`${giorno.slice(0, 7)}-01T00:00:00`)
  d.setMonth(d.getMonth() + 1)
  d.setDate(0)
  return toKey(d)
}

export function intervalloDelPreset(p: PresetData, oggi: string = todayKey()): IntervalloDate {
  switch (p) {
    case 'oggi':
      return { da: oggi, a: oggi }
    case '7g':
      return { da: addDays(oggi, -6), a: oggi }
    case '30g':
      return { da: addDays(oggi, -29), a: oggi }
    case 'mese':
      return { da: `${oggi.slice(0, 7)}-01`, a: fineMese(oggi) }
    case 'anno':
      return { da: `${oggi.slice(0, 4)}-01-01`, a: `${oggi.slice(0, 4)}-12-31` }
    case 'passati':
      return { da: null, a: addDays(oggi, -1) }
    case 'futuri':
      return { da: addDays(oggi, 1), a: null }
    case 'entro7g':
      return { da: oggi, a: addDays(oggi, 6) }
    case 'entro30g':
      return { da: oggi, a: addDays(oggi, 29) }
  }
}

export function presetDelleDate(
  valore: IntervalloDate | null,
  preset: readonly PresetData[] = PRESET_DATA_DEFAULT,
  oggi: string = todayKey()
): PresetData | null {
  if (valore == null) return null
  for (const p of preset) {
    const d = intervalloDelPreset(p, oggi)
    if (d.da === valore.da && d.a === valore.a) return p
  }
  return null
}

function giornoBreve(giorno: string, oggi: string): string {
  const [anno, mese, giornoDelMese] = giorno.split('-')
  const breve = `${Number(giornoDelMese)}/${Number(mese)}`
  return anno === oggi.slice(0, 4) ? breve : `${breve}/${anno}`
}

export function riassuntoData(
  forma: Pick<FormaData, 'valore' | 'preset'>,
  oggi: string = todayKey()
): string {
  const v = forma.valore
  if (v == null || (v.da == null && v.a == null)) return ''
  const p = presetDelleDate(v, forma.preset ?? PRESET_DATA_DEFAULT, oggi)
  if (p != null) return ETICHETTA_PRESET_DATA[p]
  if (v.da != null && v.a != null) return `dal ${giornoBreve(v.da, oggi)} al ${giornoBreve(v.a, oggi)}`
  if (v.da != null) return `dal ${giornoBreve(v.da, oggi)}`
  return `fino al ${giornoBreve(v.a as string, oggi)}`
}

export function inIntervalloData(giorno: string | null | undefined, valore: IntervalloDate | null): boolean {
  if (valore == null || (valore.da == null && valore.a == null)) return true
  if (giorno == null || giorno === '') return false
  const g = giorno.slice(0, 10)
  if (valore.da != null && g < valore.da) return false
  if (valore.a != null && g > valore.a) return false
  return true
}

export function DataFacetPanel({ forma, className }: { forma: FormaData; className?: string }) {
  const oggi = todayKey()
  const preset = forma.preset ?? PRESET_DATA_DEFAULT
  const v = forma.valore
  const acceso = presetDelleDate(v, preset, oggi)
  const scrivi = (next: IntervalloDate | null): void => {
    if (next == null || (next.da == null && next.a == null)) return forma.onChange(null)

    forma.onChange(next.da != null && next.a != null && next.a < next.da ? { da: next.a, a: next.da } : next)
  }
  const dalCalendario = (r: DateRange | undefined): void =>
    scrivi({ da: r?.from ? toKey(r.from) : null, a: r?.to ? toKey(r.to) : null })

  return (
    <div className={cn('flex w-72 max-w-full flex-col', className)} data-slot='facet-data'>
      <div className='flex flex-wrap gap-1 p-2'>
        {preset.map(p => (
          <ChipInterruttore
            key={p}
            acceso={acceso === p}
            onClick={() => scrivi(acceso === p ? null : intervalloDelPreset(p, oggi))}
          >
            {ETICHETTA_PRESET_DATA[p]}
          </ChipInterruttore>
        ))}
      </div>
      <div className='grid grid-cols-2 gap-2 border-t px-3 pt-2 text-xs tabular-nums'>
        <span className='flex min-w-0 gap-1'>
          <span className='text-muted-foreground'>Da</span>
          <span className='truncate'>{v?.da != null ? formatDateIt(v.da) : '—'}</span>
        </span>
        <span className='flex min-w-0 gap-1'>
          <span className='text-muted-foreground'>A</span>
          <span className='truncate'>{v?.a != null ? formatDateIt(v.a) : '—'}</span>
        </span>
      </div>
      <div className='flex justify-center p-1'>
        <Calendario
          mode='range'
          selected={{ from: fromKey(v?.da ?? null), to: fromKey(v?.a ?? null) }}
          onSelect={dalCalendario}
          numberOfMonths={1}
        />
      </div>
      <div className='flex justify-end border-t p-1'>
        <Button
          variant='ghost'
          size='sm'
          className='text-muted-foreground h-(--control-h-xs) px-2 text-xs'
          disabled={v == null}
          onClick={() => scrivi(null)}
        >
          Pulisci
        </Button>
      </div>
    </div>
  )
}
