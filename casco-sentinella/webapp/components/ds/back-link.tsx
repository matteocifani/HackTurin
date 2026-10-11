/** The single link that returns from a detail to its list. Part of the IAMAimpresa design system. */
'use client'

import type { MouseEvent, ReactNode } from 'react'

import Link from 'next/link'

import type { VariantProps } from 'class-variance-authority'
import { ArrowLeftIcon } from 'lucide-react'

import { Button, buttonVariants } from '@/components/ui/button'
import { tornaIndietro } from '@/lib/navigazione'

type BackLinkProps = {
  href: string
  children: ReactNode
  className?: string

  variant?: VariantProps<typeof buttonVariants>['variant']
  size?: VariantProps<typeof buttonVariants>['size']
}

export function BackLink({ href, children, className, variant = 'ghost', size = 'sm' }: BackLinkProps) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>): void => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

    if (tornaIndietro()) e.preventDefault()
  }

  return (
    <Button variant={variant} size={size} className={className} asChild>
      <Link href={href} onClick={onClick} data-slot='back-link'>
        <ArrowLeftIcon />
        {children}
      </Link>
    </Button>
  )
}
