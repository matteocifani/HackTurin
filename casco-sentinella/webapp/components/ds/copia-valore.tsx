/** Copy-to-clipboard button with feedback. Part of the IAMAimpresa design system. */
'use client'

import { useEffect, useRef, useState, type MouseEvent } from 'react'

import { CheckIcon, CopyIcon } from 'lucide-react'
import { toast } from 'sonner'

import { BottoneIcona } from '@/components/ds/bottone-icona'
import { cn } from '@/lib/utils'

const SPUNTA_MS = 1500

function copiaConSelezione(testo: string): boolean {
  const campo = document.createElement('textarea')
  campo.value = testo
  campo.setAttribute('readonly', '')
  campo.style.position = 'fixed'
  campo.style.opacity = '0'
  document.body.appendChild(campo)
  campo.select()
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  campo.remove()
  return ok
}

export async function copiaNegliAppunti(testo: string, html?: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard != null && window.isSecureContext) {
    try {
      if (
        html != null &&
        typeof ClipboardItem !== 'undefined' &&
        typeof navigator.clipboard.write === 'function'
      ) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([testo], { type: 'text/plain' }),
          }),
        ])
        return true
      }
      await navigator.clipboard.writeText(testo)
      return true
    } catch {
      try {
        await navigator.clipboard.writeText(testo)
        return true
      } catch {}
    }
  }
  return copiaConSelezione(testo)
}

export function CopiaValore({
  testo,
  etichetta,
  className,
  variant = 'ghost',
  size = 'icon-xs',
}: {
  testo: string
  etichetta: string
  className?: string

  variant?: 'ghost' | 'outline'
  size?: 'icon-xs' | 'icon-sm'
}) {
  const [fatto, setFatto] = useState(false)
  const timer = useRef<number | null>(null)
  useEffect(
    () => () => {
      if (timer.current != null) window.clearTimeout(timer.current)
    },
    []
  )

  const copia = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    e.preventDefault()
    void copiaNegliAppunti(testo).then(ok => {
      if (!ok) {
        toast.error('Non si riesce a copiare da qui')
        return
      }
      toast.success('Copiato')
      setFatto(true)
      if (timer.current != null) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setFatto(false), SPUNTA_MS)
    })
  }

  const nome = `Copia ${etichetta}`
  return (
    <BottoneIcona
      etichetta={nome}
      spiegazione={nome}
      variant={variant}
      size={size}
      className={cn('text-muted-foreground shrink-0', className)}
      onClick={copia}
      data-copia=''
      icona={fatto ? <CheckIcon className='text-success' aria-hidden /> : <CopyIcon aria-hidden />}
    />
  )
}
