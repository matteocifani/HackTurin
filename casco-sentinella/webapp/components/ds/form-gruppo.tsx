/** Named group of fields inside a dialog or a page. Part of the IAMAimpresa design system. */
'use client'

import type { ReactNode } from 'react'

import { EYEBROW, SectionCard } from '@/components/ds/section-card'

export type FormCornice = 'dialog' | 'pagina'

export function FormGruppo({
  cornice,
  title,
  children,
}: {
  cornice: FormCornice
  title: string
  children: ReactNode
}) {
  if (cornice === 'pagina') return <SectionCard title={title}>{children}</SectionCard>
  return (
    <div className='space-y-(--space-block)'>
      <p className={EYEBROW}>{title}</p>
      {children}
    </div>
  )
}
