/** The single filter panel: facets, date and number forms, summary chips, sort. Part of the IAMAimpresa design system. */
'use client'

import { useMemo, useState, type ComponentType, type ReactNode } from 'react'

import {
  ArrowDownNarrowWideIcon,
  ArrowUpNarrowWideIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ListFilterIcon,
  XIcon,
} from 'lucide-react'

import {
  DataFacetPanel,
  DateRangeFacetPanel,
  hasRange,
  rangeLabel,
  riassuntoData,
  type DayRange,
  type FormaData,
} from '@/components/ds/date-range-facet'
import { FieldTrigger } from '@/components/ds/field-trigger'
import { Interruttore } from '@/components/ds/interruttore'
import { MultiCommandList } from '@/components/ds/multi-command'
import { NumberField, formatNumberIt } from '@/components/ds/number-field'
import { FacetOptionRow, type FacetOption } from '@/components/ds/toolbar-bits'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Slider } from '@/components/ui/slider'
import { useIsMobile } from '@/hooks/use-mobile'
import { useRicercaALente } from '@/hooks/use-ricerca-a-lente'
import { LOCALE } from '@/lib/locale'
import { cn } from '@/lib/utils'

const RIGA_PANNELLO = 'grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-2.5 px-2 py-1'

export function FilterRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        RIGA_PANNELLO,
        'max-md:flex max-md:flex-col max-md:items-stretch max-md:gap-1 max-md:px-0'
      )}
      data-slot='filter-row'
    >
      <span className='text-[13px] text-muted-foreground truncate' title={hint}>
        {label}
      </span>

      <div className='flex min-w-0 [&>*]:w-full [&>*]:min-w-0'>{children}</div>

      {hint != null && <span className='text-muted-foreground text-xs md:hidden'>{hint}</span>}
    </div>
  )
}

export type FacetSpec = {
  key: string
  label: string

  icon: ComponentType<{ className?: string }>

  options: Array<FacetOption<string>>
  selected: string[]
  onToggle: (value: string) => void

  chipLabel?: (value: string, contesto?: { escluso: boolean }) => string

  hidden?: boolean

  range?: {
    value: DayRange
    onChange: (r: DayRange) => void
  }

  single?: boolean

  search?: { placeholder: string; emptyLabel?: string }

  allLabel?: string

  ordine?: OrdineOpzioni

  escludi?: { attivo: boolean; onToggle: () => void }

  forma?: FormaFacet
}

export type OrdineOpzioni = 'alfabetico' | 'logico'

export type FormaNumero = {
  tipo: 'numero'
  min: number
  max: number

  passo?: number

  formatta?: (n: number) => string

  unita?: string
  valore: [number, number] | null
  onChange: (valore: [number, number] | null) => void

  scala?: 'lineare' | 'quantili'

  valori?: readonly number[]
}

export type FormaFacet = FormaNumero | FormaData

const facetEscludibile = (f: Pick<FacetSpec, 'escludi' | 'single' | 'range' | 'forma'>): boolean =>
  f.escludi != null && f.single !== true && f.range == null && f.forma == null

export const prefissoEscluso = (f: Pick<FacetSpec, 'escludi' | 'single' | 'range' | 'forma'>): string =>
  facetEscludibile(f) && f.escludi?.attivo === true ? 'non ' : ''

function passoTondo(ampiezza: number): number {
  if (!(ampiezza > 0)) return 1
  const grezzo = ampiezza / 100
  const potenza = 10 ** Math.floor(Math.log10(grezzo))
  const m = grezzo / potenza
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * potenza
}

function scalaNumero(f: Pick<FormaNumero, 'min' | 'max' | 'passo'>): {
  min: number
  max: number
  passo: number
} {
  const passo = f.passo != null && f.passo > 0 ? f.passo : passoTondo(f.max - f.min)
  const min = Math.floor(f.min / passo) * passo
  const max = Math.max(Math.ceil(f.max / passo) * passo, min + passo)
  return { min, max, passo }
}

const QUANTILI_MIN_DISTINTI = 8

const POSIZIONI_QUANTILI = 100

type AsseNumero = {
  tipo: 'lineare' | 'quantili'

  min: number
  max: number
  passo: number

  da: number
  a: number

  valore: (p: number) => number

  posizioni: (v: readonly [number, number]) => [number, number]

  zero: number | null
}

function asseNumero(f: Pick<FormaNumero, 'min' | 'max' | 'passo' | 'scala' | 'valori'>): AsseNumero {
  const s = scalaNumero(f)
  const ordinati =
    f.scala === 'quantili' && f.valori != null ? f.valori.filter(Number.isFinite).sort((x, y) => x - y) : []
  let distinti = 0
  for (let i = 0; i < ordinati.length; i++) if (i === 0 || ordinati[i] !== ordinati[i - 1]) distinti++
  if (distinti < QUANTILI_MIN_DISTINTI) {
    return {
      tipo: 'lineare',
      ...s,
      da: s.min,
      a: s.max,
      valore: p => p,
      posizioni: v => [v[0], v[1]],
      zero: f.min < 0 && f.max > 0 ? 0 : null,
    }
  }
  const n = ordinati.length
  const N = POSIZIONI_QUANTILI
  const lo = Math.min(f.min, ordinati[0])
  const hi = Math.max(f.max, ordinati[n - 1])
  const q = Array.from({ length: N + 1 }, (_, p) =>
    p === 0 ? lo : p === N ? hi : ordinati[Math.round((p / N) * (n - 1))]
  )
  const primoDa = (v: number): number => {
    for (let p = 0; p <= N; p++) if (q[p] >= v) return p
    return N
  }
  const ultimoA = (v: number): number => {
    for (let p = N; p >= 0; p--) if (q[p] <= v) return p
    return 0
  }
  return {
    tipo: 'quantili',
    min: 0,
    max: N,
    passo: 1,
    da: lo,
    a: hi,
    valore: p => q[Math.min(N, Math.max(0, Math.round(p)))],
    posizioni: v => {
      const [x, y] = [primoDa(v[0]), ultimoA(v[1])]
      return x <= y ? [x, y] : [y, x]
    },
    zero: lo < 0 && hi > 0 ? primoDa(0) : null,
  }
}

const formattaNumero = (f: Pick<FormaNumero, 'formatta' | 'unita'>, n: number): string =>
  f.formatta != null ? f.formatta(n) : `${formatNumberIt(n)}${f.unita != null ? ` ${f.unita}` : ''}`

export function riassuntoNumero(f: Pick<FormaNumero, 'valore' | 'formatta' | 'unita'>): string {
  return f.valore == null ? '' : `${formattaNumero(f, f.valore[0])} – ${formattaNumero(f, f.valore[1])}`
}

export function riassuntoForma(f: FormaFacet): string {
  return f.tipo === 'numero' ? riassuntoNumero(f) : riassuntoData(f)
}

export const formaAccesa = (f: FormaFacet): boolean => f.valore != null

export function inIntervalloNumero(n: number | null | undefined, valore: [number, number] | null): boolean {
  if (valore == null) return true
  if (n == null || Number.isNaN(n)) return false
  return n >= valore[0] && n <= valore[1]
}

type FacetIntervalloBase = {
  key: string
  label: string
  icon: FacetSpec['icon']
  hidden?: boolean
  allLabel?: string
}

const nessunaVoce = (): void => {}

export function facetNumero({
  key,
  label,
  icon,
  hidden,
  allLabel,
  ...forma
}: FacetIntervalloBase & Omit<FormaNumero, 'tipo'>): FacetSpec {
  return {
    key,
    label,
    icon,
    hidden,
    allLabel,
    options: [],
    selected: [],
    onToggle: nessunaVoce,
    forma: { tipo: 'numero', ...forma },
  }
}

export function facetData({
  key,
  label,
  icon,
  hidden,
  allLabel,
  ...forma
}: FacetIntervalloBase & Omit<FormaData, 'tipo'>): FacetSpec {
  return {
    key,
    label,
    icon,
    hidden,
    allLabel,
    options: [],
    selected: [],
    onToggle: nessunaVoce,
    forma: { tipo: 'data', ...forma },
  }
}

export function NumeroFacetPanel({
  forma,
  nome,
  className,
}: {
  forma: FormaNumero
  nome: string
  className?: string
}) {
  const { min, max, passo, scala, valori } = forma
  const asse = useMemo(() => asseNumero({ min, max, passo, scala, valori }), [min, max, passo, scala, valori])

  const [bozza, setBozza] = useState<[number, number] | null>(null)
  const filtro = forma.valore
  const aRiposo: [number, number] = filtro != null ? asse.posizioni(filtro) : [asse.min, asse.max]
  const posizioni = bozza ?? aRiposo

  const valoriDi = (p: readonly [number, number]): [number, number] => [
    filtro != null && p[0] === aRiposo[0] ? filtro[0] : asse.valore(p[0]),
    filtro != null && p[1] === aRiposo[1] ? filtro[1] : asse.valore(p[1]),
  ]
  const mostrato: [number, number] = bozza != null ? valoriDi(bozza) : (filtro ?? [asse.da, asse.a])
  const scrivi = (v: [number, number]): void => {
    setBozza(null)
    const dentro = (n: number): number => Math.min(asse.a, Math.max(asse.da, n))
    const [x, y] = [dentro(v[0]), dentro(v[1])]
    const [da, a] = x <= y ? [x, y] : [y, x]
    forma.onChange(da <= asse.da && a >= asse.a ? null : [da, a])
  }
  const leggi = (n: number): string => formattaNumero(forma, n)
  const dalloSlider = (v: number[]): [number, number] => [v[0] ?? asse.min, v[1] ?? asse.max]

  return (
    <div
      className={cn('flex w-72 max-w-full flex-col', className)}
      data-slot='facet-numero'
      data-scala={asse.tipo}
    >
      <div className='px-3 pt-5 pb-1'>
        <Slider
          min={asse.min}
          max={asse.max}
          step={asse.passo}
          minStepsBetweenThumbs={0}
          value={posizioni}
          onValueChange={v => setBozza(dalloSlider(v))}
          onValueCommit={v => scrivi(valoriDi(dalloSlider(v)))}
          etichette={[`${nome}: da`, `${nome}: a`]}

          testoValore={p =>
            leggi(p === posizioni[0] ? mostrato[0] : p === posizioni[1] ? mostrato[1] : asse.valore(p))
          }
          segni={asse.zero != null ? [asse.zero] : undefined}
        />
        <div className='text-muted-foreground mt-2 flex justify-between gap-2 text-xs tabular-nums'>
          <span className='truncate'>{leggi(asse.da)}</span>
          <span className='truncate'>{leggi(asse.a)}</span>
        </div>
      </div>
      <div className='grid grid-cols-2 gap-2 px-3 pt-1 pb-3'>
        <label className='flex min-w-0 flex-col gap-1'>
          <span className='text-muted-foreground text-xs'>Da</span>
          <NumberField
            value={mostrato[0]}
            unit={forma.unita}
            aria-label={`${nome}: da`}
            onValueChange={n => scrivi([n ?? asse.da, mostrato[1]])}
          />
        </label>
        <label className='flex min-w-0 flex-col gap-1'>
          <span className='text-muted-foreground text-xs'>A</span>
          <NumberField
            value={mostrato[1]}
            unit={forma.unita}
            aria-label={`${nome}: a`}
            onValueChange={n => scrivi([mostrato[0], n ?? asse.a])}
          />
        </label>
      </div>
      <div className='flex justify-end border-t p-1'>
        <Button
          variant='ghost'
          size='sm'
          className='text-muted-foreground h-(--control-h-xs) px-2 text-xs'
          disabled={forma.valore == null}
          onClick={() => {
            setBozza(null)
            forma.onChange(null)
          }}
        >
          Pulisci
        </Button>
      </div>
    </div>
  )
}

export function FormaFacetPanel({
  forma,
  nome,
  className,
}: {
  forma: FormaFacet
  nome: string
  className?: string
}) {
  return forma.tipo === 'numero' ? (
    <NumeroFacetPanel forma={forma} nome={nome} className={className} />
  ) : (
    <DataFacetPanel forma={forma} className={className} />
  )
}

export const confrontoAlfabetico = (a: { label: string }, b: { label: string }): number =>
  a.label.localeCompare(b.label, LOCALE, { numeric: true, sensitivity: 'base' })

export function opzioniInOrdine(f: Pick<FacetSpec, 'options' | 'ordine'>): FacetSpec['options'] {
  if (f.ordine === 'logico') return f.options
  const sistema = f.options.filter(o => o.value.startsWith('__'))
  const valori = f.options.filter(o => !o.value.startsWith('__')).sort(confrontoAlfabetico)
  return [...sistema, ...valori]
}

export type MegaFilterSort = {
  label?: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void

  desc?: { value: boolean; onChange: (desc: boolean) => void }
}

type MegaFilterProps = {
  searchValue?: string
  facets: FacetSpec[]

  resultCount?: number
  onClearAll: () => void

  extraFilters?: ReactNode

  extraSummary?: string[]

  defaultSummary?: string[]
  sort?: MegaFilterSort

  sheetExtra?: ReactNode

  compatto?: boolean
}

type MobileLevel = { kind: 'facet'; key: string } | { kind: 'sort' } | null

function fieldTitles(facet: FacetSpec): string[] {
  if (facet.forma != null) return fieldParts(facet)
  const non = prefissoEscluso(facet)
  return facet.selected.map(v => {
    const o = facet.options.find(x => x.value === v)
    return non + (o?.title ?? o?.label ?? v)
  })
}

function fieldParts(facet: FacetSpec): string[] {
  const non = prefissoEscluso(facet)
  if (facet.forma != null) return facet.forma.valore == null ? [] : [riassuntoForma(facet.forma)]
  const parts = facet.selected.map(v => non + (facet.options.find(o => o.value === v)?.label ?? v))
  if (facet.range && hasRange(facet.range.value)) parts.push(rangeLabel(facet.range.value))
  return parts
}

function summaryLabelOf(facet: FacetSpec, value: string): string {
  const non = prefissoEscluso(facet)

  if (facet.chipLabel) return facet.chipLabel(value, { escluso: non !== '' })
  return non + (facet.options.find(o => o.value === value)?.label ?? value)
}

function riassuntoAttivi(facets: FacetSpec[], searchValue?: string, extraSummary?: string[]): string[] {
  const summary: string[] = []
  const testo = searchValue?.trim() ?? ''
  if (testo) summary.push(`«${testo}»`)
  for (const facet of facets) {
    if (facet.forma != null) {
      if (formaAccesa(facet.forma)) summary.push(`${facet.label} ${riassuntoForma(facet.forma)}`)
      continue
    }
    for (const value of facet.selected) summary.push(summaryLabelOf(facet, value))
    if (facet.range && hasRange(facet.range.value)) summary.push(rangeLabel(facet.range.value))
  }
  summary.push(...(extraSummary ?? []))
  return summary
}

export function MegaFilterChips({
  searchValue,
  facets,
  extraSummary,
  defaultSummary,
  onClearAll,
  className,
}: {
  searchValue?: string
  facets: FacetSpec[]
  extraSummary?: string[]

  defaultSummary?: string[]
  onClearAll: () => void
  className?: string
}) {
  const summary = riassuntoAttivi(facets, searchValue, extraSummary)
  const defaults = defaultSummary ?? []
  if (summary.length === 0 && defaults.length === 0) return null
  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {defaults.map((voce, i) => (
        <span
          key={`default-${voce}-${i}`}
          className='text-muted-foreground rounded-md border border-dashed px-1.5 py-0.5 text-xs'
        >
          {voce}
        </span>
      ))}
      {summary.map((voce, i) => (
        <span
          key={`${voce}-${i}`}
          className='bg-muted text-muted-foreground rounded-md px-1.5 py-0.5 text-xs'
        >
          {voce}
        </span>
      ))}

      {summary.length > 0 && (
        <Button
          variant='ghost'
          size='sm'
          className='text-muted-foreground h-(--control-h-xs) px-1.5 text-xs'
          onClick={onClearAll}
        >
          Pulisci
        </Button>
      )}
    </div>
  )
}

export function IconaVoceFacet({
  icon: Icona,
  iconClass,
  riserva,
}: {
  icon?: FacetOption<string>['icon']
  iconClass?: string
  riserva: boolean
}) {
  if (Icona != null) return <Icona className={cn('size-4 shrink-0', iconClass ?? 'text-muted-foreground')} />
  return riserva ? <span aria-hidden className='size-4 shrink-0' /> : null
}

export const facetConIcone = (opzioni: ReadonlyArray<FacetOption<string>>): boolean =>
  opzioni.some(o => o.icon != null)

function PostoIcona({ className }: { className?: string }) {
  return <span aria-hidden className={className} />
}

function FacetContent({
  facet,
  rowClassName,
  onApply,
  mobile,
}: {
  facet: FacetSpec
  rowClassName?: string
  onApply?: () => void
  mobile?: boolean
}) {
  const conIcone = facetConIcone(facet.options)

  if (facet.forma != null) {
    return (
      <FormaFacetPanel
        forma={facet.forma}
        nome={facet.label}
        className={mobile ? cn('w-full', facet.forma.tipo === 'numero' && 'pt-1') : undefined}
      />
    )
  }
  if (facet.range) {
    return (
      <DateRangeFacetPanel
        options={facet.options}
        selected={facet.selected}
        onToggle={facet.onToggle}
        range={facet.range.value}
        onRangeChange={facet.range.onChange}
        onApply={onApply}
        rowClassName={rowClassName}
        single={facet.single}
      />
    )
  }
  if (facet.search) {
    return (
      <MultiCommandList
        options={facet.options.map(o => ({
          value: o.value,

          label: conIcone ? (
            <span className='flex min-w-0 items-center gap-2'>
              <IconaVoceFacet icon={o.icon} iconClass={o.iconClass} riserva />
              <span className='truncate'>{o.label}</span>
            </span>
          ) : (
            o.label
          ),

          search: o.label,

          trailing:
            o.count == null ? undefined : (
              <span className='text-muted-foreground text-xs tabular-nums'>{o.count}</span>
            ),
        }))}
        selected={facet.selected}
        onToggle={facet.onToggle}
        placeholder={facet.search.placeholder}
        emptyLabel={facet.search.emptyLabel ?? 'Nessun risultato'}
      />
    )
  }
  return (
    <div className='flex flex-col'>
      {facet.options.map(o => (
        <FacetOptionRow
          key={o.value}
          label={o.label}
          title={o.title}
          count={o.count}

          icon={o.icon ?? (conIcone ? PostoIcona : undefined)}
          iconClass={o.iconClass}
          checked={facet.selected.includes(o.value)}
          single={facet.single}
          onSelect={() => facet.onToggle(o.value)}
          className={rowClassName}
        />
      ))}
    </div>
  )
}

export function RigaEscludi({
  facet,
  className,
  rigaClassName,
  filo = true,
}: {
  facet: FacetSpec
  className?: string
  rigaClassName?: string
  filo?: boolean
}) {
  const escludi = facet.escludi
  if (escludi == null || !facetEscludibile(facet)) return null
  return (
    <div className={className} data-slot='facet-escludi'>
      {filo && <div aria-hidden className='bg-muted mx-2 my-1 h-px' />}
      <Interruttore
        etichetta='Escludi'
        acceso={escludi.attivo}
        onAcceso={() => escludi.onToggle()}
        className={cn('px-2 py-1.5', rigaClassName)}
      />
    </div>
  )
}

function PanelFoot({
  resultCount,
  onClearAll,
  className,
}: {
  resultCount?: number
  onClearAll: () => void
  className?: string
}) {
  return (
    <div className={cn('border-muted flex items-center justify-between gap-2 border-t', className)}>
      <span className='text-muted-foreground text-xs tabular-nums'>
        {resultCount != null && `${resultCount} risultat${resultCount === 1 ? 'o' : 'i'}`}
      </span>
      <Button
        variant='ghost'
        size='sm'
        className='text-muted-foreground h-(--control-h-xs) px-2 text-xs'
        onClick={onClearAll}
      >
        Pulisci tutto
      </Button>
    </div>
  )
}

function CategoryRow({
  label,
  value,
  attivo,
  onClick,
}: {
  label: string
  value: string
  attivo: boolean
  onClick: () => void
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      className='hover:bg-accent focus-visible:bg-accent flex h-11 w-full items-center gap-3 rounded-md px-1.5 text-sm outline-none'
    >
      <span className='shrink-0'>{label}</span>

      <span
        className={cn(
          'ms-auto flex min-w-0 items-center gap-1',
          attivo ? 'text-foreground' : 'text-muted-foreground'
        )}
      >
        <span className='truncate'>{value}</span>
        <ChevronRightIcon className='text-muted-foreground size-3.5 shrink-0' />
      </span>
    </button>
  )
}

export function MegaFilter({
  searchValue,
  facets: facetsDati,
  resultCount,
  onClearAll,
  extraFilters,
  extraSummary,
  defaultSummary,
  sort,
  sheetExtra,
  compatto,
}: MegaFilterProps) {
  const facets = facetsDati.map(f => (f.ordine === 'logico' ? f : { ...f, options: opzioniInOrdine(f) }))
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)

  const [openFacet, setOpenFacet] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [level, setLevel] = useState<MobileLevel>(null)

  const facetAttivo = (f: FacetSpec): boolean =>
    f.forma != null
      ? formaAccesa(f.forma)
      : f.selected.length > 0 || (f.range != null && hasRange(f.range.value))

  const rows = facets.filter(f => !f.hidden || facetAttivo(f))

  const summary = riassuntoAttivi(facets, searchValue, extraSummary)

  const activeCount =
    facets.reduce(
      (n, f) =>
        n +
        (f.forma != null
          ? formaAccesa(f.forma)
            ? 1
            : 0
          : f.selected.length + (f.range != null && hasRange(f.range.value) ? 1 : 0)),
      0
    ) + (extraSummary?.length ?? 0)

  const active = summary.length > 0
  const testoDi = (voci: string[]) =>
    `· ${voci.slice(0, 2).join(' · ')}${voci.length > 2 ? ` +${voci.length - 2}` : ''}`
  const summaryText = testoDi(summary)

  const lenteNellaBarra = useRicercaALente()
  const lente = compatto ? null : lenteNellaBarra
  const summaryFiltri = lente != null ? riassuntoAttivi(facets, undefined, extraSummary) : summary

  const soloRicerca = active && summaryFiltri.length === 0
  const pulisci = () => {
    if (lente != null && !window.matchMedia('(min-width: 40rem)').matches) lente.rimetti(lente.testo)
    onClearAll()
  }

  const mainButton = compatto ? (
    <Button
      variant='outline'
      size='icon-sm'
      aria-label={
        active
          ? `Filtri attivi (${activeCount}): ${summary.join(', ')}`
          : (defaultSummary?.length ?? 0) > 0
            ? `Filtri — vista predefinita: ${defaultSummary!.join(', ')}`
            : 'Filtri'
      }
      aria-expanded={isMobile ? sheetOpen : open}
      onClick={isMobile ? () => setSheetOpen(true) : undefined}
      className={cn('relative', active && 'border-primary text-primary')}
    >
      <ListFilterIcon />

      {activeCount > 0 && (
        <span
          aria-hidden
          className='bg-primary text-primary-foreground text-2xs absolute -end-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-medium tabular-nums'
        >
          {activeCount}
        </span>
      )}
    </Button>
  ) : (
    <Button
      variant='outline'
      size='sm'
      className={cn(
        'min-w-0 max-sm:shrink',
        active &&
          (soloRicerca && lente != null ? 'sm:rounded-e-none sm:border-e-0' : 'rounded-e-none border-e-0')
      )}
      aria-expanded={isMobile ? sheetOpen : open}
      onClick={isMobile ? () => setSheetOpen(true) : undefined}
    >
      <ListFilterIcon className='text-muted-foreground' />
      Filtri
      {active && lente != null ? (
        <>
          <span className='text-muted-foreground min-w-0 max-w-[260px] truncate font-normal max-sm:hidden'>
            {summaryText}
          </span>
          {soloRicerca ? (
            <ChevronDownIcon className='sm:hidden' />
          ) : (
            <span className='text-muted-foreground min-w-0 max-w-32 truncate font-normal sm:hidden'>
              {testoDi(summaryFiltri)}
            </span>
          )}
        </>
      ) : active ? (
        <span className='text-muted-foreground min-w-0 max-w-[260px] truncate font-normal max-sm:max-w-32'>
          {summaryText}
        </span>
      ) : (
        <ChevronDownIcon />
      )}
    </Button>
  )

  const clearButton =
    active && !compatto ? (
      <Button
        variant='outline'
        size='sm'
        className={cn('rounded-s-none px-2', soloRicerca && lente != null && 'max-sm:hidden')}
        aria-label='Pulisci tutti i filtri'
        onClick={pulisci}
      >
        <XIcon className='text-muted-foreground' />
      </Button>
    ) : null

  if (isMobile) {
    const levelFacet = level?.kind === 'facet' ? facets.find(f => f.key === level.key) : undefined
    const footClasses = 'mt-auto px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]'
    return (
      <div className='flex min-w-0'>
        {mainButton}
        {clearButton}
        <Sheet
          open={sheetOpen}
          onOpenChange={o => {
            setSheetOpen(o)
            if (!o) setLevel(null)
          }}
        >
          <SheetContent side='bottom' className='max-h-[80svh] min-h-[62svh] gap-0 rounded-t-xl'>
            {level == null ? (
              <>
                <SheetHeader className='pb-2'>
                  <SheetTitle>Filtri</SheetTitle>
                  <SheetDescription className='sr-only'>
                    I filtri di questa vista. Restano attivi anche chiudendo il pannello.
                  </SheetDescription>
                </SheetHeader>
                <div className='min-h-0 flex-1 overflow-y-auto px-4'>
                  {sheetExtra && <div className='pt-1 pb-3 [&>*]:w-full'>{sheetExtra}</div>}
                  {rows.map(facet => {
                    const parts = fieldParts(facet)
                    const attivo = parts.length > 0
                    return (
                      <CategoryRow
                        key={facet.key}
                        label={facet.label}
                        value={attivo ? parts.join(', ') : (facet.allLabel ?? 'Tutte')}
                        attivo={attivo}
                        onClick={() => setLevel({ kind: 'facet', key: facet.key })}
                      />
                    )
                  })}

                  {sort && (
                    <CategoryRow
                      label={sort.label ?? 'Ordina per'}
                      value={sort.options.find(o => o.value === sort.value)?.label ?? sort.value}
                      attivo={false}
                      onClick={() => setLevel({ kind: 'sort' })}
                    />
                  )}
                  {sort?.desc && (
                    <button
                      type='button'
                      onClick={() => sort.desc?.onChange(!sort.desc.value)}
                      className='hover:bg-accent focus-visible:bg-accent flex h-11 w-full items-center gap-3 rounded-md px-1.5 text-sm outline-none'
                    >
                      <span className='shrink-0'>Verso</span>
                      <span className='text-muted-foreground ms-auto flex min-w-0 items-center gap-1'>
                        <span className='truncate'>{sort.desc.value ? 'Decrescente' : 'Crescente'}</span>
                        {sort.desc.value ? (
                          <ArrowDownNarrowWideIcon className='size-3.5 shrink-0' />
                        ) : (
                          <ArrowUpNarrowWideIcon className='size-3.5 shrink-0' />
                        )}
                      </span>
                    </button>
                  )}
                  {extraFilters && (
                    <div className='border-muted mt-2 flex flex-col gap-1.5 border-t pt-3 pb-1 [&>*]:w-full [&>*]:min-w-0'>
                      {extraFilters}
                    </div>
                  )}
                </div>
                <PanelFoot resultCount={resultCount} onClearAll={pulisci} className={footClasses} />
              </>
            ) : (
              <>
                <SheetHeader className='flex-row items-center gap-1 pb-2'>
                  <button
                    type='button'
                    aria-label='Indietro'
                    onClick={() => setLevel(null)}
                    className='text-muted-foreground hover:bg-accent hover:text-foreground -ms-2 flex size-(--control-h-sm) shrink-0 items-center justify-center rounded-md'
                  >
                    <ChevronLeftIcon className='size-4' />
                  </button>
                  <SheetTitle>
                    {level.kind === 'sort' ? (sort?.label ?? 'Ordina per') : (levelFacet?.label ?? 'Filtri')}
                  </SheetTitle>
                  <SheetDescription className='sr-only'>
                    Le opzioni del filtro. La freccia torna all&apos;elenco senza chiudere.
                  </SheetDescription>
                </SheetHeader>
                <div className='min-h-0 flex-1 overflow-y-auto px-4'>
                  {level.kind === 'sort' && sort
                    ? sort.options.map(o => (
                        <FacetOptionRow
                          key={o.value}
                          label={o.label}
                          checked={o.value === sort.value}
                          single
                          onSelect={() => {
                            sort.onChange(o.value)

                            setLevel(null)
                          }}
                          className='py-2.5'
                        />
                      ))
                    : levelFacet && (
                        <>
                          <FacetContent
                            facet={levelFacet}
                            rowClassName='py-2.5'
                            onApply={() => setLevel(null)}
                            mobile
                          />

                          <RigaEscludi
                            facet={levelFacet}
                            className={levelFacet.search ? 'p-1' : undefined}
                            rigaClassName='py-2.5'
                          />
                        </>
                      )}
                </div>
                <PanelFoot resultCount={resultCount} onClearAll={pulisci} className={footClasses} />
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    )
  }

  return (
    <Popover
      open={open}
      onOpenChange={o => {
        setOpen(o)
        if (!o) setOpenFacet(null)
      }}
    >
      <div className='flex min-w-0'>
        <PopoverTrigger asChild>{mainButton}</PopoverTrigger>
        {clearButton}
      </div>
      <PopoverContent align='start' sideOffset={4} className='w-96 p-1'>
        <div className='flex flex-col'>
          {rows.map(facet => {
            const parts = fieldParts(facet)
            const attivo = parts.length > 0
            const escludibile = facetEscludibile(facet)
            return (
              <div key={facet.key} className={RIGA_PANNELLO}>
                <span className='text-[13px] text-muted-foreground truncate'>{facet.label}</span>
                <Popover
                  open={openFacet === facet.key}
                  onOpenChange={o => setOpenFacet(o ? facet.key : null)}
                >
                  <PopoverTrigger asChild>
                    <FieldTrigger aria-label={`Filtra per ${facet.label}`} className='min-w-0'>
                      <span
                        className={cn('truncate', !attivo && 'text-muted-foreground')}
                        title={attivo ? fieldTitles(facet).join(', ') : undefined}
                      >
                        {attivo ? parts.join(', ') : (facet.allLabel ?? 'Tutte')}
                      </span>
                    </FieldTrigger>
                  </PopoverTrigger>
                  <PopoverContent
                    align='start'
                    sideOffset={4}
                    className={cn(
                      facet.search || facet.forma != null ? 'p-0' : 'p-1',

                      facet.range || facet.forma != null
                        ? 'w-auto min-w-(--radix-popover-trigger-width)'
                        : 'w-(--radix-popover-trigger-width)',
                      !facet.range &&
                        facet.forma == null &&
                        !facet.search &&
                        !escludibile &&
                        'max-h-72 overflow-y-auto'
                    )}
                  >
                    {escludibile ? (
                      <>
                        <div className={cn(!facet.search && 'max-h-64 overflow-y-auto')}>
                          <FacetContent facet={facet} onApply={() => setOpenFacet(null)} />
                        </div>
                        <RigaEscludi facet={facet} className={facet.search ? 'p-1' : undefined} />
                      </>
                    ) : (
                      <FacetContent facet={facet} onApply={() => setOpenFacet(null)} />
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            )
          })}
        </div>
        {extraFilters && (
          <>
            <div aria-hidden className='bg-muted mx-2 my-1 h-px' />
            <div className='flex flex-col gap-1.5 px-2 py-1 [&>*]:w-full [&>*]:min-w-0'>{extraFilters}</div>
          </>
        )}
        <PanelFoot resultCount={resultCount} onClearAll={onClearAll} className='mt-1 px-2.5 pt-2 pb-1.5' />
      </PopoverContent>
    </Popover>
  )
}
