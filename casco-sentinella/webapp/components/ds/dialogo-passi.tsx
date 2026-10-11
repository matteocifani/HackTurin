/** Dialog in steps, built on DialogoAzione and Passi. Part of the IAMAimpresa design system. */
'use client'

import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

import { DialogoAzione, type DialogoAzioneProps, type NaturaDialogo } from '@/components/ds/dialogo-azione'
import { Passi, PiedePassi, type VocePasso } from '@/components/ds/passi'
import { Button } from '@/components/ui/button'

const PREMIBILI =
  ':is(input:not([type=hidden]), textarea, select, button, a[href], [tabindex]):not([disabled]):not([tabindex="-1"])'

function fuocoAlLavoro(e: Event) {
  const radice = e.target instanceof HTMLElement ? e.target : null
  const testata = radice?.querySelector('[data-slot=dialog-header]') ?? null
  const primaDellaTestata = (x: HTMLElement) =>
    testata != null && (testata.compareDocumentPosition(x) & Node.DOCUMENT_POSITION_PRECEDING) !== 0
  const primo = radice
    ? Array.from(radice.querySelectorAll<HTMLElement>(PREMIBILI)).find(
        x =>
          x.closest('[data-slot=dialogo-sotto-testata]') == null &&
          x.closest('[data-slot=dialog-close]') == null &&
          !primaDellaTestata(x)
      )
    : undefined
  if (primo == null) return
  e.preventDefault()
  primo.focus()
}

export type AvantiPasso = {
  onClick: () => void
  disabled?: boolean

  title?: string
}

export type IndietroPasso = { onClick: () => void }

export type FinalePassi = {
  etichetta: string
  onClick: () => void

  attesa?: boolean
  disabled?: boolean

  icona?: LucideIcon

  title?: string
}

export type DialogoPassiProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  titolo: ReactNode

  passi: readonly VocePasso[]

  corrente: number

  onVai?: (n: number) => void

  avanti?: AvantiPasso

  indietro?: IndietroPasso

  finale?: FinalePassi

  secondario?: ReactNode

  motivoSpento?: ReactNode

  natura?: NaturaDialogo

  scorre?: boolean

  comandi?: DialogoAzioneProps['comandi']
  children?: ReactNode

  className?: string
}

export function DialogoPassi({
  open,
  onOpenChange,
  titolo,
  passi,
  corrente,
  onVai,
  avanti,
  indietro,
  finale,
  secondario,
  motivoSpento,
  natura = 'documento',
  scorre = true,
  comandi,
  children,
  className,
}: DialogoPassiProps) {
  const inAttesa = finale?.attesa === true
  const ultimo = corrente >= passi.length
  const conFinale = ultimo && finale != null
  const Icona = finale?.icona

  const verbo = conFinale ? (
    <Button
      onClick={finale.onClick}
      disabled={finale.disabled}
      attesa={finale.attesa}
      title={finale.title}
      data-piede-finale=''
    >
      {Icona != null && <Icona />}
      {finale.etichetta}
    </Button>
  ) : undefined

  return (
    <DialogoAzione
      open={open}
      onOpenChange={next => {
        if (!next && inAttesa) return
        onOpenChange(next)
      }}
      titolo={titolo}
      natura={natura}
      scorre={scorre}
      comandi={comandi}
      annulla={false}
      className={className}
      onOpenAutoFocus={fuocoAlLavoro}
      aria-describedby={undefined}
      data-dialogo-passi=''
      data-passo-corrente={corrente}

      sottoTestata={
        <Passi
          passi={passi}
          corrente={corrente}
          onVai={inAttesa ? undefined : onVai}
          className='max-sm:justify-center'
        />
      }

      altre={
        <div className='flex w-full flex-col gap-2'>
          <PiedePassi
            indietro={
              corrente > 1 && indietro != null
                ? { onClick: indietro.onClick, disabled: inAttesa, verso: passi[corrente - 2]?.etichetta }
                : null
            }
            avanti={
              !conFinale && avanti != null
                ? {
                    onClick: avanti.onClick,
                    disabled: avanti.disabled,
                    verso: passi[corrente]?.etichetta,
                    title: avanti.title,
                  }
                : null
            }
            finale={verbo}
            secondario={secondario}
            motivo={motivoSpento}
          />
        </div>
      }
    >
      {children}
    </DialogoAzione>
  )
}
