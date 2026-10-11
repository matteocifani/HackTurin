/** Table for lists: sticky header, resizable and sortable columns, row links, column filters, windowing. Part of the IAMAimpresa design system. */
'use client'

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type RowData,
  type ExpandedState,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowDownIcon, ArrowUpIcon, ChevronRightIcon } from 'lucide-react'

import { ColumnFunnel } from '@/components/ds/column-funnel'
import { InfoDot } from '@/components/ds/info-dot'
import { Troncato } from '@/components/ds/troncato'
import { FINESTRA, Sentinella } from '@/components/ds/finestra'
import type { FacetSpec } from '@/components/ds/mega-filter'
import { useTransizionePannello } from '@/components/ds/workspace'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { auxClickNaviga, clickNaviga, eSuControllo, selezioneInCorso } from '@/lib/navigazione'
import { cn } from '@/lib/utils'

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- augmentation must repeat the upstream type parameters
  interface ColumnMeta<TData extends RowData, TValue> {
    headClassName?: string

    cellClassName?: string

    titolo?: (riga: TData) => string

    min?: number

    elastica?: boolean

    info?: { label: string; testo: ReactNode }

    alta?: boolean
  }
}

export type DataTableLarghezze = {
  valori: Record<string, number>

  imposta: (chiave: string, px: number | null) => void

  base: (chiave: string) => number

  onRese?: (rese: Record<string, number>) => void
}

export type DataTableOrdinamento = {
  chiave: string | null
  desc: boolean
  imposta: (chiave: string, desc: boolean) => void

  ordinabili: ReadonlySet<string>
}

export type DataTableRiordino = {
  sequenza: string[]
  imposta: (sequenza: string[]) => void

  fisse: ReadonlySet<string>
}

const LARGHEZZA_MIN = 64

const ELASTICA_MIN = 200
const LARGHEZZA_MAX = 800

const RIENTRO_FIGLIA = 16

const LARGHEZZA_SELEZIONE = 48

const RESPIRO_CHEVRON = 8

export type DataTableDensita = 'normale' | 'media' | 'fitta'

const TESTATA: Record<DataTableDensita, string> = { normale: 'h-11', media: 'h-10', fitta: 'h-8' }

const RESPIRO: Record<DataTableDensita, string> = { normale: 'py-2.5', media: 'py-2', fitta: 'py-1.5' }

function spartisci(totale: number, pesi: number[]): number[] {
  const somma = pesi.reduce((s, p) => s + p, 0)
  if (totale <= 0 || somma <= 0) return pesi.map(() => 0)
  const quote = pesi.map((p, i) => {
    const esatta = (totale * p) / somma
    return { i, intera: Math.floor(esatta), resto: esatta - Math.floor(esatta) }
  })
  let avanzo = totale - quote.reduce((s, q) => s + q.intera, 0)
  for (const q of [...quote].sort((a, b) => b.resto - a.resto)) {
    if (avanzo <= 0) break
    q.intera += 1
    avanzo -= 1
  }
  return quote.map(q => q.intera)
}

type Geometria = {
  elastica: string

  selezione: string | null

  rese: Record<string, number>

  minimi: Record<string, number>

  sommaMinimi: number
  trabocca: boolean
}

function riconosciForma<T>(
  colonne: Column<T, unknown>[]
): { elastica: Column<T, unknown>; selezione: Column<T, unknown> | null } | null {
  const prima = colonne[0]
  if (prima == null) return null
  const elastica =
    colonne.find(c => c.columnDef.meta?.elastica === true) ??
    colonne.find(c => typeof c.columnDef.header === 'string') ??
    prima

  const davanti = colonne[colonne.indexOf(elastica) - 1]
  return {
    elastica,
    selezione: davanti != null && typeof davanti.columnDef.header !== 'string' ? davanti : null,
  }
}

const CASELLA = '[role="checkbox"], input[type="checkbox"]'

const MANO_CASELLA =
  'has-[[role=checkbox]:enabled]:cursor-pointer has-[[role=checkbox]:disabled]:cursor-default [&_[role=checkbox]:enabled]:cursor-pointer'

function casellaDelGesto(e: React.MouseEvent<HTMLTableCellElement>): HTMLElement | null {
  const cella = e.currentTarget

  if (e.button !== 0 || !(e.target instanceof Node) || !e.nativeEvent.composedPath().includes(cella))
    return null

  if (eSuControllo(e.target, cella)) return null
  return cella.querySelector<HTMLElement>(CASELLA)
}

function clicSullaCasella(e: React.MouseEvent<HTMLTableCellElement>) {
  const casella = casellaDelGesto(e)
  if (casella == null) return
  e.stopPropagation()
  if (casella.matches(':disabled')) return
  casella.dispatchEvent(
    new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window,
      shiftKey: e.shiftKey,
      metaKey: e.metaKey,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
    })
  )
}

function pressioneSullaCasella(e: React.MouseEvent<HTMLTableCellElement>) {
  if ((e.shiftKey || e.metaKey || e.ctrlKey) && casellaDelGesto(e) != null) e.preventDefault()
}

function calcolaGeometria<T>(
  colonne: Column<T, unknown>[],
  larghezze: DataTableLarghezze,
  disponibile: number,
  albero: boolean
): Geometria | null {
  const forma = riconosciForma(colonne)
  if (forma == null) return null

  const { elastica, selezione } = forma
  const minimi: Record<string, number> = {}
  const px: Record<string, number> = {}
  for (const c of colonne) {
    if (c === selezione) {
      minimi[c.id] = LARGHEZZA_SELEZIONE + (albero ? RESPIRO_CHEVRON : 0)
      px[c.id] = minimi[c.id]
      continue
    }
    const base = larghezze.base(c.id)
    minimi[c.id] = c.columnDef.meta?.min ?? (c === elastica ? ELASTICA_MIN : Math.min(LARGHEZZA_MIN, base))
    px[c.id] = Math.max(minimi[c.id], larghezze.valori[c.id] ?? base)
  }
  const mobili = colonne.filter(c => c !== selezione)
  const sommaPx = colonne.reduce((s, c) => s + px[c.id], 0)
  const sommaMinimi = colonne.reduce((s, c) => s + minimi[c.id], 0)
  const trabocca = disponibile > 0 && sommaMinimi > disponibile
  const rese: Record<string, number> = {}
  if (disponibile === 0) {
    for (const c of colonne) rese[c.id] = px[c.id]
  } else if (trabocca) {
    for (const c of colonne) rese[c.id] = minimi[c.id]
  } else if (sommaPx <= disponibile) {
    const dato = spartisci(
      disponibile - sommaPx,
      mobili.map(c => px[c.id])
    )
    for (const c of colonne) rese[c.id] = px[c.id]
    mobili.forEach((c, i) => (rese[c.id] = px[c.id] + dato[i]))
  } else {
    const tolto = spartisci(
      sommaPx - disponibile,
      mobili.map(c => px[c.id] - minimi[c.id])
    )
    for (const c of colonne) rese[c.id] = px[c.id]
    mobili.forEach((c, i) => (rese[c.id] = px[c.id] - tolto[i]))
  }
  return { elastica: elastica.id, selezione: selezione?.id ?? null, rese, minimi, sommaMinimi, trabocca }
}

type DataTableProps<T> = {
  data: T[]
  columns: ColumnDef<T>[]

  onRowClick?: (row: T) => void

  rowHref?: (row: T) => string | undefined

  rowLabel?: (row: T) => string
  rowClassName?: (row: T) => string | undefined

  rowDataProps?: (row: T) => Record<string, string | undefined> | undefined

  rigaIntera?: (row: T) => ReactNode | undefined

  footer: ReactNode | ((conteggio: DataTableConteggio) => ReactNode)

  fixed?: boolean

  espandibile?: {
    figli: (riga: T) => T[]

    haFigli?: (riga: T) => boolean
    onApri?: (riga: T) => void

    colonna?: string

    aperte?: boolean | ((riga: T) => boolean)

    chiave?: string
  }

  larghezze?: DataTableLarghezze

  ordinamento?: DataTableOrdinamento

  imbuti?: Record<string, FacetSpec>

  riordino?: DataTableRiordino

  cornice?: boolean

  finestra?: { chiave: string; passo?: number }

  densita?: DataTableDensita
}

export type DataTableConteggio = { rese: number; totali: number }

function GuscioTabella({ cornice, ...props }: ComponentProps<'div'> & { cornice: boolean }) {
  return cornice ? <Card {...props} /> : <div {...props} />
}

export function DataTable<T>({
  data,
  columns,
  onRowClick,
  rowHref,
  rowLabel,
  rowClassName,
  rowDataProps,
  rigaIntera,
  footer,
  fixed,
  espandibile,
  larghezze,
  ordinamento,
  imbuti,
  riordino,
  cornice = true,
  finestra,
  densita = 'normale',
}: DataTableProps<T>) {
  const router = useRouter()

  const [sorting, setSorting] = useState<SortingState>([])

  const espansioneIniziale = (): ExpandedState => {
    const aperte = espandibile?.aperte
    if (espandibile == null || aperte == null || aperte === false) return {}
    const puoAprirsi = (riga: T) => espandibile.figli(riga).length > 0 || espandibile.haFigli?.(riga) === true
    const stato: Record<string, boolean> = {}
    data.forEach((riga, i) => {
      if (puoAprirsi(riga) && (aperte === true || aperte(riga))) stato[String(i)] = true
    })
    return stato
  }
  const [expanded, setExpanded] = useState<ExpandedState>(espansioneIniziale)

  const [chiaveEspansione, setChiaveEspansione] = useState(espandibile?.chiave)
  if (chiaveEspansione !== espandibile?.chiave) {
    setChiaveEspansione(espandibile?.chiave)
    setExpanded(espansioneIniziale())
  }

  const [trascinata, setTrascinata] = useState<string | null>(null)
  const [bersaglio, setBersaglio] = useState<string | null>(null)

  const ridimensionando = useRef(false)

  const [inResize, setInResize] = useState<string | null>(null)

  const contenitore = useRef<HTMLDivElement>(null)
  const [larghezzaCard, setLarghezzaCard] = useState(0)

  const onRese = useRef(larghezze?.onRese)
  onRese.current = larghezze?.onRese

  const table = useReactTable({
    data,
    columns,
    state: { sorting, expanded },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,

    enableSorting: ordinamento == null,
    getSubRows: espandibile
      ? riga => {
          const f = espandibile.figli(riga)
          return f.length > 0 ? f : undefined
        }
      : undefined,
    getRowCanExpand: espandibile?.haFigli
      ? row => row.subRows.length > 0 || espandibile.haFigli?.(row.original) === true
      : undefined,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const passo = finestra?.passo ?? FINESTRA
  const chiaveFinestra = finestra == null ? '' : `${finestra.chiave}|${JSON.stringify(sorting)}`
  const [aperta, setAperta] = useState({ chiave: chiaveFinestra, n: passo })
  const nFinestra = aperta.chiave === chiaveFinestra ? aperta.n : passo
  const righeTutte = table.getRowModel().rows
  const righeRese =
    finestra == null || nFinestra >= righeTutte.length ? righeTutte : righeTutte.slice(0, nFinestra)
  const allarga = useCallback(
    () =>
      setAperta(x => ({ chiave: chiaveFinestra, n: (x.chiave === chiaveFinestra ? x.n : passo) + passo })),
    [chiaveFinestra, passo]
  )
  const conteggio: DataTableConteggio = {
    rese: righeRese.filter(r => r.depth === 0).length,
    totali: righeTutte.filter(r => r.depth === 0).length,
  }

  const larghezzaDi = useCallback(
    (chiave: string) => larghezze?.valori[chiave] ?? larghezze?.base(chiave) ?? 0,
    [larghezze]
  )

  const trascina = useCallback(
    (e: React.PointerEvent<HTMLSpanElement>, chiave: string, su: (delta: number) => void) => {
      e.preventDefault()
      e.stopPropagation()
      ridimensionando.current = true
      setInResize(chiave)
      const x0 = e.clientX
      const muovi = (ev: PointerEvent) => su(ev.clientX - x0)
      const fine = () => {
        window.removeEventListener('pointermove', muovi)
        window.removeEventListener('pointerup', fine)
        setInResize(null)

        window.setTimeout(() => {
          ridimensionando.current = false
        }, 0)
      }
      window.addEventListener('pointermove', muovi)
      window.addEventListener('pointerup', fine)
    },
    []
  )

  const congela = useCallback(
    (g: Geometria) => {
      if (larghezze == null) return
      for (const id of Object.keys(g.rese)) {
        if (id === g.selezione) continue
        const px = larghezze.valori[id] ?? larghezze.base(id)
        const resa = g.rese[id]
        if (resa != null && resa !== px) larghezze.imposta(id, resa)
      }
    },
    [larghezze]
  )

  const preparaResize = useCallback(
    (g: Geometria, chiave: string, ordine: string[]) => {
      const partenza = g.rese[chiave] ?? larghezzaDi(chiave)
      const minimo = g.minimi[chiave] ?? LARGHEZZA_MIN
      const destre = ordine
        .slice(ordine.indexOf(chiave) + 1)
        .filter(id => id !== g.selezione)
        .map(id => ({ id, resa: g.rese[id] ?? 0, min: g.minimi[id] ?? LARGHEZZA_MIN }))
      const margini = destre.map(c => Math.max(0, c.resa - c.min))
      const cedibile = margini.reduce((s, m) => s + m, 0)
      const massimo = Math.min(LARGHEZZA_MAX, partenza + cedibile)
      return { chiave, partenza, minimo, massimo, destre, margini }
    },
    [larghezzaDi]
  )
  type Presa = ReturnType<typeof preparaResize>

  const applicaLarghezza = useCallback(
    (p: Presa, voluta: number) => {
      if (larghezze == null) return
      const nuova = Math.round(Math.min(p.massimo, Math.max(p.minimo, voluta)))
      const d = nuova - p.partenza
      larghezze.imposta(p.chiave, nuova)
      const quote =
        d >= 0
          ? spartisci(d, p.margini)
          : spartisci(
              -d,
              p.destre.map(c => c.resa)
            )
      p.destre.forEach((c, i) => larghezze.imposta(c.id, d >= 0 ? c.resa - quote[i] : c.resa + quote[i]))
    },
    [larghezze]
  )

  const iniziaResize = useCallback(
    (e: React.PointerEvent<HTMLSpanElement>, g: Geometria, chiave: string, ordine: string[]) => {
      if (larghezze == null) return
      const p = preparaResize(g, chiave, ordine)
      congela(g)
      trascina(e, chiave, delta => applicaLarghezza(p, p.partenza + delta))
    },
    [larghezze, preparaResize, congela, trascina, applicaLarghezza]
  )

  const adattaAlTesto = useCallback(
    (e: React.MouseEvent<HTMLSpanElement>, g: Geometria, chiave: string, ordine: string[]) => {
      if (larghezze == null) return
      const th = e.currentTarget.closest('th')?.previousElementSibling
      const riga = th?.parentElement
      const tabella = th?.closest('table')
      if (th == null || riga == null || tabella == null) return
      const indice = Array.prototype.indexOf.call(riga.children, th)
      let voluta = 0
      const misura = (cella: Element | null | undefined) => {
        if (!(cella instanceof HTMLElement)) return
        for (const troncato of cella.querySelectorAll<HTMLElement>('.truncate')) {
          voluta = Math.max(voluta, troncato.scrollWidth + (cella.clientWidth - troncato.clientWidth))
        }
      }
      misura(th)
      for (const r of tabella.querySelectorAll('tbody tr')) {
        const cella = r.children[indice]

        if (cella instanceof HTMLTableCellElement && cella.colSpan === 1) misura(cella)
      }
      if (voluta === 0) return
      const p = preparaResize(g, chiave, ordine)
      congela(g)
      applicaLarghezza(p, Math.ceil(voluta) + 1)
    },
    [larghezze, preparaResize, congela, applicaLarghezza]
  )

  const conLarghezze = larghezze != null

  const PAUSA_MISURA_MS = 120
  const inTransizione = useTransizionePannello()
  const inTransizioneRef = useRef(inTransizione)
  inTransizioneRef.current = inTransizione
  useLayoutEffect(() => {
    const el = contenitore.current
    if (el == null || !conLarghezze) return
    const misura = () => setLarghezzaCard(Math.floor(el.clientWidth))
    misura()
    let pausa = 0

    const inCorsa = () => inTransizioneRef.current || el.closest('[data-transizione]') != null
    const ro = new ResizeObserver(() => {
      if (inCorsa()) return
      window.clearTimeout(pausa)
      pausa = window.setTimeout(() => {
        if (!inCorsa()) misura()
      }, PAUSA_MISURA_MS)
    })
    ro.observe(el)
    return () => {
      window.clearTimeout(pausa)
      ro.disconnect()
    }
  }, [conLarghezze])
  useLayoutEffect(() => {
    const el = contenitore.current
    if (el == null || !conLarghezze || inTransizione) return
    setLarghezzaCard(Math.floor(el.clientWidth))
  }, [conLarghezze, inTransizione])

  const riordina = (da: string, a: string) => {
    if (riordino == null || da === a) return
    const visibili = table.getAllLeafColumns().map(c => c.id)
    const base =
      riordino.sequenza.includes(da) && riordino.sequenza.includes(a) ? riordino.sequenza : visibili
    const senza = base.filter(k => k !== da)
    const versoDestra = base.indexOf(da) < base.indexOf(a)
    const dove = senza.indexOf(a) + (versoDestra ? 1 : 0)
    riordino.imposta([...senza.slice(0, dove), da, ...senza.slice(dove)])
  }

  const colonneFoglia = table.getAllLeafColumns()
  const geometria = larghezze
    ? calcolaGeometria(colonneFoglia, larghezze, larghezzaCard, espandibile != null)
    : null
  const trabocca = geometria?.trabocca === true
  const nColonne = colonneFoglia.length
  const indiceElastica = geometria != null ? colonneFoglia.findIndex(c => c.id === geometria.elastica) : -1

  const cellaRientro =
    espandibile != null ? (espandibile.colonna ?? geometria?.elastica ?? colonneFoglia[0]?.id ?? null) : null
  const cellaChevron = espandibile != null ? (geometria?.selezione ?? cellaRientro) : null

  const colonnaCaselle =
    geometria != null ? geometria.selezione : (riconosciForma(colonneFoglia)?.selezione?.id ?? null)

  const firmaRese = geometria != null && larghezzaCard > 0 ? JSON.stringify(geometria.rese) : ''
  useEffect(() => {
    if (firmaRese === '') return
    onRese.current?.(JSON.parse(firmaRese) as Record<string, number>)
  }, [firmaRese])

  return (
    <GuscioTabella
      cornice={cornice}
      ref={contenitore}
      className={cn(
        'gap-0 overflow-clip py-0',

        cornice && '[overflow-clip-margin:1px]',
        trabocca
          ? '[&_[data-slot=table-container]]:overflow-x-auto'
          : cornice
            ? '[&_[data-slot=table-container]]:overflow-clip [&_[data-slot=table-container]]:[overflow-clip-margin:1px]'
            : '[&_[data-slot=table-container]]:overflow-x-clip',

        larghezze && '[contain:inline-size]'
      )}
    >
      <Table
        className={cn((fixed || larghezze) && 'table-fixed', densita === 'fitta' && 'text-xs')}

        style={
          geometria != null
            ? {
                minWidth: geometria.sommaMinimi,
                ...(inTransizione && larghezzaCard > 0 ? { width: larghezzaCard } : {}),
              }
            : undefined
        }
      >
        {geometria != null && (
          <colgroup>
            {colonneFoglia.map(c => (
              <col
                key={c.id}
                style={c.id === geometria.elastica ? undefined : { width: geometria.rese[c.id] }}
              />
            ))}
          </colgroup>
        )}
        <TableHeader>
          {table.getHeaderGroups().map(hg => (
            <TableRow key={hg.id} className='hover:bg-transparent'>
              {hg.headers.map((header, i) => {
                const chiave = header.column.id
                const ultima = larghezze != null && i === hg.headers.length - 1
                const elastica = geometria?.elastica === chiave
                const selezione = geometria != null && geometria.selezione === chiave

                const conManiglia = larghezze != null && geometria != null && i >= indiceElastica && !ultima

                const precedente =
                  larghezze != null && geometria != null && i > indiceElastica && i > 0
                    ? hg.headers[i - 1]
                    : undefined
                const canSort = header.column.getCanSort()
                const dir = header.column.getIsSorted()
                const meta = header.column.columnDef.meta
                const etichetta = flexRender(header.column.columnDef.header, header.getContext())

                const ordinabile = ordinamento != null && ordinamento.ordinabili.has(chiave)
                const ordina = ordinabile && ordinamento.chiave === chiave
                const imbuto = imbuti?.[chiave]
                const caselle = colonnaCaselle === chiave

                const trascinabile = riordino != null && !riordino.fisse.has(chiave) && !caselle
                return (
                  <TableHead
                    key={header.id}
                    aria-sort={ordina ? (ordinamento.desc ? 'descending' : 'ascending') : undefined}
                    draggable={trascinabile || undefined}
                    onDragStart={
                      trascinabile
                        ? e => {
                            if (ridimensionando.current) {
                              e.preventDefault()
                              return
                            }
                            e.dataTransfer.effectAllowed = 'move'
                            setTrascinata(chiave)
                          }
                        : undefined
                    }
                    onDragOver={
                      trascinabile
                        ? e => {
                            if (trascinata == null || trascinata === chiave) return
                            e.preventDefault()
                            setBersaglio(chiave)
                          }
                        : undefined
                    }
                    onDrop={
                      trascinabile
                        ? e => {
                            e.preventDefault()
                            if (trascinata != null) riordina(trascinata, chiave)
                            setTrascinata(null)
                            setBersaglio(null)
                          }
                        : undefined
                    }
                    onDragEnd={
                      trascinabile
                        ? () => {
                            setTrascinata(null)
                            setBersaglio(null)
                          }
                        : undefined
                    }
                    className={cn(
                      'sticky z-(--z-raised) bg-card',

                      trabocca
                        ? 'top-0'
                        : 'top-2 [[data-slot=collapsible-content]_&]:top-10 before:bg-background before:border-b before:border-border before:pointer-events-none before:absolute before:-inset-x-px before:bottom-full before:h-2.25',

                      'after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-border',
                      TESTATA[densita],
                      meta?.headClassName,

                      ultima && 'pe-4',

                      elastica &&
                        (geometria?.selezione != null ? 'ps-0' : espandibile != null ? 'ps-7' : 'ps-5'),

                      selezione && 'ps-2 pe-2',
                      caselle && MANO_CASELLA,

                      conManiglia && 'border-e border-border',
                      canSort && 'cursor-pointer select-none',
                      trascinabile && 'cursor-grab select-none',
                      bersaglio === chiave && 'border-s-primary border-s-2',
                      trascinata === chiave && 'opacity-50'
                    )}
                    onClick={canSort ? header.column.getToggleSortingHandler() : undefined}

                    onClickCapture={caselle ? clicSullaCasella : undefined}
                    onMouseDownCapture={caselle ? pressioneSullaCasella : undefined}
                    tabIndex={canSort ? 0 : undefined}
                    onKeyDown={e => {
                      if (canSort && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault()
                        header.column.toggleSorting()
                      }
                    }}
                  >
                    {precedente != null && geometria != null && larghezze != null && (
                      <span
                        role='separator'
                        aria-orientation='vertical'
                        aria-label={`Ridimensiona (doppio clic: adatta al testo) ${typeof precedente.column.columnDef.header === 'string' ? precedente.column.columnDef.header : precedente.column.id}`}
                        data-maniglia={precedente.column.id}
                        onPointerDown={e =>
                          iniziaResize(
                            e,
                            geometria,
                            precedente.column.id,
                            colonneFoglia.map(c => c.id)
                          )
                        }
                        onDoubleClick={e => {
                          e.stopPropagation()

                          adattaAlTesto(
                            e,
                            geometria,
                            precedente.column.id,
                            colonneFoglia.map(c => c.id)
                          )
                        }}
                        onClick={e => e.stopPropagation()}
                        className={cn(
                          'absolute inset-y-0 -start-1 z-(--z-raised) w-2 cursor-col-resize touch-none select-none',

                          'before:absolute before:inset-y-0 before:start-0.75 before:w-0.5 hover:before:bg-foreground/60',
                          inResize === precedente.column.id && 'before:bg-foreground/60'
                        )}
                      />
                    )}
                    <span className={cn('flex items-center gap-1', larghezze && 'min-w-0')}>
                      {ordinabile ? (
                        <button
                          type='button'
                          onClick={e => {
                            e.stopPropagation()

                            ordinamento.imposta(chiave, ordina ? !ordinamento.desc : false)
                          }}
                          className={cn(
                            'focus-visible:ring-ring hover:text-foreground flex min-w-0 items-center gap-1 rounded-sm outline-none focus-visible:ring-2',
                            ordina ? 'text-foreground' : 'text-muted-foreground'
                          )}
                        >
                          {larghezze ? <Troncato>{etichetta}</Troncato> : <span>{etichetta}</span>}
                          {ordina &&
                            (ordinamento.desc ? (
                              <ArrowDownIcon className='size-3.5 shrink-0' />
                            ) : (
                              <ArrowUpIcon className='size-3.5 shrink-0' />
                            ))}
                        </button>
                      ) : (
                        <>
                          {larghezze ? <Troncato className='min-w-0'>{etichetta}</Troncato> : etichetta}
                          {dir === 'asc' && <ArrowUpIcon className='size-3.5' />}
                          {dir === 'desc' && <ArrowDownIcon className='size-3.5' />}
                        </>
                      )}

                      {meta?.info != null && <InfoDot label={meta.info.label}>{meta.info.testo}</InfoDot>}
                      {imbuto && (
                        <ColumnFunnel
                          facet={imbuto}
                          label={
                            typeof header.column.columnDef.header === 'string'
                              ? header.column.columnDef.header
                              : undefined
                          }
                        />
                      )}
                    </span>
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {righeRese.map(row => {
            const href = rowHref?.(row.original)
            const conFigli = row.getCanExpand()
            const aperta = row.getIsExpanded()

            const inAttesa =
              aperta &&
              espandibile?.haFigli != null &&
              row.subRows.length === 0 &&
              espandibile.haFigli(row.original) === true
            const intera = rigaIntera?.(row.original)
            return (
              <Fragment key={row.id}>
                <TableRow
                  {...rowDataProps?.(row.original)}
                  className={cn(
                    (onRowClick || href) && 'cursor-pointer',

                    href && 'relative',

                    row.depth > 0 && 'bg-muted/40',
                    rowClassName?.(row.original)
                  )}
                  onClick={
                    href
                      ? e => clickNaviga(e, href, router)
                      : onRowClick
                        ? e => {
                            if (eSuControllo(e.target, e.currentTarget) || selezioneInCorso()) return
                            onRowClick(row.original)
                          }
                        : undefined
                  }
                  onAuxClick={href ? e => auxClickNaviga(e, href) : undefined}
                >
                  {intera != null && <TableCell colSpan={nColonne}>{intera}</TableCell>}
                  {row.getVisibleCells().map((cell, i, celle) => {
                    if (intera != null) return null
                    const meta = cell.column.columnDef.meta
                    const titolo = larghezze ? meta?.titolo?.(row.original) : undefined
                    const contenuto = flexRender(cell.column.columnDef.cell, cell.getContext())
                    const conChevron = cellaChevron != null && cell.column.id === cellaChevron
                    const conRientro = cellaRientro != null && cell.column.id === cellaRientro
                    const ultima = larghezze != null && i === celle.length - 1
                    const elastica = geometria?.elastica === cell.column.id
                    const selezione = geometria != null && geometria.selezione === cell.column.id
                    const caselle = colonnaCaselle === cell.column.id
                    return (
                      <TableCell
                        key={cell.id}

                        onClickCapture={caselle ? clicSullaCasella : undefined}
                        onMouseDownCapture={caselle ? pressioneSullaCasella : undefined}
                        className={cn(
                          meta?.alta === true && densita !== 'normale' ? 'py-0' : RESPIRO[densita],
                          larghezze && 'max-w-0',
                          meta?.cellClassName,
                          ultima && 'pe-4',

                          conChevron && 'relative',
                          (conChevron || elastica) &&
                            geometria?.selezione == null &&
                            (espandibile != null ? 'ps-7' : 'ps-5'),
                          elastica && geometria?.selezione != null && 'ps-0',
                          selezione && 'ps-2 pe-2',
                          caselle && MANO_CASELLA
                        )}
                      >
                        {i === 0 && href && (
                          <Link
                            href={href}
                            data-row-link
                            aria-label={rowLabel?.(row.original) ?? 'Apri'}
                            className='focus-visible:ring-ring pointer-events-none absolute inset-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-inset'
                          />
                        )}
                        {conChevron && espandibile != null && conFigli && (
                          <button
                            type='button'
                            aria-expanded={aperta}
                            aria-label={aperta ? 'Chiudi il sotto-elenco' : 'Apri il sotto-elenco'}
                            onClick={e => {
                              e.stopPropagation()

                              if (!aperta && row.subRows.length === 0) espandibile.onApri?.(row.original)
                              row.toggleExpanded()
                            }}
                            className={cn(
                              'text-foreground hover:text-primary focus-visible:ring-ring absolute inset-y-0 flex w-4 items-center justify-center rounded outline-none focus-visible:ring-2',
                              selezione ? 'start-8' : 'start-2'
                            )}
                          >
                            <ChevronRightIcon className={cn('size-4', aperta && 'rotate-90')} />
                          </button>
                        )}

                        {conRientro ? (
                          larghezze ? (
                            <Troncato
                              className='block min-w-0'
                              style={
                                row.depth > 0 ? { paddingInlineStart: row.depth * RIENTRO_FIGLIA } : undefined
                              }
                              testo={titolo}
                            >
                              {contenuto}
                            </Troncato>
                          ) : (
                            <span
                              className='block min-w-0'
                              style={
                                row.depth > 0 ? { paddingInlineStart: row.depth * RIENTRO_FIGLIA } : undefined
                              }
                            >
                              {contenuto}
                            </span>
                          )
                        ) : larghezze ? (
                          <Troncato className='block min-w-0' testo={titolo}>
                            {contenuto}
                          </Troncato>
                        ) : (
                          contenuto
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
                {inAttesa && (
                  <TableRow className='bg-muted/40 hover:bg-muted/40' aria-busy>
                    <TableCell
                      colSpan={nColonne}
                      className={cn(densita === 'media' ? 'py-2' : 'py-2.5', 'ps-7')}
                    >
                      <span
                        className='flex items-center gap-1.5'
                        style={{ paddingInlineStart: (row.depth + 1) * RIENTRO_FIGLIA }}
                      >
                        <Skeleton className='h-4 w-1/3' />
                      </span>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            )
          })}
        </TableBody>
      </Table>
      {finestra != null && (
        <Sentinella
          attiva={righeRese.length < righeTutte.length}
          rese={righeRese.length}
          chiave={chiaveFinestra}
          onAncora={allarga}
        />
      )}
      {footer !== false && (
        <div className='text-muted-foreground border-t px-4 py-2.5 text-xs tabular-nums'>
          {typeof footer === 'function' ? footer(conteggio) : footer}
        </div>
      )}
    </GuscioTabella>
  )
}

const SAGOMA: Record<DataTableDensita, { testata: string; riga: string }> = {
  normale: { testata: 'py-3.5', riga: 'py-3' },
  media: { testata: 'py-3', riga: 'py-1.5' },
  fitta: { testata: 'py-2', riga: 'py-1' },
}

export function DataTableSkeleton({
  rows = 7,
  densita = 'normale',
}: {
  rows?: number
  densita?: DataTableDensita
}) {
  const sagoma = SAGOMA[densita]
  return (
    <Card className='gap-0 py-0'>
      <div className='sm:hidden'>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className='space-y-2 border-b px-4 py-3 last:border-b-0'>
            <Skeleton className='h-4 w-3/4' />
            <Skeleton className='h-3 w-1/2' />
          </div>
        ))}
      </div>
      <div className='max-sm:hidden'>
        <div className={cn('border-b px-4', sagoma.testata)}>
          <Skeleton className='h-4 w-full max-w-2xl' />
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className={cn('flex items-center gap-4 border-b px-4 last:border-b-0', sagoma.riga)}>
            <Skeleton className='h-4 w-4/12' />
            <Skeleton className='h-5 w-24 rounded-full' />
            <Skeleton className='size-6 rounded-lg' />
            <Skeleton className='h-4 w-16' />
            <Skeleton className='ms-auto h-4 w-14' />
          </div>
        ))}
      </div>
    </Card>
  )
}
