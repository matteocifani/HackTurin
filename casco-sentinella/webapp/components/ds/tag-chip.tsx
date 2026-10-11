/** Tag chip with identity colour and optional remove action. Part of the IAMAimpresa design system. */
'use client'

import { CheckIcon, XIcon } from 'lucide-react'

import { CHART_TONES, chartToneIndex } from '@/lib/chart-tones'
import { cn } from '@/lib/utils'

export function TagChip({
  tag,
  onRemove,
  onConferma,
  className,
  dedotto = false,
  spiegazioneDedotto,
}: {
  tag: string
  onRemove?: () => void

  onConferma?: () => void
  className?: string
  dedotto?: boolean

  spiegazioneDedotto?: string
}) {
  return (
    <span
      title={dedotto ? (spiegazioneDedotto ?? `${tag} — argomento dedotto automaticamente`) : undefined}
      className={cn(
        'inline-flex max-w-full items-center gap-0.5 rounded-md px-2 py-0.5 text-xs font-medium',
        CHART_TONES[chartToneIndex(tag)],
        dedotto && 'border border-dashed border-current/40',
        className
      )}
    >
      <span className='truncate'>{tag}</span>
      {onConferma && (
        <button
          type='button'
          aria-label={`Conferma tag ${tag}`}
          onClick={onConferma}
          className='hover:text-success relative rounded-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:after:absolute max-md:after:-inset-3 max-md:after:content-[""]'
        >
          <CheckIcon className='size-3' />
        </button>
      )}
      {onRemove && (
        <button
          type='button'
          aria-label={`Rimuovi tag ${tag}`}
          onClick={onRemove}

          className='hover:text-destructive -me-0.5 relative rounded-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:after:absolute max-md:after:-inset-3 max-md:after:content-[""]'
        >
          <XIcon className='size-3' />
        </button>
      )}
    </span>
  )
}
