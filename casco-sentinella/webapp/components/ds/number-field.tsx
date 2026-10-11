/** Numeric input with Italian decimal handling and unit. Part of the IAMAimpresa design system. */
'use client'

import { useId, useLayoutEffect, useRef, useState, type ComponentProps } from 'react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export function parseNumberIt(raw: string): number | null {
  const t = raw.trim().replace(/[\s€%]/g, '')
  if (!t) return null
  const hasComma = t.includes(',')
  const dots = (t.match(/\./g) ?? []).length
  let normalized: string
  if (hasComma) {
    normalized = t.replace(/\./g, '').replace(',', '.')
  } else if (dots === 1 && /\.\d{1,2}$/.test(t)) {
    normalized = t
  } else {
    normalized = t.replace(/\./g, '')
  }
  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}

export function parseNumberPunto(raw: string): number | null {
  const t = raw
    .trim()
    .replace(/[\s€%]/g, '')
    .replace(',', '.')
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

export function formatNumberPunto(value: number, decimals?: number): string {
  if (decimals != null) return value.toFixed(decimals)
  return String(Math.round(value * 100) / 100)
}

export function arrotondaDecimali(value: number, decimali: number): number {
  const d = Math.max(0, Math.trunc(decimali))
  const perEsponente = Number(`${Math.round(Number(`${value}e${d}`))}e-${d}`)
  if (Number.isFinite(perEsponente)) return perEsponente
  if (Math.abs(value) >= 1) return value
  const f = 10 ** d
  return Math.round(value * f) / f
}

export function formatNumberIt(value: number, decimals?: number): string {
  return new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: decimals ?? 0,
    maximumFractionDigits: decimals ?? (Number.isInteger(value) ? 0 : 2),
    useGrouping: 'always',
  }).format(value)
}

export function NumberField({
  value,
  onValueChange,
  unit,
  decimals,
  arrotonda,
  decimale = 'virgola',
  placeholder = '—',
  className,
  invalidMessage = 'Il numero non si legge',
  onInvalid,
  onDigitato,
  ...rest
}: {
  value: number | null
  onValueChange: (value: number | null) => void

  onDigitato?: (value: number | null) => void

  unit?: string

  decimals?: number

  arrotonda?: number

  decimale?: 'virgola' | 'punto'
  placeholder?: string
  className?: string
  invalidMessage?: string

  onInvalid?: (message: string) => void
} & Omit<ComponentProps<typeof Input>, 'value' | 'onChange' | 'type' | 'onInvalid'>) {
  const id = useId()

  const [draft, setDraft] = useState<string | null>(null)

  const unitRef = useRef<HTMLSpanElement>(null)
  const [unitWidth, setUnitWidth] = useState<number | null>(null)
  useLayoutEffect(() => {
    setUnitWidth(unit ? (unitRef.current?.offsetWidth ?? null) : null)
  }, [unit])

  const punto = decimale === 'punto'
  const display =
    value == null ? '' : punto ? formatNumberPunto(value, decimals) : formatNumberIt(value, decimals)

  return (
    <div className='relative'>
      <Input
        {...rest}
        id={rest.id ?? id}
        inputMode='decimal'

        className={cn('text-end tabular-nums', unit && 'pe-7', className)}

        style={unitWidth != null ? { ...rest.style, paddingInlineEnd: unitWidth + 16 } : rest.style}
        placeholder={placeholder}
        value={draft ?? display}
        onFocus={e => {
          setDraft(value == null ? '' : punto ? String(value) : String(value).replace('.', ','))
          rest.onFocus?.(e)
        }}
        onChange={e => {
          const raw = e.target.value
          setDraft(raw)
          if (onDigitato != null) {
            const letto = raw.trim() === '' ? null : punto ? parseNumberPunto(raw) : parseNumberIt(raw)
            onDigitato(letto == null || arrotonda == null ? letto : arrotondaDecimali(letto, arrotonda))
          }
        }}
        onBlur={e => {
          const raw = e.target.value
          setDraft(null)
          rest.onBlur?.(e)
          if (raw.trim() === '') {
            if (value != null) onValueChange(null)
            return
          }
          const letto = punto ? parseNumberPunto(raw) : parseNumberIt(raw)
          if (letto == null) {
            onInvalid?.(invalidMessage)
            return
          }
          const parsed = arrotonda == null ? letto : arrotondaDecimali(letto, arrotonda)
          if (parsed !== value) onValueChange(parsed)
        }}
      />
      {unit && (
        <span
          ref={unitRef}
          aria-hidden
          className='text-muted-foreground pointer-events-none absolute inset-y-0 end-2.5 flex items-center text-xs'
        >
          {unit}
        </span>
      )}
    </div>
  )
}
