/** shadcn/ui BottomSheet primitive on the IAMAimpresa tokens. Part of the IAMAimpresa design system. */
'use client'

import * as React from 'react'
import { XIcon } from 'lucide-react'
import * as ReactDOM from 'react-dom'

import { cn } from '@/lib/utils'

export const SHEET_MARK = 'data-bottom-sheet'

export const SHEET_ESCAPE = [
  '[[data-radix-popper-content-wrapper]:has(>&)]:!fixed',
  '[[data-radix-popper-content-wrapper]:has(>&)]:!inset-x-0',
  '[[data-radix-popper-content-wrapper]:has(>&)]:!bottom-0',
  '[[data-radix-popper-content-wrapper]:has(>&)]:!top-auto',
  '[[data-radix-popper-content-wrapper]:has(>&)]:!m-0',
  '[[data-radix-popper-content-wrapper]:has(>&)]:!min-w-0',
  '[[data-radix-popper-content-wrapper]:has(>&)]:!max-w-none',
  '[[data-radix-popper-content-wrapper]:has(>&)]:!transform-none',
  '[[data-radix-popper-content-wrapper]:has(>&)]:!z-(--z-modal)',
].join(' ')

export const SHEET_SURFACE = cn(
  'w-auto max-w-none min-w-0 rounded-t-xl rounded-b-none border-x-0 border-b-0 shadow-xl',

  'relative !max-h-[72svh] flex flex-col overflow-hidden',

  'data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100',
  'data-[state=open]:slide-in-from-bottom-8 data-[state=closed]:slide-out-to-bottom-8'
)

export const SHEET_ITEM = [
  '[[data-bottom-sheet]_&]:min-h-11',
  '[[data-bottom-sheet]_&]:rounded-lg',
  '[[data-bottom-sheet]_&]:px-3',
  '[[data-bottom-sheet]_&]:py-2.5',
  '[[data-bottom-sheet]_&]:text-base',
].join(' ')

export const SHEET_LABEL = [
  '[[data-bottom-sheet]_&]:px-3',
  '[[data-bottom-sheet]_&]:pt-3',
  '[[data-bottom-sheet]_&]:pb-1.5',
].join(' ')

export const SHEET_SAFE_BOTTOM = 'pb-[max(0.5rem,env(safe-area-inset-bottom))]'

export function SheetTapGuard() {
  const [attivo, setAttivo] = React.useState(true)
  React.useEffect(() => {
    const t = setTimeout(() => setAttivo(false), 300)
    return () => clearTimeout(t)
  }, [])
  if (!attivo) return null

  return <div aria-hidden data-slot='bottom-sheet-tap-guard' className='absolute inset-0 z-(--z-raised)' />
}

const SOGLIA_TOCCO = 10

export function useAperturaDopoIlGesto(
  onPointerDown?: React.PointerEventHandler<HTMLElement>
): React.PointerEventHandler<HTMLElement> {
  return React.useCallback(
    event => {
      onPointerDown?.(event)
      if (event.defaultPrevented || event.pointerType !== 'touch') return

      event.preventDefault()

      const trigger = event.currentTarget
      const x0 = event.clientX
      const y0 = event.clientY
      let scorso = false

      const alMovimento = (e: PointerEvent) => {
        if (Math.hypot(e.clientX - x0, e.clientY - y0) > SOGLIA_TOCCO) scorso = true
      }
      const allaFine = () => {
        window.removeEventListener('pointermove', alMovimento)
        window.removeEventListener('pointerup', allaFine)
        window.removeEventListener('pointercancel', allaFine)
        if (scorso) return
        trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      }

      window.addEventListener('pointermove', alMovimento)
      window.addEventListener('pointerup', allaFine)
      window.addEventListener('pointercancel', allaFine)
    },
    [onPointerDown]
  )
}

export function SheetScrim({ className, ...props }: React.ComponentProps<'div'>) {
  const ancora = React.useRef<HTMLSpanElement>(null)
  const [nelDocumento, setNelDocumento] = React.useState(false)

  React.useEffect(() => {
    setNelDocumento(ancora.current?.isConnected === true)
  }, [])

  return (
    <>
      <span ref={ancora} aria-hidden className='hidden' />
      {nelDocumento &&
        ReactDOM.createPortal(
          <div
            aria-hidden
            data-slot='bottom-sheet-scrim'
            className={cn(
              'pointer-events-none fixed inset-0 z-(--z-overlay) bg-scrim',
              'animate-in fade-in-0',
              className
            )}
            {...props}
          />,
          document.body
        )}
    </>
  )
}

export function SheetGrabber({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='bottom-sheet-grabber'
      className={cn('relative z-20 flex shrink-0 justify-center pt-2 pb-1', className)}
      {...props}
    >
      <div aria-hidden className='bg-border h-1 w-9 rounded-full' />

      <button
        type='button'
        aria-label='Chiudi'
        onClick={e =>
          e.currentTarget.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
        }
        className='text-muted-foreground hover:text-foreground absolute end-1 top-0 z-20 flex size-10 items-center justify-center rounded-md'
      >
        <XIcon className='size-4' />
      </button>
    </div>
  )
}
