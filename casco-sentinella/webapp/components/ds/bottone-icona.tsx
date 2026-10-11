/** Icon-only button that always carries an accessible label and a tooltip. Part of the IAMAimpresa design system. */
'use client'

import type { ComponentProps, ReactNode } from 'react'

import { Button } from '@/components/ui/button'

export type TagliaIcona = 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg'

export type BottoneIconaProps = {
  etichetta: string

  icona: ReactNode

  spiegazione?: string
  size?: TagliaIcona
} & Omit<ComponentProps<typeof Button>, 'size' | 'children' | 'aria-label' | 'title' | 'asChild'>

export function BottoneIcona({
  etichetta,
  icona,
  spiegazione,
  size = 'icon-sm',
  variant = 'ghost',
  type = 'button',
  ...props
}: BottoneIconaProps) {
  return (
    <Button
      type={type}
      variant={variant}
      size={size}
      aria-label={etichetta}
      title={spiegazione ?? etichetta}
      {...props}
    >
      {icona}
    </Button>
  )
}
