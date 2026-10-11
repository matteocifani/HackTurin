/** Step indicator and step footer used by multi-step flows. Part of the IAMAimpresa design system. */
import type { MouseEvent, ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon } from 'lucide-react'

import { STATUS_SURFACE } from '@/components/ds/status-badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type VocePasso = { chiave: string; etichetta: string }

const TAPPA = 'flex min-w-0 items-center gap-2 text-sm'

export function Passi({
  passi,
  corrente,
  className,
  etichetta = 'Passi',
  onVai,
  liberi = false,
}: {
  passi: readonly VocePasso[]

  corrente: number
  className?: string

  etichetta?: string

  onVai?: (n: number) => void

  liberi?: boolean
}) {
  return (
    <ol
      className={cn('flex min-w-0 items-center gap-3 max-sm:gap-2', className)}
      aria-label={etichetta}
      data-passi=''
    >
      {passi.map((p, i) => {
        const n = i + 1
        const stato = corrente > n ? 'fatto' : corrente === n ? 'corrente' : 'atteso'
        const premibile = onVai != null && (stato === 'fatto' || (liberi && stato === 'atteso'))
        const dentro = (
          <>
            <span
              className={cn(
                'flex size-5 shrink-0 items-center justify-center rounded-full text-xs tabular-nums',

                STATUS_SURFACE[stato === 'corrente' ? 'warning' : stato === 'fatto' ? 'success' : 'muted']
              )}
            >
              {stato === 'fatto' ? <CheckIcon className='size-3' aria-hidden /> : n}
            </span>
            <span className={cn('truncate', stato !== 'corrente' && 'max-sm:hidden')}>{p.etichetta}</span>
          </>
        )
        return (
          <li
            key={p.chiave}
            className='flex min-w-0 items-center gap-3 max-sm:gap-2'
            data-passo={p.chiave}
            data-passo-stato={stato}
          >
            {i > 0 && <span className='bg-border h-px w-8 shrink-0 max-sm:w-4' aria-hidden />}
            {premibile ? (
              <button
                type='button'
                onClick={() => onVai(n)}
                title={`${stato === 'fatto' ? 'Torna a' : 'Vai a'} ${p.etichetta}`}
                data-vai-passo={p.chiave}
                className={cn(
                  TAPPA,
                  'text-muted-foreground hover:text-foreground focus-visible:ring-ring -mx-1 rounded-md px-1 py-0.5 transition-colors outline-none focus-visible:ring-2'
                )}
              >
                {dentro}
              </button>
            ) : (
              <span
                className={cn(TAPPA, stato === 'corrente' ? 'font-medium' : 'text-muted-foreground')}
                aria-current={stato === 'corrente' ? 'step' : undefined}
              >
                {dentro}
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

export type CapoPiede = {
  onClick?: (e: MouseEvent<HTMLElement>) => void
  href?: string
  disabled?: boolean

  verso?: string

  title?: string

  attributi?: Record<`data-${string}`, string>
}

function BottoneCapo({
  capo,
  lato,
  pieno,
}: {
  capo: CapoPiede
  lato: 'indietro' | 'avanti'
  pieno: boolean
}) {
  const parola = lato === 'indietro' ? 'Indietro' : 'Avanti'
  const dentro =
    lato === 'indietro' ? (
      <>
        <ArrowLeftIcon />
        {parola}
      </>
    ) : (
      <>
        {parola}
        <ArrowRightIcon />
      </>
    )
  const nomi = {
    ...(capo.verso != null
      ? {
          title: `${lato === 'indietro' ? 'Torna a' : 'Vai a'} «${capo.verso}»`,
          'aria-label': `${parola}: ${capo.verso}`,
        }
      : {}),
    ...(capo.title != null ? { title: capo.title } : {}),
  }
  const variant = pieno ? 'default' : 'outline'
  const marca = { [`data-piede-${lato}`]: '', ...capo.attributi }
  if (capo.href == null || capo.disabled) {
    return (
      <Button variant={variant} onClick={capo.onClick} disabled={capo.disabled} {...nomi} {...marca}>
        {dentro}
      </Button>
    )
  }
  return (
    <Button asChild variant={variant}>
      {capo.onClick != null ? (
        <a href={capo.href} onClick={capo.onClick} {...nomi} {...marca}>
          {dentro}
        </a>
      ) : (
        <Link href={capo.href} {...nomi} {...marca}>
          {dentro}
        </Link>
      )}
    </Button>
  )
}

export function PiedePassi({
  indietro,
  avanti,
  peso = 'primaria',
  finale,
  secondario,
  motivo,
  className,
}: {
  indietro?: CapoPiede | null
  avanti?: CapoPiede | null
  peso?: 'primaria' | 'contorno'
  finale?: ReactNode
  secondario?: ReactNode
  motivo?: ReactNode
  className?: string
}) {
  if (indietro == null && avanti == null && finale == null && secondario == null) return null
  return (
    <>
      <div
        className={cn('flex gap-2', indietro != null ? 'justify-between' : 'justify-end', className)}
        data-piede-passi=''
      >
        {indietro != null && <BottoneCapo capo={indietro} lato='indietro' pieno={false} />}
        <div className='flex gap-2'>
          {secondario}
          {finale ??
            (avanti != null && <BottoneCapo capo={avanti} lato='avanti' pieno={peso === 'primaria'} />)}
        </div>
      </div>
      {motivo ? <p className='text-foreground-secondary text-right text-sm'>{motivo}</p> : null}
    </>
  )
}
