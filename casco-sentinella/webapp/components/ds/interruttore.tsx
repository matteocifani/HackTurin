/** Switch with label, optional description and info. Part of the IAMAimpresa design system. */
'use client'

import { useId, type ReactNode } from 'react'

import { InfoDot } from '@/components/ds/info-dot'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

export type InterruttoreProps = {
  etichetta: ReactNode
  acceso: boolean
  onAcceso: (acceso: boolean) => void

  descrizione?: ReactNode

  info?: string

  disabled?: boolean

  attesa?: boolean
  marcatore?: `data-${string}`

  nomeAccessibile?: string
  className?: string
}

export function Interruttore({
  etichetta,
  acceso,
  onAcceso,
  descrizione,
  info,
  disabled = false,
  attesa = false,
  marcatore,
  nomeAccessibile,
  className,
}: InterruttoreProps) {
  const id = useId()
  const idDescrizione = `${id}-descrizione`
  const nomeInfo =
    typeof etichetta === 'string' ? `Cosa cambia: ${etichetta}` : (nomeAccessibile ?? 'Cosa cambia')

  const testata = (
    <>
      <Label htmlFor={id} className='leading-snug font-normal'>
        {etichetta}
      </Label>
      {info != null && <InfoDot label={nomeInfo}>{info}</InfoDot>}
      {attesa && <Spinner className='text-muted-foreground size-3.5' aria-label='Salvataggio in corso' />}
    </>
  )

  return (
    <div
      className={cn('flex min-w-0 gap-2', descrizione != null ? 'items-start' : 'items-center', className)}
      aria-busy={attesa || undefined}
    >
      <Switch
        id={id}
        checked={acceso}

        onCheckedChange={prossimo => {
          if (!attesa) onAcceso(prossimo)
        }}
        disabled={disabled}
        aria-label={nomeAccessibile}
        aria-describedby={descrizione != null ? idDescrizione : undefined}

        className={descrizione != null ? 'mt-px' : undefined}
        {...(marcatore != null ? { [marcatore]: '' } : {})}
      />
      {descrizione != null ? (
        <div className={cn('min-w-0', disabled && 'opacity-50')}>
          <div className='flex min-w-0 items-center gap-1.5'>{testata}</div>
          <p id={idDescrizione} className='text-muted-foreground text-xs leading-snug'>
            {descrizione}
          </p>
        </div>
      ) : (
        testata
      )}
    </div>
  )
}
