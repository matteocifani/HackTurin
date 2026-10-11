/** Staggered entrance delay for list items. Part of the IAMAimpresa design system. */
import type { CSSProperties } from 'react'

export function stagger(index: number, cap = 8): CSSProperties {
  return {
    animationDelay: `calc(${Math.min(index, cap)} * var(--stagger-step))`,
  }
}
