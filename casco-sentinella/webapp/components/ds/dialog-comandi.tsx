/** The "open as page" command shown in the header of a dialog. Part of the IAMAimpresa design system. */
'use client'

import { Maximize2Icon, XIcon } from 'lucide-react'

import { DialogClose } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const BOX =
  'ring-offset-background focus:ring-ring flex size-(--control-h-sm) items-center justify-center rounded-md opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden'

export function ComandiDialog({ onExpand }: { onExpand: () => void }) {
  return (
    <div className='absolute top-6 end-6 flex items-center gap-1'>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type='button' aria-label='Apri come pagina' onClick={onExpand} className={BOX}>
            <Maximize2Icon className='size-4' />
          </button>
        </TooltipTrigger>
        <TooltipContent>Apri come pagina</TooltipContent>
      </Tooltip>
      <DialogClose className={BOX}>
        <XIcon className='size-4' />
        <span className='sr-only'>Chiudi</span>
      </DialogClose>
    </div>
  )
}
