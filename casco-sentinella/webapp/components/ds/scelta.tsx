/** Choice from a list: a Select for short lists, a searchable Combobox when it can grow; single or multiple. Part of the IAMAimpresa design system. */
'use client'

import { useState, type ComponentProps, type KeyboardEvent, type ReactElement, type ReactNode } from 'react'

import { ChevronDownIcon, PlusIcon } from 'lucide-react'

import { ChipInterruttore } from '@/components/ds/chip-interruttore'
import { Combobox, type ComboboxGroup, type ComboboxOption } from '@/components/ds/combobox-menu'
import { MultiCommand, type MultiCommandOption } from '@/components/ds/multi-command'
import { Button } from '@/components/ui/button'
import {
  SELECT_TRIGGER,
  SELECT_TRIGGER_SUPERFICIE,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export type OpzioneScelta = ComboboxOption
export type GruppoScelta = ComboboxGroup

export const SOGLIA_SCELTA = 7

const AZZERA = '__nessuno__'

const CREA = '__crea__'

type Base = {
  opzioni?: OpzioneScelta[]
  gruppi?: GruppoScelta[]

  value?: string | null

  placeholder?: string

  cerca?: string

  vuoto?: string

  soglia?: number

  crea?: { etichetta: string; onScegli: () => void }

  trigger?: ReactNode
  name?: string
  id?: string
  disabled?: boolean
  size?: 'sm' | 'default'

  variant?: keyof typeof SELECT_TRIGGER_SUPERFICIE
  className?: string

  contentClassName?: string
  align?: 'start' | 'center' | 'end'
  open?: boolean
  onOpenChange?: (open: boolean) => void
} & Omit<
  ComponentProps<'button'>,
  'value' | 'onChange' | 'children' | 'name' | 'id' | 'disabled' | 'className'
>

export type SceltaProps<Z extends ReactNode | undefined = undefined> = Base & {
  azzera?: Z
  onValueChange?: (value: Z extends undefined ? string : string | null) => void
}

function conRicerca(o: OpzioneScelta): OpzioneScelta {
  if (o.search != null) return o
  const etichetta = typeof o.label === 'string' || typeof o.label === 'number' ? String(o.label) : o.value
  return { ...o, search: etichetta }
}

export type SceltaMultiplaProps = {
  multipla: true
  opzioni?: OpzioneScelta[]
  gruppi?: GruppoScelta[]

  value: string[]
  onValueChange?: (value: string[]) => void

  riassunto?: string | ((scelte: OpzioneScelta[]) => string)

  chip?: boolean

  placeholder?: string

  cerca?: string

  vuoto?: string

  soglia?: number

  azzera?: true | string

  crea?: { etichetta: string; onScegli: () => void }

  etichettaRimuovi?: (etichetta: string) => string
  name?: string
  id?: string
  disabled?: boolean
  size?: 'sm' | 'default'

  variant?: keyof typeof SELECT_TRIGGER_SUPERFICIE

  className?: string

  contentClassName?: string
  align?: 'start' | 'center' | 'end'
  open?: boolean
  onOpenChange?: (open: boolean) => void
} & Omit<
  ComponentProps<'button'>,
  'value' | 'onChange' | 'children' | 'name' | 'id' | 'disabled' | 'className'
>

function testoDi(o: OpzioneScelta): string {
  if (typeof o.label === 'string' || typeof o.label === 'number') return String(o.label)
  return o.search ?? o.value
}

function eMultipla(p: object): p is SceltaMultiplaProps {
  return (p as { multipla?: unknown }).multipla === true
}

export function Scelta(props: SceltaMultiplaProps): ReactElement
export function Scelta<Z extends ReactNode | undefined = undefined>(props: SceltaProps<Z>): ReactElement
export function Scelta<Z extends ReactNode | undefined = undefined>(
  props: SceltaProps<Z> | SceltaMultiplaProps
): ReactElement {
  if (eMultipla(props)) return <SceltaMultipla {...props} />
  return <SceltaSingola {...props} />
}

function SceltaSingola<Z extends ReactNode | undefined = undefined>({
  opzioni = [],
  gruppi,
  value,
  onValueChange,
  azzera,
  crea,
  placeholder,
  cerca = 'Cerca…',
  vuoto = 'Nessun risultato',
  soglia = SOGLIA_SCELTA,
  trigger,
  name,
  id,
  disabled,
  size = 'default',
  variant = 'default',
  className,
  contentClassName,
  align = 'start',
  open,
  onOpenChange,
  ...resto
}: SceltaProps<Z>) {
  const tutte = [...opzioni, ...(gruppi ?? []).flatMap(g => g.options)]
  const scelta = value == null ? undefined : tutte.find(o => o.value === value)

  const cambia = (v: string | null) => (onValueChange as ((value: string | null) => void) | undefined)?.(v)

  const sceglie = (v: string | null) => (v === CREA ? crea?.onScegli() : cambia(v))

  const tastoDaChiusa = (e: KeyboardEvent<HTMLButtonElement>) => {
    ;(resto as { onKeyDown?: (e: KeyboardEvent<HTMLButtonElement>) => void }).onKeyDown?.(e)
    if (e.key.length === 1 && e.key !== ' ' && !e.ctrlKey && !e.metaKey && !e.altKey) e.preventDefault()
  }

  if (tutte.length <= soglia) {
    const voce = (o: OpzioneScelta) => (
      <SelectItem key={o.value} value={o.value} disabled={o.disabled} title={o.title} trailing={o.trailing}>
        {o.label}
      </SelectItem>
    )
    return (
      <Select
        value={value ?? ''}
        onValueChange={v => sceglie(v === AZZERA ? null : v)}
        name={name}
        disabled={disabled}
        open={open}
        onOpenChange={onOpenChange}
      >
        {trigger != null ? (
          <SelectTrigger asChild id={id} {...resto} onKeyDown={tastoDaChiusa}>
            {trigger}
          </SelectTrigger>
        ) : (
          <SelectTrigger
            id={id}
            size={size}
            variant={variant}
            className={className}
            {...resto}
            onKeyDown={tastoDaChiusa}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
        )}
        <SelectContent
          position={trigger != null ? 'popper' : undefined}
          align={align}
          className={contentClassName}
        >
          {crea != null ? (
            <>
              <SelectItem value={CREA} data-voce-crea=''>
                <PlusIcon />
                {crea.etichetta}
              </SelectItem>
              <SelectSeparator />
            </>
          ) : null}
          {azzera != null ? <SelectItem value={AZZERA}>{azzera}</SelectItem> : null}
          {opzioni.map(voce)}
          {gruppi?.map(g => (
            <SelectGroup key={g.key}>
              {g.heading ? <SelectLabel>{g.heading}</SelectLabel> : null}
              {g.options.map(voce)}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <>
      <Combobox
        trigger={
          trigger ?? (
            <button
              type='button'
              id={id}
              disabled={disabled}
              data-slot='select-trigger'
              data-size={size}
              data-variant={variant}
              data-placeholder={scelta == null ? '' : undefined}
              className={cn(SELECT_TRIGGER, SELECT_TRIGGER_SUPERFICIE[variant], className)}
              {...resto}
            >
              <span data-slot='select-value'>{scelta?.label ?? placeholder}</span>
              <ChevronDownIcon className='size-4 opacity-50' />
            </button>
          )
        }
        options={opzioni.map(conRicerca)}
        groups={gruppi?.map(g => ({ ...g, options: g.options.map(conRicerca) }))}
        value={value ?? null}
        onPick={sceglie}
        placeholder={cerca}
        emptyLabel={vuoto}
        clearOption={azzera}
        addOption={crea != null ? { label: crea.etichetta, value: CREA } : undefined}
        align={align}
        contentClassName={contentClassName}
        open={open}
        onOpenChange={onOpenChange}
      />
      {name ? <input type='hidden' name={name} value={value ?? ''} /> : null}
    </>
  )
}

function SceltaMultipla({
  opzioni = [],
  gruppi,
  value,
  onValueChange,
  riassunto,
  placeholder,
  cerca = 'Cerca…',
  vuoto = 'Nessun risultato',
  soglia = SOGLIA_SCELTA,
  azzera,
  crea,
  chip = true,
  etichettaRimuovi = etichetta => `Togli «${etichetta}»`,
  name,
  id,
  disabled,
  size = 'default',
  variant = 'default',
  className,
  contentClassName,
  align = 'start',
  open,
  onOpenChange,
  multipla: _multipla,
  ...resto
}: SceltaMultiplaProps) {
  const [apertoQui, setApertoQui] = useState(false)
  const aperto = open ?? apertoQui
  const apri = (prossimo: boolean) => {
    setApertoQui(prossimo)
    onOpenChange?.(prossimo)
  }

  const tutte = [...opzioni, ...(gruppi ?? []).flatMap(g => g.options)]
  const scelte = new Set(value)

  const inOrdine = [
    ...tutte.filter(o => scelte.has(o.value)),
    ...value.filter(v => !tutte.some(o => o.value === v)).map(v => ({ value: v, label: v })),
  ]
  const cambia = (prossimo: string[]) => onValueChange?.(prossimo)
  const ordina = (insieme: Set<string>) => [
    ...tutte.filter(o => insieme.has(o.value)).map(o => o.value),
    ...value.filter(v => insieme.has(v) && !tutte.some(o => o.value === v)),
  ]

  const alterna = (v: string) => {
    if (v === CREA) {
      apri(false)
      crea?.onScegli()
      return
    }
    const prossimo = new Set(scelte)
    if (prossimo.has(v)) prossimo.delete(v)
    else prossimo.add(v)
    cambia(ordina(prossimo))
  }
  const togli = (v: string) => cambia(value.filter(x => x !== v))

  const n = inOrdine.length
  const testo =
    n === 0
      ? placeholder
      : typeof riassunto === 'function'
        ? riassunto(inOrdine)
        : n <= 2
          ? inOrdine.map(testoDi).join(', ')
          : riassunto != null
            ? `${n} ${riassunto}`
            : `${inOrdine.slice(0, 2).map(testoDi).join(', ')} e altre ${n - 2}`

  const voce = (o: OpzioneScelta): MultiCommandOption => ({
    value: o.value,
    label: o.label,
    search: conRicerca(o).search,
    trailing: o.trailing,
    disabled: o.disabled,
  })

  return (
    <div className='min-w-0 space-y-(--space-field)'>
      <MultiCommand
        trigger={
          <button
            type='button'
            id={id}
            disabled={disabled}
            data-slot='select-trigger'
            data-size={size}
            data-variant={variant}
            data-placeholder={n === 0 ? '' : undefined}
            className={cn(SELECT_TRIGGER, SELECT_TRIGGER_SUPERFICIE[variant], className)}
            {...resto}
          >
            <span data-slot='select-value'>{testo}</span>
            <ChevronDownIcon className='size-4 opacity-50' />
          </button>
        }
        options={opzioni.map(voce)}
        groups={gruppi?.map(g => ({ key: g.key, heading: g.heading, options: g.options.map(voce) }))}
        selected={value}
        onToggle={alterna}
        placeholder={cerca}
        emptyLabel={vuoto}
        ricerca={tutte.length > soglia}
        onTogliUltimo={n > 0 ? () => togli(inOrdine[n - 1].value) : undefined}
        addOption={crea != null ? { label: crea.etichetta, value: CREA } : undefined}
        align={align}
        contentClassName={contentClassName}
        open={aperto}
        onOpenChange={apri}
        footer={
          azzera != null ? (
            <div className='flex justify-end border-t p-1'>
              <Button
                variant='ghost'
                size='sm'
                className='text-muted-foreground h-(--control-h-xs) px-2 text-xs'
                disabled={n === 0}
                onClick={() => cambia([])}
              >
                {azzera === true ? 'Azzera' : azzera}
              </Button>
            </div>
          ) : undefined
        }
      />
      {chip && n > 0 ? (
        <div className='flex flex-wrap gap-1.5'>
          {inOrdine.map(o => (
            <ChipInterruttore
              key={o.value}
              acceso
              onRimuovi={() => togli(o.value)}
              etichettaRimuovi={etichettaRimuovi(testoDi(o))}
              disabled={disabled}
            >
              {o.label}
            </ChipInterruttore>
          ))}
        </div>
      ) : null}
      {name ? value.map(v => <input key={v} type='hidden' name={name} value={v} />) : null}
    </div>
  )
}
