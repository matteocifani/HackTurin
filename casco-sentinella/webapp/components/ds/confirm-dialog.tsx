/** Confirmation dialog for gestures with impact, with an optional reason field. Part of the IAMAimpresa design system. */
'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { fraseDelRigetto } from '@/lib/esegui-con-esito'
import { cn } from '@/lib/utils'

type ConfirmDialogProps = {
  open: boolean

  title: string

  description: ReactNode

  confirmLabel: string

  onConfirm: (motivo: string) => void | Promise<unknown>
  onClose: () => void

  tone?: 'destructive' | 'default'

  cancelLabel?: string

  confirmDisabled?: boolean

  motivo?: {
    label: string
    placeholder?: string

    aiuto?: ReactNode

    righe?: number

    minimo?: number

    errore?: string
  }

  alternativa?: {
    label: string

    tone?: 'default' | 'destructive'
    onAlternativa: () => Promise<unknown>
  }
}

type InCorso = 'verbo' | 'alternativa' | null

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
  tone = 'destructive',
  cancelLabel = 'Annulla',
  confirmDisabled = false,
  motivo,
  alternativa,
}: ConfirmDialogProps) {
  const [inCorso, setInCorso] = useState<InCorso>(null)
  const pending = inCorso != null
  const [testo, setTesto] = useState('')
  const [mostraErrore, setMostraErrore] = useState(false)
  const campo = useRef<HTMLTextAreaElement>(null)
  const annulla = useRef<HTMLButtonElement>(null)
  const idCampo = useId()
  const minimo = motivo?.minimo ?? 1
  const manca = motivo != null && testo.trim().length < minimo

  useEffect(() => {
    if (open) {
      setTesto('')
      setMostraErrore(false)
    }
  }, [open])

  const esegui = (chi: Exclude<InCorso, null>, azione: () => void | Promise<unknown>) => {
    setInCorso(chi)
    void Promise.resolve()
      .then(azione)
      .then(
        () => {
          setInCorso(null)
          onClose()
        },
        (e: unknown) => {
          const { titolo, dettaglio } = fraseDelRigetto(e)
          toast.error(titolo, dettaglio != null ? { description: dettaglio } : undefined)
          setInCorso(null)
        }
      )
  }

  const confirm = () => {
    if (manca) {
      setMostraErrore(true)
      campo.current?.focus()
      return
    }
    esegui('verbo', () => onConfirm(testo.trim()))
  }

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (!next && !pending) onClose()
      }}
    >
      <DialogContent
        className='sm:max-w-md'

        onOpenAutoFocus={
          alternativa != null
            ? e => {
                e.preventDefault()
                const bersaglio = campo.current ?? annulla.current
                bersaglio?.focus()
              }
            : undefined
        }
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {motivo != null && (
          <div className='space-y-(--space-field)'>
            <Label htmlFor={idCampo}>{motivo.label}</Label>
            <Textarea
              ref={campo}
              id={idCampo}
              value={testo}
              onChange={e => {
                setTesto(e.target.value)
                if (mostraErrore) setMostraErrore(false)
              }}
              rows={motivo.righe ?? 4}
              placeholder={motivo.placeholder}
              disabled={pending}
              aria-invalid={mostraErrore && manca}
              aria-describedby={`${idCampo}-aiuto`}
            />
            <p
              id={`${idCampo}-aiuto`}
              className={mostraErrore && manca ? 'text-destructive text-xs' : 'text-muted-foreground text-xs'}
            >
              {mostraErrore && manca
                ? (motivo.errore ?? 'Scrivi il motivo: è l’unica traccia che resta di questa decisione.')
                : (motivo.aiuto ?? (minimo > 0 ? 'Obbligatorio.' : 'Facoltativo.'))}
            </p>
          </div>
        )}
        <DialogFooter>
          {alternativa != null && (
            <Button
              variant='outline'
              className={cn(
                'sm:me-auto',
                alternativa.tone === 'destructive' && 'text-destructive hover:text-destructive'
              )}
              disabled={confirmDisabled || inCorso === 'verbo'}
              attesa={inCorso === 'alternativa'}
              onClick={() => esegui('alternativa', alternativa.onAlternativa)}
              data-alternativa=''
            >
              {alternativa.label}
            </Button>
          )}
          <Button ref={annulla} variant='outline' onClick={onClose} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'destructive' ? 'destructive' : 'default'}
            disabled={confirmDisabled || inCorso === 'alternativa'}
            attesa={inCorso === 'verbo'}
            onClick={confirm}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
