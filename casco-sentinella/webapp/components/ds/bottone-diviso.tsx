/** Primary button with a menu of alternative actions. Part of the IAMAimpresa design system. */
'use client'

import { useRef, useState, type ReactElement, type ReactNode } from 'react'

import { ChevronDownIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ButtonGroup, ButtonGroupSeparator } from '@/components/ui/button-group'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export type VoceBottoneDiviso = {
  chiave: string
  etichetta: ReactNode
  icona?: ReactNode
  onSelect: () => void
  disabled?: boolean

  title?: string
}

function ConBolla({
  spiegazione,
  children,
  ...controllo
}: {
  spiegazione?: ReactNode
  children: ReactElement
  open?: boolean
  onOpenChange?: (aperta: boolean) => void
}) {
  if (spiegazione == null) return children
  return (
    <Tooltip {...controllo}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{spiegazione}</TooltipContent>
    </Tooltip>
  )
}

export function BottoneDiviso({
  etichetta,
  onClick,
  icona,
  title,
  spiegazione,
  altre = [],
  variant = 'default',
  size = 'sm',
  disabled = false,
  ariaLabelAltre = 'Altre azioni principali',
  spiegazioneAltre,
  className,
}: {
  etichetta: ReactNode
  onClick: () => void
  icona?: ReactNode

  title?: string

  spiegazione?: ReactNode

  altre?: VoceBottoneDiviso[]
  variant?: 'default' | 'outline'
  size?: 'sm' | 'default'
  disabled?: boolean

  ariaLabelAltre?: string

  spiegazioneAltre?: ReactNode
  className?: string
}) {
  const [menuAperto, setMenuAperto] = useState(false)
  const [bollaAltre, setBollaAltre] = useState(false)

  const tace = useRef(false)
  const principale = (
    <ConBolla spiegazione={spiegazione}>
      <Button
        variant={variant}
        size={size}
        onClick={onClick}
        title={spiegazione != null ? undefined : title}
        disabled={disabled}
        data-principale=''
      >
        {icona}
        {etichetta}
      </Button>
    </ConBolla>
  )
  if (altre.length === 0) {
    return (
      <span className={cn('inline-flex', className)} data-bottone-diviso='solo'>
        {principale}
      </span>
    )
  }
  return (
    <ButtonGroup className={className} data-bottone-diviso=''>
      {principale}
      {variant === 'default' && <ButtonGroupSeparator />}
      <DropdownMenu
        open={menuAperto}
        onOpenChange={aperto => {
          setMenuAperto(aperto)
          if (aperto) setBollaAltre(false)
        }}
      >
        <ConBolla
          spiegazione={spiegazioneAltre}
          open={bollaAltre && !menuAperto}
          onOpenChange={aperta => setBollaAltre(aperta && !tace.current)}
        >
          <DropdownMenuTrigger asChild>
            <Button
              variant={variant}
              size={size === 'sm' ? 'icon-sm' : 'icon'}
              aria-label={ariaLabelAltre}
              title={spiegazioneAltre != null ? undefined : ariaLabelAltre}
              disabled={disabled}
              data-altre=''
            >
              <ChevronDownIcon />
            </Button>
          </DropdownMenuTrigger>
        </ConBolla>
        <DropdownMenuContent
          align='end'
          onCloseAutoFocus={() => {
            tace.current = true
            setTimeout(() => {
              tace.current = false
            })
          }}
        >
          {altre.map(v => (
            <DropdownMenuItem key={v.chiave} onSelect={v.onSelect} disabled={v.disabled} title={v.title}>
              {v.icona}
              {v.etichetta}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </ButtonGroup>
  )
}
