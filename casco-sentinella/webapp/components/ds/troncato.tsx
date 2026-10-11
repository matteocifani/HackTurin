/** Truncated text that reveals itself on hover. Part of the IAMAimpresa design system. */
'use client'

import { createElement, useLayoutEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

export function Troncato({
  testo,
  spiegazione,
  come: Tag = 'span',
  className,
  children,
  ...props
}: {
  testo?: string

  spiegazione?: string
  come?: 'span' | 'p' | 'div'

  children?: ReactNode
} & Omit<ComponentProps<'span'>, 'title' | 'children'>) {
  const ref = useRef<HTMLElement | null>(null)
  const [tronca, setTronca] = useState(false)
  const [testoReso, setTestoReso] = useState<string | undefined>(undefined)
  useLayoutEffect(() => {
    const el = ref.current
    if (el == null) return

    const oltre = (e: HTMLElement) => e.scrollWidth > e.clientWidth + 1
    const misura = () => {
      const t = oltre(el) || Array.from(el.querySelectorAll<HTMLElement>('.truncate')).some(oltre)
      setTronca(t)

      if (t && testo == null) setTestoReso(el.textContent?.trim() || undefined)
    }
    misura()
    if (typeof ResizeObserver === 'undefined') return
    const oss = new ResizeObserver(misura)
    oss.observe(el)
    return () => oss.disconnect()
  }, [testo, children])

  return createElement(
    Tag,
    {
      ref,
      className: cn('truncate', className),
      title: spiegazione ?? (tronca ? (testo ?? testoReso) : undefined),
      ...props,
    },
    children ?? testo
  )
}
