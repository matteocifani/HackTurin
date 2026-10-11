/** Page title with description, badges, meta and actions (the primary last on the right). Part of the IAMAimpresa design system. */
import type { ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  description?: string

  actions?: ReactNode

  badges?: ReactNode

  meta?: ReactNode
}

const AZIONI_COMPATTE = [
  'max-sm:[&>button:has(>svg)]:h-(--control-h-sm)',
  'max-sm:[&>button:has(>svg)]:w-12',
  'max-sm:[&>button:has(>svg)]:justify-center',
  'max-sm:[&>button:has(>svg)]:gap-0',
  'max-sm:[&>button:has(>svg)]:px-0',
  'max-sm:[&>button:has(>svg)]:text-[0px]',
  'max-sm:[&>a:has(>svg)]:h-(--control-h-sm)',
  'max-sm:[&>a:has(>svg)]:w-12',
  'max-sm:[&>a:has(>svg)]:justify-center',
  'max-sm:[&>a:has(>svg)]:gap-0',
  'max-sm:[&>a:has(>svg)]:px-0',
  'max-sm:[&>a:has(>svg)]:text-[0px]',
].join(' ')

const FILA =
  'flex flex-wrap items-start justify-between gap-4 max-sm:flex-nowrap max-sm:items-center max-sm:gap-2'
const FILA_CON_FATTI = 'flex flex-wrap items-start justify-between gap-4 max-sm:flex-nowrap max-sm:gap-2'

const PageHeader = ({ title, description, actions, badges, meta }: PageHeaderProps) => {
  const titolo = (
    <h1 className='text-2xl font-semibold sm:truncate max-sm:line-clamp-2 max-sm:break-words max-sm:text-xl'>
      {title}
    </h1>
  )

  return (
    <div className={meta ? FILA_CON_FATTI : FILA}>
      <div className='min-w-0'>
        {badges ? (
          <div className='flex min-w-0 items-center gap-2 max-sm:flex-wrap'>
            {titolo}
            {badges}
          </div>
        ) : (
          titolo
        )}
        {meta ? (
          <div className='text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm'>
            {meta}
          </div>
        ) : null}
        {description && <p className='text-muted-foreground text-sm max-sm:hidden'>{description}</p>}
      </div>
      {actions && (
        <div
          className={`flex flex-wrap justify-end gap-2 max-sm:shrink-0 max-sm:flex-nowrap ${AZIONI_COMPATTE}`}
        >
          {actions}
        </div>
      )}
    </div>
  )
}

export default PageHeader
