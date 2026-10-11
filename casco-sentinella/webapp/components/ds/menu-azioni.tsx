/** Kebab menu of contextual actions. Part of the IAMAimpresa design system. */
'use client'

import type { ComponentProps, ReactNode } from 'react'

import { EllipsisVerticalIcon } from 'lucide-react'

import { BottoneIcona, type BottoneIconaProps, type TagliaIcona } from '@/components/ds/bottone-icona'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

export type MenuAzioniProps = {
  etichetta: string

  children: ReactNode
  align?: ComponentProps<typeof DropdownMenuContent>['align']
  side?: ComponentProps<typeof DropdownMenuContent>['side']
  sideOffset?: number

  onCloseAutoFocus?: ComponentProps<typeof DropdownMenuContent>['onCloseAutoFocus']
  size?: TagliaIcona
  variant?: BottoneIconaProps['variant']

  icona?: ReactNode

  spiegazione?: string

  className?: string

  classeContenuto?: string
  disabled?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  modal?: boolean
} & Omit<
  BottoneIconaProps,
  'etichetta' | 'icona' | 'spiegazione' | 'size' | 'variant' | 'className' | 'disabled' | 'children'
>

export function MenuAzioni({
  etichetta,
  children,
  align = 'end',
  side,
  sideOffset,
  onCloseAutoFocus,
  size = 'icon-sm',
  variant = 'ghost',
  icona,
  spiegazione,
  className,
  classeContenuto,
  disabled,
  open,
  onOpenChange,
  modal,
  ...trigger
}: MenuAzioniProps) {
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange} modal={modal}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <BottoneIcona
          etichetta={etichetta}
          spiegazione={spiegazione}
          icona={icona ?? <EllipsisVerticalIcon />}
          size={size}
          variant={variant}
          className={className}
          disabled={disabled}
          {...trigger}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        side={side}
        sideOffset={sideOffset}
        onCloseAutoFocus={onCloseAutoFocus}
        className={classeContenuto}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
