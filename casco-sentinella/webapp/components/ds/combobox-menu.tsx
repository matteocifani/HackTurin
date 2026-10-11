/** Searchable single-choice list, in a popover or inline, with an optional "create" row. Part of the IAMAimpresa design system. */
'use client'

import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as TastoReact,
  type PointerEvent as PuntatoreReact,
  type ReactNode,
} from 'react'

import { CheckIcon, PlusIcon, SearchIcon } from 'lucide-react'

import { BottoneIcona } from '@/components/ds/bottone-icona'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

export type ComboboxOption = {
  value: string
  label: ReactNode

  search?: string

  trailing?: ReactNode

  title?: string
  disabled?: boolean

  comando?: ComandoDellaVoce
}

export type ComandoDellaVoce = {
  etichetta: string

  icona: ReactNode

  onComando: () => void
}

export type ComboboxGroup = {
  key: string
  heading?: string
  options: ComboboxOption[]
}

export function valoreVoceCrea(valore: string): string {
  return `__nuova__${valore}`.trim()
}

export const LISTA_CON_TESTA = 'scroll-pt-11 [[data-bottom-sheet]_&]:scroll-pt-14'

const TASTI_DI_MOTO = new Set(['ArrowDown', 'ArrowUp', 'Home', 'End'])
const muoveLaRiga = (e: TastoReact) =>
  TASTI_DI_MOTO.has(e.key) || (e.ctrlKey && ['n', 'j', 'p', 'k'].includes(e.key))

function normalizza(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

function paroleDi(cercato: string): string[] {
  const n = normalizza(cercato)
  return n === '' ? [] : n.split(' ')
}

export function contieneTutteLeParole(testo: string, cercato: string): boolean {
  const t = normalizza(testo)
  return paroleDi(cercato).every(p => t.includes(p))
}

export function testoDellaRiga(o: { value: string; label: ReactNode; search?: string }): string {
  return typeof o.label === 'string' || typeof o.label === 'number' ? String(o.label) : (o.search ?? o.value)
}

const RIGHE = '[cmdk-item]:not([aria-disabled="true"])'

function listaDi(radice: HTMLElement): HTMLElement | null {
  const dentro = radice.querySelector<HTMLElement>('[cmdk-list]')
  if (dentro != null) return dentro
  const id = radice.querySelector('[cmdk-input]')?.getAttribute('aria-controls')
  return id ? document.getElementById(id) : null
}

function rigaVoluta(radice: HTMLElement, conCrea: boolean, aVuotoSpenta = false) {
  const righe = [...(listaDi(radice) ?? radice).querySelectorAll<HTMLElement>(RIGHE)]
  const accesa = righe.find(r => r.getAttribute('aria-selected') === 'true') ?? null
  const crea = conCrea ? (righe.find(r => r.hasAttribute('data-voce-crea')) ?? null) : null
  const cercato = radice.querySelector<HTMLInputElement>('[cmdk-input]')?.value ?? ''
  const vuoto = paroleDi(cercato).length === 0
  let voluta: HTMLElement | null | undefined
  if (vuoto && aVuotoSpenta) {
    voluta = null
  } else if (vuoto) {
    const prima = righe.find(r => r !== crea) ?? null
    voluta = crea != null && (accesa === crea || accesa == null) ? (prima ?? crea) : undefined
  } else {
    const primo = righe.find(r => r !== crea && !r.hasAttribute('data-voce-azzera')) ?? null
    voluta =
      primo != null &&
      contieneTutteLeParole(primo.getAttribute('data-testo') ?? primo.textContent ?? '', cercato)
        ? primo
        : crea
  }
  return { righe, accesa, voluta, vuoto }
}

const SPENTA = '__spenta__'

type OpzioniRiga = {
  inLettura?: boolean

  aVuotoSpenta?: boolean
}

export function focoAllaRicerca(e: Event) {
  const campo =
    e.currentTarget instanceof HTMLElement
      ? e.currentTarget.querySelector<HTMLInputElement>('[cmdk-input]')
      : null
  if (campo == null) return
  e.preventDefault()
  campo.focus({ preventScroll: true })
}

export function useRigaEvidenziata(
  iniziale: string | undefined,
  valoreCrea: string | undefined,
  { inLettura = false, aVuotoSpenta = false }: OpzioniRiga = {}
) {
  const radice = useRef<HTMLDivElement>(null)
  const [evidenziata, setEvidenziata] = useState(aVuotoSpenta ? SPENTA : (iniziale?.trim() ?? ''))
  const [, setGiro] = useState(0)
  const riletture = useRef(0)

  const gesto = useRef(false)
  const dalGesto = useRef(false)
  const marca = () => {
    gesto.current = true
    setTimeout(() => {
      gesto.current = false
    })
  }
  const onValueChange = (riga: string) => {
    dalGesto.current = gesto.current
    setEvidenziata(riga)
  }

  useLayoutEffect(() => {
    if (!inLettura || valoreCrea == null || evidenziata !== valoreCrea) return
    dalGesto.current = false
    setEvidenziata('')
  }, [inLettura, valoreCrea, evidenziata])

  // eslint-disable-next-line react-hooks/exhaustive-deps -- re-measures the highlighted row after every render on purpose
  useLayoutEffect(() => {
    const lista = radice.current
    if (lista == null) return
    const { righe, accesa, voluta, vuoto } = rigaVoluta(lista, valoreCrea != null, aVuotoSpenta)

    if ((accesa?.getAttribute('data-value') ?? '') !== (evidenziata === SPENTA ? '' : evidenziata)) {
      if (riletture.current >= 3) return
      riletture.current += 1
      const f = requestAnimationFrame(() => setGiro(g => g + 1))
      return () => cancelAnimationFrame(f)
    }
    riletture.current = 0

    for (const el of [lista.querySelector('[cmdk-input]'), listaDi(lista)]) {
      if (el == null) continue
      if (accesa == null) el.removeAttribute('aria-activedescendant')
      else if (el.getAttribute('aria-activedescendant') !== accesa.id)
        el.setAttribute('aria-activedescendant', accesa.id)
    }
    if (dalGesto.current || voluta === undefined) return

    if (aVuotoSpenta && vuoto) {
      if (evidenziata !== SPENTA) setEvidenziata(SPENTA)
      return
    }
    if (voluta === accesa) return

    if (voluta == null) {
      setEvidenziata('')
      return
    }
    const da = accesa == null ? -1 : righe.indexOf(accesa)
    const tasto = da === -1 ? 'Home' : righe.indexOf(voluta) > da ? 'ArrowDown' : 'ArrowUp'
    lista.dispatchEvent(new KeyboardEvent('keydown', { key: tasto, bubbles: true }))
  })
  return {
    ref: radice,
    value: evidenziata,
    onValueChange,

    onKeyDown: (e: TastoReact) => {
      if (!e.nativeEvent.isTrusted) return
      if (muoveLaRiga(e)) {
        marca()

        if (
          aVuotoSpenta &&
          e.key === 'ArrowUp' &&
          radice.current != null &&
          rigaVoluta(radice.current, valoreCrea != null, true).accesa == null
        ) {
          e.preventDefault()
          radice.current.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
        }
        return
      }

      gesto.current = false
      if (e.key === 'Enter' && !e.nativeEvent.isComposing && !dalGesto.current && radice.current != null) {
        const { accesa, voluta } = rigaVoluta(radice.current, valoreCrea != null, aVuotoSpenta)
        if (voluta === undefined || voluta === accesa) return
        e.preventDefault()
        voluta?.click()
      }
    },

    onPointerMoveCapture: marca,
    onPointerDownCapture: marca,
  }
}

export function VoceCrea({
  valore,
  etichetta,
  onScegli,
  disabled,
}: {
  valore: string
  etichetta: ReactNode
  onScegli: () => void
  disabled?: boolean
}) {
  return (
    <CommandGroup forceMount className='bg-popover sticky top-0 z-(--z-inner-front) border-b'>
      <CommandItem
        forceMount
        value={valoreVoceCrea(valore)}
        disabled={disabled}
        data-voce-crea=''
        title={typeof etichetta === 'string' ? etichetta : undefined}
        onSelect={onScegli}
      >
        <PlusIcon />

        <span className='min-w-0 truncate'>{etichetta}</span>
      </CommandItem>
    </CommandGroup>
  )
}

type ComboboxListProps = {
  options?: ComboboxOption[]
  groups?: ComboboxGroup[]

  value: string | null
  onPick: (value: string | null) => void
  placeholder: string
  emptyLabel: string

  searchValue?: string
  onSearchChange?: (value: string) => void

  shouldFilter?: boolean

  clearOption?: ReactNode

  addOption?: { label: ReactNode; value: string }

  inLettura?: boolean

  className?: string
  listClassName?: string
}

function rigaIniziale(
  options: ComboboxOption[] | undefined,
  groups: ComboboxGroup[] | undefined,
  value: string | null
): string | undefined {
  const corrente =
    value == null
      ? undefined
      : [...(options ?? []), ...(groups ?? []).flatMap(g => g.options)].find(o => o.value === value)
  return corrente != null ? (corrente.search ?? corrente.value) : undefined
}

const ChiudiIlMenu = createContext<(() => void) | null>(null)

function campoDellaLista(el: Element): HTMLInputElement | null {
  const id = el.closest('[cmdk-list]')?.id
  return id
    ? document.querySelector<HTMLInputElement>(`[cmdk-input][aria-controls="${CSS.escape(id)}"]`)
    : null
}

function ComandoInVoce({ comando, raggiungibile }: { comando: ComandoDellaVoce; raggiungibile: boolean }) {
  const chiudi = useContext(ChiudiIlMenu)
  return (
    <BottoneIcona
      etichetta={comando.etichetta}
      icona={comando.icona}
      size='icon-xs'
      tabIndex={raggiungibile ? 0 : -1}
      className='text-muted-foreground -my-1 shrink-0 opacity-0 transition-opacity motion-reduce:transition-none in-data-[selected=true]:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100 [[data-bottom-sheet]_&]:opacity-100'
      onClick={e => {
        e.preventDefault()
        e.stopPropagation()
        chiudi?.()
        comando.onComando()
      }}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.stopPropagation()
          return
        }

        if (TASTI_DI_MOTO.has(e.key)) campoDellaLista(e.currentTarget)?.focus()
      }}
      data-comando-voce=''
    />
  )
}

type VociDelMenuProps = Pick<
  ComboboxListProps,
  'options' | 'groups' | 'value' | 'onPick' | 'emptyLabel' | 'clearOption' | 'addOption' | 'inLettura'
> & {
  accesa?: string
}

function VociDelMenu({
  options,
  groups,
  value,
  onPick,
  emptyLabel,
  clearOption,
  addOption,
  inLettura,
  accesa,
}: VociDelMenuProps) {
  const riga = (o: ComboboxOption) => {
    const scelta = o.value === value
    return (
      <CommandItem
        key={o.value}
        value={o.search ?? o.value}
        disabled={o.disabled}
        title={o.title}
        data-testo={testoDellaRiga(o)}
        onSelect={() => onPick(o.value)}

        className='flex-wrap pr-8'
      >
        {o.label}
        {o.comando != null ? (
          <span className='ms-auto flex shrink-0 items-center gap-1.5'>
            {o.trailing}
            <ComandoInVoce
              comando={o.comando}
              raggiungibile={accesa != null && accesa === (o.search ?? o.value).trim()}
            />
          </span>
        ) : (
          o.trailing
        )}
        {scelta ? (
          <span className='absolute right-2 flex size-3.5 items-center justify-center'>
            <CheckIcon className='size-4 text-current' />
          </span>
        ) : null}
      </CommandItem>
    )
  }
  return (
    <>
      {addOption != null ? (
        <VoceCrea
          valore={addOption.value}
          etichetta={addOption.label}
          disabled={inLettura}
          onScegli={() => onPick(addOption.value)}
        />
      ) : null}
      <CommandEmpty>{emptyLabel}</CommandEmpty>
      {clearOption != null || options != null ? (
        <CommandGroup>
          {clearOption != null ? (
            <CommandItem value='__nessuno__' data-voce-azzera='' onSelect={() => onPick(null)}>
              {clearOption}
            </CommandItem>
          ) : null}
          {options?.map(riga)}
        </CommandGroup>
      ) : null}
      {groups?.map(g => (
        <CommandGroup key={g.key} heading={g.heading}>
          {g.options.map(riga)}
        </CommandGroup>
      ))}
    </>
  )
}

export function ComboboxList({
  options,
  groups,
  value,
  onPick,
  placeholder,
  emptyLabel,
  searchValue,
  onSearchChange,
  shouldFilter,
  clearOption,
  addOption,
  inLettura,
  className,
  listClassName,
}: ComboboxListProps) {
  const evidenziata = useRigaEvidenziata(
    rigaIniziale(options, groups, value),
    addOption != null ? valoreVoceCrea(addOption.value) : undefined,
    { inLettura }
  )
  return (
    <Command shouldFilter={shouldFilter} {...evidenziata} className={className}>
      <CommandInput placeholder={placeholder} value={searchValue} onValueChange={onSearchChange} />
      <CommandList
        className={cn(addOption != null && LISTA_CON_TESTA, listClassName)}
        aria-busy={inLettura || undefined}
      >
        <VociDelMenu
          options={options}
          groups={groups}
          value={value}
          onPick={onPick}
          emptyLabel={emptyLabel}
          clearOption={clearOption}
          addOption={addOption}
          inLettura={inLettura}
          accesa={evidenziata.value}
        />
      </CommandList>
    </Command>
  )
}

type ComboboxTelaio = {
  open?: boolean
  onOpenChange?: (open: boolean) => void

  closeOnPick?: boolean
  align?: 'start' | 'center' | 'end'

  contentClassName?: string
}

type ComboboxInMenuProps = ComboboxListProps &
  ComboboxTelaio & {
    trigger: ReactNode
  }

type ComboboxInLineaProps = ComboboxListProps &
  ComboboxTelaio & {
    inLinea: true
    trigger?: never

    alFuoco?: 'apri'

    inCoda?: ReactNode
  }

export type ComboboxProps =
  (ComboboxInMenuProps & { inLinea?: false; alFuoco?: never; inCoda?: never }) | ComboboxInLineaProps

export function Combobox(props: ComboboxProps) {
  return props.inLinea === true ? <ComboboxInLinea {...props} /> : <ComboboxInMenu {...props} />
}

function ComboboxInMenu({
  trigger,
  open,
  onOpenChange,
  closeOnPick = true,
  align = 'start',
  contentClassName,
  onPick,
  ...list
}: ComboboxInMenuProps) {
  const [internoAperto, setInternoAperto] = useState(false)
  const aperto = open ?? internoAperto
  const cambia = (v: boolean) => {
    setInternoAperto(v)
    onOpenChange?.(v)
  }
  return (
    <Popover open={aperto} onOpenChange={cambia} modal>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align={align}
        onOpenAutoFocus={focoAllaRicerca}
        className={cn('w-(--radix-popover-trigger-width) p-0', contentClassName)}
      >
        <ChiudiIlMenu.Provider value={() => cambia(false)}>
          <ComboboxList
            {...list}
            onPick={v => {
              onPick(v)
              if (closeOnPick) cambia(false)
            }}
          />
        </ChiudiIlMenu.Provider>
      </PopoverContent>
    </Popover>
  )
}

const RIGA_IN_LINEA = 'flex min-w-0 items-center gap-2'

const CAMPO_IN_LINEA =
  'border-input bg-(--surface-command) h-(--control-h-sm) min-w-0 flex-1 rounded-md border text-sm transition-[color,box-shadow]'
const ANELLO_DENTRO =
  'focus-within:border-ring focus-within:ring-(length:--focus-ring-width) focus-within:ring-ring/50'
const ANELLO_DEL_BOTTONE =
  'outline-none focus-visible:border-ring focus-visible:ring-(length:--focus-ring-width) focus-visible:ring-ring/50'

const RADICE_IN_LINEA =
  'bg-transparent text-foreground **:data-[slot=command-input-wrapper]:h-full **:data-[slot=command-input-wrapper]:border-b-0 **:data-[slot=command-input-wrapper]:px-2.5'

function ComboboxInLinea({
  open,
  onOpenChange,
  closeOnPick = true,
  align = 'start',
  contentClassName,
  alFuoco,
  inCoda,
  className,
  searchValue,
  onSearchChange,
  onPick,
  ...list
}: ComboboxInLineaProps) {
  const telefono = useIsMobile()
  const [internoAperto, setInternoAperto] = useState(false)
  const aperto = open ?? internoAperto
  const cambia = (v: boolean) => {
    setInternoAperto(v)
    onOpenChange?.(v)
  }

  const [testoInterno, setTestoInterno] = useState('')
  const testo = searchValue ?? testoInterno
  const scrivi = (v: string) => {
    setTestoInterno(v)
    onSearchChange?.(v)
  }
  if (telefono) {
    return (
      <div data-slot='combobox-in-linea' className={cn(RIGA_IN_LINEA, className)}>
        <ComboboxInMenu
          {...list}
          searchValue={testo}
          onSearchChange={scrivi}
          onPick={onPick}
          open={aperto}
          onOpenChange={cambia}
          closeOnPick={closeOnPick}
          align={align}
          contentClassName={contentClassName}
          trigger={
            <button
              type='button'
              className={cn(CAMPO_IN_LINEA, ANELLO_DEL_BOTTONE, 'flex items-center gap-2 px-2.5 text-start')}
            >
              <SearchIcon className='size-4 shrink-0 opacity-50' />
              <span className={cn('min-w-0 truncate', testo === '' && 'text-muted-foreground')}>
                {testo === '' ? list.placeholder : testo}
              </span>
            </button>
          }
        />
        {inCoda}
      </div>
    )
  }
  return (
    <div data-slot='combobox-in-linea' className={cn(RIGA_IN_LINEA, className)}>
      <Popover open={aperto} onOpenChange={cambia}>
        <ChiudiIlMenu.Provider value={() => cambia(false)}>
          <CampoInLinea
            {...list}
            aperto={aperto}
            apri={() => cambia(true)}
            alFuoco={alFuoco}
            testo={testo}
            scrivi={scrivi}
            onPick={v => {
              onPick(v)
              if (closeOnPick) cambia(false)
            }}
            align={align}
            contentClassName={contentClassName}
          />
        </ChiudiIlMenu.Provider>
      </Popover>
      {inCoda}
    </div>
  )
}

type CampoInLineaProps = Omit<ComboboxListProps, 'className' | 'searchValue' | 'onSearchChange'> & {
  aperto: boolean
  apri: () => void
  alFuoco?: 'apri'
  testo: string
  scrivi: (testo: string) => void
  align: 'start' | 'center' | 'end'
  contentClassName?: string
}

const DIALOGO = '[role="dialog"], [role="alertdialog"]'

const APRONO = new Set(['ArrowDown', 'ArrowUp'])

function CampoInLinea({
  aperto,
  apri,
  alFuoco,
  testo,
  scrivi,
  align,
  contentClassName,
  options,
  groups,
  value,
  onPick,
  placeholder,
  emptyLabel,
  shouldFilter,
  clearOption,
  addOption,
  inLettura,
  listClassName,
}: CampoInLineaProps) {
  const iniziale = rigaIniziale(options, groups, value)
  const evidenziata = useRigaEvidenziata(
    iniziale,
    addOption != null ? valoreVoceCrea(addOption.value) : undefined,
    { inLettura, aVuotoSpenta: true }
  )
  const radice = evidenziata.ref
  const campo = useRef<HTMLDivElement>(null)

  const [contenitore, setContenitore] = useState<HTMLElement | null>(null)
  useLayoutEffect(() => {
    setContenitore(campo.current?.closest<HTMLElement>(DIALOGO) ?? null)
  }, [])

  useLayoutEffect(() => {
    const input = radice.current?.querySelector('[cmdk-input]')
    if (input == null) return
    input.setAttribute('aria-expanded', aperto ? 'true' : 'false')
    if (aperto) return
    const spegni = () => {
      if (input.hasAttribute('aria-activedescendant')) input.removeAttribute('aria-activedescendant')
    }
    spegni()
    const osservatore = new MutationObserver(spegni)
    osservatore.observe(input, { attributes: true, attributeFilter: ['aria-activedescendant'] })
    return () => osservatore.disconnect()
  }, [aperto, radice])

  const partenza = (testoOra: string) => (testoOra.trim() === '' ? SPENTA : (iniziale?.trim() ?? ''))
  const apriDaQui = (testoOra: string = testo) => {
    if (aperto) return
    evidenziata.onValueChange(partenza(testoOra))
    apri()
  }

  const apriAlFuoco = () => {
    const entrata =
      campo.current
        ?.closest(DIALOGO)
        ?.getAnimations()
        .filter(a => a.playState === 'running') ?? []
    if (entrata.length === 0) {
      apriDaQui(testo)
      return
    }
    void Promise.all(entrata.map(a => a.finished)).then(
      () => {
        const input = radice.current?.querySelector('[cmdk-input]')
        if (
          input instanceof HTMLInputElement &&
          document.activeElement === input &&
          input.getAttribute('aria-expanded') === 'false'
        ) {
          evidenziata.onValueChange(partenza(input.value))
          apri()
        }
      },
      () => {}
    )
  }

  const soloNellaLista = (marca: () => void) => (e: PuntatoreReact) => {
    if (e.target instanceof Element && e.target.closest('[cmdk-list]') != null) marca()
  }
  return (
    <PopoverAnchor
      ref={campo}
      className={cn(CAMPO_IN_LINEA, ANELLO_DENTRO)}

      onMouseDown={e => {
        const input = radice.current?.querySelector<HTMLInputElement>('[cmdk-input]')
        if (input == null || e.target === input) return
        e.preventDefault()
        input.focus()
      }}
    >
      <Command
        shouldFilter={shouldFilter}
        {...evidenziata}
        onPointerMoveCapture={soloNellaLista(evidenziata.onPointerMoveCapture)}
        onPointerDownCapture={soloNellaLista(evidenziata.onPointerDownCapture)}
        className={RADICE_IN_LINEA}
      >
        <CommandInput
          placeholder={placeholder}
          value={testo}
          onValueChange={v => {
            scrivi(v)
            apriDaQui(v)
          }}
          onFocus={alFuoco === 'apri' ? apriAlFuoco : undefined}
          onClick={alFuoco === 'apri' ? () => apriDaQui(testo) : undefined}
          onKeyDown={e => {
            if (aperto || !APRONO.has(e.key)) return

            e.preventDefault()
            e.stopPropagation()
            if (e.key === 'ArrowDown' && testo.trim() === '') {
              evidenziata.onPointerDownCapture()
              evidenziata.onValueChange('')
              apri()
              return
            }
            apriDaQui(testo)
          }}
          className='h-full py-0'
        />
        <PopoverContent
          align={align}
          container={contenitore}
          onOpenAutoFocus={e => e.preventDefault()}

          onInteractOutside={e => {
            if (e.target instanceof Node && campo.current?.contains(e.target)) e.preventDefault()
          }}
          className={cn('w-(--radix-popover-trigger-width) p-0', contentClassName)}
        >
          <CommandList
            className={cn(addOption != null && LISTA_CON_TESTA, listClassName)}
            aria-busy={inLettura || undefined}
          >
            <VociDelMenu
              options={options}
              groups={groups}
              value={value}
              onPick={onPick}
              emptyLabel={emptyLabel}
              clearOption={clearOption}
              addOption={addOption}
              inLettura={inLettura}
            />
          </CommandList>
        </PopoverContent>
      </Command>
    </PopoverAnchor>
  )
}
