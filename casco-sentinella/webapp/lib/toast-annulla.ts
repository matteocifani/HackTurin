/** Toast with an «Annulla» action for reversible gestures. Part of the IAMAimpresa design system. */
'use client'

import { toast } from 'sonner'

import { fraseDelRigetto } from '@/lib/esegui-con-esito'

export type EsitoAnnulla = void | { ok: boolean; motivo?: string } | { error?: string }

export type ToastConAnnullaOpzioni = {
  messaggio: string

  annulla: () => Promise<EsitoAnnulla>

  durata?: number

  dettaglio?: string

  apri?: { etichetta: string; onClick: () => void }
}

function motivoDelNo(esito: EsitoAnnulla): string | null {
  if (esito == null || typeof esito !== 'object') return null
  if ('ok' in esito && esito.ok === false) return esito.motivo ?? 'Non è stato possibile annullare.'
  if ('error' in esito && typeof esito.error === 'string' && esito.error !== '') return esito.error
  return null
}

export function toastConAnnulla({
  messaggio,
  annulla,
  durata = 5000,
  dettaglio,
  apri,
}: ToastConAnnullaOpzioni): string | number {
  return toast(messaggio, {
    duration: durata,
    ...(dettaglio != null ? { description: dettaglio } : {}),
    ...(apri != null ? { cancel: { label: apri.etichetta, onClick: apri.onClick } } : {}),
    action: {
      label: 'Annulla',
      onClick: () => {
        annulla().then(
          esito => {
            const no = motivoDelNo(esito)
            if (no != null) toast.error(no)
            else toast.success('Annullato')
          },
          (e: unknown) => {
            const { titolo, dettaglio: tecnico } = fraseDelRigetto(e)
            toast.error(titolo, tecnico != null ? { description: tecnico } : undefined)
          }
        )
      },
    },
  })
}
