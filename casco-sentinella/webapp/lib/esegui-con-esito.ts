/** Runs an action and routes its outcome: success callback, or a readable error toast. Part of the IAMAimpresa design system. */
'use client'

import { unstable_isUnrecognizedActionError } from 'next/navigation'
import { toast } from 'sonner'

type Opzioni = {
  silenzioso?: boolean

  infine?: () => void
}

export function fraseDelRigetto(e: unknown): { titolo: string; dettaglio: string | null } {
  if (unstable_isUnrecognizedActionError(e)) {
    return {
      titolo: 'C’è una versione nuova di IAMAimpresa: ricarica la pagina e ripeti il gesto.',
      dettaglio: null,
    }
  }
  const testo = e instanceof Error ? e.message.trim() : typeof e === 'string' ? e.trim() : ''
  return {
    titolo: 'Il gesto non è arrivato in fondo: ricarica la pagina e riprova.',
    dettaglio: testo === '' ? null : testo,
  }
}

export function eseguiConEsito<T>(
  azione: Promise<T> | (() => Promise<T>),
  esito: (r: T) => void | Promise<void>,
  opzioni: Opzioni = {}
): void {
  const promessa = typeof azione === 'function' ? new Promise<T>(risolvi => risolvi(azione())) : azione
  promessa
    .then(esito)
    .catch((e: unknown) => {
      if (opzioni.silenzioso === true) {
        console.warn('[gesto silenzioso non riuscito]', e)
        return
      }
      const { titolo, dettaglio } = fraseDelRigetto(e)
      toast.error(titolo, {
        ...(dettaglio != null ? { description: dettaglio } : {}),
        action: { label: 'Ricarica', onClick: () => window.location.reload() },
      })
    })
    .finally(() => opzioni.infine?.())
}
