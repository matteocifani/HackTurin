/** Windowing of long lists: a sentinel and a hook that reveal rows in batches. Part of the IAMAimpresa design system. */
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export const FINESTRA = 100

const ANTICIPO = '0px 0px 400px 0px'

function trovaScroller(nodo: HTMLElement): HTMLElement | null {
  for (let el = nodo.parentElement; el != null; el = el.parentElement) {
    const overflow = getComputedStyle(el).overflowY
    if ((overflow === 'auto' || overflow === 'scroll') && el.scrollHeight > el.clientHeight) return el
  }
  return null
}

function tornaInCima(nodo: HTMLElement): void {
  const testa = nodo.previousElementSibling
  if (testa == null) return
  const scroller = trovaScroller(nodo)
  const bordo = scroller == null ? 0 : scroller.getBoundingClientRect().top
  if (testa.getBoundingClientRect().top >= bordo) return
  ;(scroller ?? window).scrollTo({ top: 0 })
}

export function Sentinella({
  attiva,
  rese,
  chiave,
  onAncora,
}: {
  attiva: boolean
  rese: number
  chiave: string
  onAncora: () => void
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const ancoraRef = useRef(onAncora)
  ancoraRef.current = onAncora
  useEffect(() => {
    const nodo = ref.current
    if (!attiva || nodo == null) return
    const oss = new IntersectionObserver(
      voci => {
        if (voci.some(v => v.isIntersecting)) ancoraRef.current()
      },
      { root: trovaScroller(nodo), rootMargin: ANTICIPO }
    )
    oss.observe(nodo)
    return () => oss.disconnect()
  }, [attiva, rese])
  const chiaveVista = useRef(chiave)
  useEffect(() => {
    if (chiaveVista.current === chiave) return
    chiaveVista.current = chiave
    if (ref.current != null) tornaInCima(ref.current)
  }, [chiave])
  return <div ref={ref} aria-hidden className='mb-0 h-px' />
}

export function useFinestra<T>(
  righe: readonly T[],
  chiave: string,
  passo: number = FINESTRA
): { rese: readonly T[]; altre: boolean; allarga: () => void } {
  const [stato, setStato] = useState({ chiave, n: passo })
  const n = stato.chiave === chiave ? stato.n : passo
  const allarga = useCallback(
    () => setStato(x => ({ chiave, n: (x.chiave === chiave ? x.n : passo) + passo })),
    [chiave, passo]
  )
  return { rese: n >= righe.length ? righe : righe.slice(0, n), altre: n < righe.length, allarga }
}
