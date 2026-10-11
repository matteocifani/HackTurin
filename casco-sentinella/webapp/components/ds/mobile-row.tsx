/** Row cards for lists on phones, with skeleton. Part of the IAMAimpresa design system. */
'use client'

import { type ComponentProps, type CSSProperties, type ReactNode, type Ref, Fragment } from 'react'

import Link from 'next/link'

import { ChevronRightIcon } from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'
import { clickSeNonSelezione } from '@/lib/navigazione'
import { stagger } from '@/lib/stagger'
import { cn } from '@/lib/utils'

export function MobileRowList({
  piatta = false,
  className,
  children,
}: {
  piatta?: boolean
  className?: string
  children: ReactNode
}) {
  return <ul className={cn(piatta ? 'divide-y' : 'space-y-2', className)}>{children}</ul>
}

export function GuscioRiga({
  index = 0,
  piatta = false,
  className,
  style,
  children,
  ...props
}: ComponentProps<'li'> & { index?: number; piatta?: boolean }) {
  return (
    <li
      {...props}
      style={{ ...stagger(index), ...style }}
      className={cn(
        'animate-in fade-in slide-in-from-bottom-1 motion-reduce:animate-none',
        !piatta && 'bg-card rounded-lg border',
        className
      )}
    >
      {children}
    </li>
  )
}

type MobileRowProps = {
  leading?: ReactNode
  title: ReactNode

  titleClassName?: string

  titleExtra?: ReactNode

  meta?: ReactNode[]

  extra?: ReactNode

  signal?: ReactNode
  chevron?: boolean

  expanded?: boolean

  href?: string

  onClick?: () => void

  footer?: ReactNode

  index?: number

  piatta?: boolean
  className?: string

  ref?: Ref<HTMLLIElement>
  style?: CSSProperties
}

export function MobileRow({
  leading,
  title,
  titleClassName,
  titleExtra,
  meta,
  extra,
  signal,
  chevron,
  expanded,
  href,
  onClick,
  footer,
  index = 0,
  piatta = false,
  className,
  ref,
  style,
}: MobileRowProps) {
  const metaItems = (meta ?? []).filter(Boolean)

  const body = (
    <>
      <div className='flex items-center gap-3'>
        {leading}
        <div className='min-w-0 flex-1'>
          <div className='flex items-start justify-between gap-2'>
            <span className={cn('line-clamp-2 min-w-0 flex-1 text-sm font-medium', titleClassName)}>
              {title}
            </span>
            {titleExtra && <span className='flex shrink-0 items-center gap-1.5'>{titleExtra}</span>}
          </div>
          {metaItems.length > 0 && (
            <div className='text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs'>
              {metaItems.map((item, i) =>
                i === 0 ? (
                  <Fragment key={i}>{item}</Fragment>
                ) : (
                  <span key={i} className='flex min-w-0 items-center gap-2'>
                    <span className='text-muted-foreground/50' aria-hidden>
                      {'·'}
                    </span>
                    {item}
                  </span>
                )
              )}
            </div>
          )}
        </div>
        {(signal || chevron) && (
          <div className='flex shrink-0 items-center gap-2'>
            {signal}
            {chevron && (
              <ChevronRightIcon
                className={cn(
                  'text-muted-foreground/60 size-4 shrink-0 transition-transform',
                  expanded && 'rotate-90'
                )}
                aria-hidden
              />
            )}
          </div>
        )}
      </div>
      {extra && <div className='mt-1.5'>{extra}</div>}
    </>
  )

  const rientro = piatta ? 'px-4' : 'px-3'
  const interactive = cn(
    'hover:bg-muted/50 focus-visible:ring-ring block w-full py-2.5 text-start transition-colors outline-none focus-visible:ring-2',
    piatta ? 'rounded-none' : 'rounded-lg',
    rientro
  )

  return (
    <GuscioRiga
      ref={ref}
      index={index}
      piatta={piatta}
      className={className}
      style={{ animationDelay: `${Math.min(index, 8) * 30}ms`, ...style }}
    >
      {href ? (
        <Link href={href} className={interactive} draggable={false} onClick={clickSeNonSelezione}>
          {body}
        </Link>
      ) : onClick ? (
        <button
          type='button'
          onClick={onClick}
          aria-expanded={chevron ? expanded : undefined}
          className={interactive}
        >
          {body}
        </button>
      ) : (
        <div className={cn('py-2.5', rientro)}>{body}</div>
      )}
      {footer && <div className={cn(piatta ? 'pb-2.5' : 'border-t py-2', rientro)}>{footer}</div>}
    </GuscioRiga>
  )
}

export function MobileRowSkeleton({
  rows = 6,
  linee = ['h-4 w-3/4', 'h-3 w-40 max-w-full'],
  leading,
  segnale,
}: {
  rows?: number

  linee?: string[]

  leading?: string

  segnale?: string
}) {
  return (
    <MobileRowList>
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className='bg-card flex items-center gap-3 rounded-lg border px-3 py-2.5'>
          {leading && <Skeleton className={leading} />}
          <div className='min-w-0 flex-1 space-y-1.5'>
            {linee.map((classe, k) => (
              <Skeleton key={k} className={classe} />
            ))}
          </div>
          {segnale && <Skeleton className={segnale} />}
        </li>
      ))}
    </MobileRowList>
  )
}
