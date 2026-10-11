/** Reference to a person or an entity: avatar or logo plus name, optionally a link. Part of the IAMAimpresa design system. */
'use client'

import type { ComponentType, MouseEvent } from 'react'

import Link from 'next/link'

import {
  CarFrontIcon,
  CornerDownRightIcon,
  FolderKanbanIcon,
  InboxIcon,
  LayersIcon,
  TargetIcon,
} from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

export type TipoRiferimento =
  'azienda' | 'persona' | 'opportunita' | 'programma' | 'lead' | 'utente' | 'veicolo' | 'progetto'

const MISURE: Record<'xs' | 'sm' | 'md', { avatar: string; testo: string; icona: string; iniziali: string }> =
  {
    xs: { avatar: 'size-4', testo: 'text-xs', icona: 'size-3', iniziali: 'text-3xs' },
    sm: { avatar: 'size-5', testo: 'text-sm', icona: 'size-3', iniziali: 'text-3xs' },
    md: { avatar: 'size-6', testo: 'text-sm', icona: 'size-3.5', iniziali: 'text-2xs' },
  }

const ICONE: Partial<Record<TipoRiferimento, ComponentType<{ className?: string }>>> = {
  opportunita: TargetIcon,
  programma: LayersIcon,
  lead: InboxIcon,
  veicolo: CarFrontIcon,
  progetto: FolderKanbanIcon,
}

function inizialiDa(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(parola => parola.charAt(0))
    .join('')
    .toUpperCase()
}

export function RiferimentoEntita({
  nome,
  tipo,
  href,
  immagine,
  iniziali,
  size = 'sm',
  secondario,
  muto = false,
  sedeDi,
  title,
  className,
  onClick,
}: {
  nome: string
  tipo: TipoRiferimento

  href?: string

  immagine?: string | null

  iniziali?: string

  size?: 'xs' | 'sm' | 'md'

  secondario?: string | null

  muto?: boolean

  sedeDi?: { nome: string; href?: string | null } | null
  title?: string
  className?: string
  onClick?: (e: MouseEvent) => void
}) {
  const misura = MISURE[size]

  const forma = 'rounded-md'
  const Icona = ICONE[tipo]
  const sigla = iniziali ?? inizialiDa(nome)
  const titolo = title ?? (muto ? 'Fuori rubrica' : undefined)

  const corpo = (
    <>
      <Avatar aria-hidden className={cn(misura.avatar, forma)}>
        {immagine != null && immagine !== '' && <AvatarImage src={immagine} alt='' className={forma} />}
        <AvatarFallback className={cn(forma, Icona == null && cn(misura.iniziali, 'font-medium'))}>
          {Icona != null ? <Icona className={misura.icona} /> : sigla}
        </AvatarFallback>
      </Avatar>
      <span className={cn('min-w-0 truncate', misura.testo)}>{nome}</span>
      {secondario != null && secondario !== '' && (
        <span className={cn('text-muted-foreground min-w-0 truncate', misura.testo)}>
          <span aria-hidden>{'· '}</span>
          {secondario}
        </span>
      )}
    </>
  )

  const glifo = (() => {
    if (sedeDi == null) return null
    const parola = `Sede di ${sedeDi.nome}`
    const icona = <CornerDownRightIcon className={misura.icona} aria-hidden />
    if (sedeDi.href != null && sedeDi.href !== '') {
      return (
        <Link
          href={sedeDi.href}
          title={parola}
          aria-label={parola}
          onClick={onClick}
          data-sede-di=''
          className='text-muted-foreground hover:text-foreground focus-visible:ring-ring flex shrink-0 rounded-sm outline-none focus-visible:ring-2'
        >
          {icona}
        </Link>
      )
    }
    return (
      <span title={parola} data-sede-di='' className='text-muted-foreground flex shrink-0'>
        {icona}
      </span>
    )
  })()

  const pelle = cn('inline-flex min-w-0 max-w-full items-center gap-1.5', glifo == null && className)

  const nucleo =
    href != null && href !== '' && !muto ? (
      <Link
        href={href}
        title={titolo}
        onClick={onClick}
        data-riferimento={tipo}
        className={cn(
          'focus-visible:ring-ring rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-2',
          pelle
        )}
      >
        {corpo}
      </Link>
    ) : (
      <span
        title={titolo}
        onClick={onClick}
        data-riferimento={tipo}
        data-muto={muto ? '' : undefined}
        className={pelle}
      >
        {corpo}
      </span>
    )

  if (glifo == null) return nucleo

  return (
    <span data-sede='' className={cn('inline-flex min-w-0 max-w-full items-center gap-1', className)}>
      {nucleo}
      {glifo}
    </span>
  )
}
