/** Measures the free height under a toolbar so a board or calendar fills the viewport without page scroll. Part of the IAMAimpresa design system. */
import { useLayoutEffect, type CSSProperties, type RefObject } from 'react'

export function useQuotaVista(
  guscio: RefObject<HTMLElement | null>,
  { attivo = true, telefono = 'ferma' }: { attivo?: boolean; telefono?: 'ferma' | 'scorre' } = {}
): void {
  useLayoutEffect(() => {
    const el = guscio.current
    if (!attivo || el == null) return
    const largo = window.matchMedia('(min-width: 40rem)')

    const scrivi = (nome: string, valore: string) => {
      if (el.style.getPropertyValue(nome) !== valore) el.style.setProperty(nome, valore)
    }

    const uscite: string[] = []
    let fermaFino = 0
    const misura = () => {
      if (performance.now() < fermaFino) return
      const doc = document.documentElement

      scrivi('--vista-assorbi', '0px')
      const r = el.getBoundingClientRect()
      const cime = [...el.querySelectorAll<HTMLElement>('[data-vista-cima]')].map(
        c => c.getBoundingClientRect().top
      )

      const top = Math.ceil((cime.length > 0 ? Math.min(...cime) : r.top) + window.scrollY)

      const coda = Math.max(0, Math.round(document.body.getBoundingClientRect().bottom - r.bottom))
      scrivi('--vista-top', `${top}px`)
      const vuota = codaVuota(el)
      let assorbi = 0
      if (largo.matches) {
        const stile = getComputedStyle(el)
        const pavimento = inPx(stile.getPropertyValue('--vista-pavimento'), 16)
        const margine = inPx(stile.getPropertyValue('--shell-margine'), 0.5)
        const vince = window.innerHeight - top - margine < pavimento
        assorbi = vuota && !vince ? coda : 0
        scrivi('--vista-coda', `${coda - assorbi}px`)
        scrivi('--vista-assorbi', `${assorbi}px`)
      } else if (telefono === 'scorre') {
        const banda = Math.max(0, Math.round(window.innerHeight - cimaDellaBarra(el)))
        assorbi = vuota ? Math.max(0, coda - banda) : 0
        scrivi('--vista-coda', `${banda}px`)
        scrivi('--vista-assorbi', `${assorbi}px`)
      } else {
        scrivi('--vista-coda', `${Math.max(0, Math.round(window.innerHeight - cimaDellaBarra(el)))}px`)
        const oltre = Math.round(r.bottom + window.scrollY + coda - window.innerHeight)
        assorbi = vuota ? Math.min(coda, Math.max(0, oltre)) : 0
        scrivi('--vista-assorbi', `${assorbi}px`)

        if (assorbi > 0 && doc.scrollHeight > window.innerHeight + 1) {
          assorbi = 0
          scrivi('--vista-assorbi', '0px')
        }
      }

      const uscita = `${top}|${el.style.getPropertyValue('--vista-coda')}|${assorbi}`
      uscite.push(uscita)
      if (uscite.length > 6) uscite.shift()
      const alterna =
        uscite.length === 6 &&
        uscite[0] !== uscite[1] &&
        uscite[0] === uscite[2] &&
        uscite[2] === uscite[4] &&
        uscite[1] === uscite[3] &&
        uscite[3] === uscite[5]
      if (alterna) {
        fermaFino = performance.now() + 2000
        uscite.length = 0
      }
    }

    const rimisura = () => {
      fermaFino = 0
      uscite.length = 0
      misura()
    }
    misura()
    const osserva = new ResizeObserver(misura)
    osserva.observe(document.body)
    osserva.observe(el)
    largo.addEventListener('change', rimisura)
    window.addEventListener('resize', rimisura)
    return () => {
      osserva.disconnect()
      largo.removeEventListener('change', rimisura)
      window.removeEventListener('resize', rimisura)
    }
  }, [guscio, attivo, telefono])
}

export const ALTEZZA_VISTA =
  'sm:h-[max(var(--vista-pavimento,16rem),calc(100dvh-var(--vista-top)-max(var(--vista-coda),var(--shell-margine,0.5rem))))]'

export const GRONDA_VISTA =
  'sm:pb-[max(0.5rem,calc(var(--flottanti-riserva,0px)-var(--shell-margine,0.5rem)))]'

export const QUOTA_INIZIALE_VISTA = {
  '--vista-top': '24rem',
  '--vista-coda': '0px',
  '--vista-assorbi': '0px',
} as CSSProperties

function inPx(valore: string, ripiegoRem: number): number {
  const radice = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  const v = valore.trim()
  const n = Number.parseFloat(v)
  if (Number.isNaN(n)) return ripiegoRem * radice
  if (v.endsWith('rem')) return n * radice
  if (v.endsWith('px')) return n
  return ripiegoRem * radice
}

function codaVuota(vista: HTMLElement): boolean {
  for (let el: HTMLElement | null = vista; el != null && el !== document.body; el = el.parentElement) {
    for (let s = el.nextElementSibling; s != null; s = s.nextElementSibling) {
      if (!(s instanceof HTMLElement)) continue
      const cs = getComputedStyle(s)

      if (cs.display === 'none' || cs.position === 'fixed' || cs.position === 'absolute') continue
      if (
        s.textContent.trim() !== '' ||
        s.querySelector('img, svg, video, canvas, input, button, select, textarea, iframe') != null
      )
        return false
    }
  }
  return true
}

export function cimaDellaBarra(el: HTMLElement): number {
  let cima = window.innerHeight
  for (let n: HTMLElement | null = el; n != null && n !== document.body; n = n.parentElement) {
    for (let s = n.nextElementSibling; s != null; s = s.nextElementSibling) {
      if (!(s instanceof HTMLElement) || getComputedStyle(s).position !== 'fixed') continue
      const r = s.getBoundingClientRect()
      if (r.height > 0 && r.width >= window.innerWidth / 2 && r.top >= window.innerHeight / 2)
        cima = Math.min(cima, r.top)
    }
  }
  return cima
}

export const GRONDA_LAVORO =
  'sm:pb-[max(0px,calc(var(--flottanti-riserva,0px)-1.5rem-var(--shell-margine,0.5rem)))]'
