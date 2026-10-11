/** Ring chart for a single percentage. Part of the IAMAimpresa design system. */
import type { ReactNode } from 'react'

import { CircularProgress } from '@/components/ui/circular-progress'
import { cn } from '@/lib/utils'

const DIAMETRO = 96

export function Anello({
  valore,
  testo,
  etichetta,
  diametro = DIAMETRO,
  className,
}: {
  valore: number

  testo?: ReactNode

  etichetta?: string
  diametro?: number
  className?: string
}) {
  const arrotondato = Math.round(valore)
  return (
    <div
      role='img'
      aria-label={etichetta ?? `${arrotondato}%`}
      className={cn('relative inline-flex shrink-0', className)}
    >
      <CircularProgress value={valore} size={diametro} />
      <span
        aria-hidden
        className='absolute inset-0 flex items-center justify-center text-base font-medium tabular-nums'
      >
        {testo ?? arrotondato}
      </span>
    </div>
  )
}
