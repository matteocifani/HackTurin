/** Navigation helpers: row clicks that respect text selection and modifier keys, back navigation with history awareness. Part of the IAMAimpresa design system. */
import type { MouseEvent } from 'react'
import type { useRouter } from 'next/navigation'

type Router = ReturnType<typeof useRouter>

const CONTROLLI = [
  'a',
  'button',
  'input',
  'select',
  'textarea',
  'label',
  'summary',
  '[role="button"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="checkbox"]',
  '[role="switch"]',
  '[contenteditable="true"]',
  '[data-slot="popover-content"]',
  '[data-slot="dropdown-menu-content"]',
  '[data-slot="select-content"]',
  '[data-slot="dialog-content"]',
].join(', ')

export function selezioneInCorso(): boolean {
  const s = window.getSelection()
  return s != null && !s.isCollapsed && s.toString().trim() !== ''
}

export function eSuControllo(target: EventTarget | null, superficie: Element): boolean {
  if (!(target instanceof Element)) return false
  const hit = target.closest(CONTROLLI)
  return hit != null && hit !== superficie && superficie.contains(hit)
}

export function apriInNuovaScheda(href: string): void {
  window.open(href, '_blank', 'noopener')
}

export function clickNaviga(e: MouseEvent<HTMLElement>, href: string, router: Router): void {
  if (e.defaultPrevented || e.button !== 0) return
  if (eSuControllo(e.target, e.currentTarget)) return
  if (selezioneInCorso()) return
  e.preventDefault()
  if (e.metaKey || e.ctrlKey || e.shiftKey) {
    apriInNuovaScheda(href)
    return
  }
  router.push(href)
}

export function clickApre(e: MouseEvent<HTMLElement>, href: string, apri: () => void): void {
  if (e.defaultPrevented || e.button !== 0) return
  if (eSuControllo(e.target, e.currentTarget)) return
  if (selezioneInCorso()) return
  if (e.metaKey || e.ctrlKey || e.shiftKey) {
    e.preventDefault()
    apriInNuovaScheda(href)
    return
  }
  apri()
}

export function auxClickNaviga(e: MouseEvent<HTMLElement>, href: string): void {
  if (e.defaultPrevented || e.button !== 1) return
  if (eSuControllo(e.target, e.currentTarget)) return
  e.preventDefault()
  apriInNuovaScheda(href)
}

export function clickSeNonSelezione(e: MouseEvent<HTMLElement>): void {
  if (selezioneInCorso()) e.preventDefault()
}

type VoceNavigazione = { index: number; key: string; url: string | null }
type ApiNavigazione = {
  currentEntry: VoceNavigazione | null
  entries?: () => VoceNavigazione[]
  traverseTo?: (key: string) => { committed?: Promise<unknown>; finished?: Promise<unknown> } | undefined
}

function apiNavigazione(): ApiNavigazione | undefined {
  return (window as Window & { navigation?: ApiNavigazione }).navigation
}

export function puoTornareIndietro(): boolean {
  const nav = apiNavigazione()
  if (nav?.currentEntry != null) return nav.currentEntry.index > 0
  return window.history.length > 1
}

export function tornaIndietro(): boolean {
  const qui = window.location.pathname
  const nav = apiNavigazione()
  const corrente = nav?.currentEntry
  if (
    nav != null &&
    corrente != null &&
    typeof nav.entries === 'function' &&
    typeof nav.traverseTo === 'function'
  ) {
    const voci = nav.entries()
    for (let i = corrente.index - 1; i >= 0; i--) {
      const voce = voci[i]
      if (voce?.url == null) continue
      if (new URL(voce.url).pathname !== qui) {
        const esito = nav.traverseTo(voce.key)
        esito?.committed?.catch(() => undefined)
        esito?.finished?.catch(() => undefined)
        return true
      }
    }
    return false
  }
  if (!puoTornareIndietro()) return false
  const passi = passiDi(window.history.state)
  window.history.go(-(passi + 1))
  return true
}

function passiDi(stato: unknown): number {
  if (typeof stato !== 'object' || stato == null) return 0
  const n = (stato as { navSteps?: unknown }).navSteps
  return typeof n === 'number' && Number.isInteger(n) && n > 0 ? n : 0
}

export function statoDiPush(destinazione: string | URL): { navSteps: number } {
  const verso = new URL(destinazione, window.location.href)
  return { navSteps: verso.pathname === window.location.pathname ? passiDi(window.history.state) + 1 : 0 }
}
