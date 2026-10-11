/** Building blocks of a kanban board: sensors, columns, drag preview, card header. Part of the IAMAimpresa design system. */
'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type DragEventHandler,
  type ReactNode,
} from 'react'

import {
  MouseSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
} from '@dnd-kit/core'
import { ChevronsRightLeftIcon } from 'lucide-react'

import { MenuAzioni } from '@/components/ds/menu-azioni'
import { TITOLO_CARTA } from '@/components/ds/section-card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { ALTEZZA_VISTA, GRONDA_VISTA, QUOTA_INIZIALE_VISTA, useQuotaVista } from '@/hooks/use-quota-vista'
import { cn } from '@/lib/utils'

type BoardSensor = Parameters<typeof useSensors>[number]

export function useBoardSensors(extra: BoardSensor[] = []) {
  return useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    ...extra
  )
}

export function useBoardCollision(fallback: 'center' | 'rect' = 'center'): CollisionDetection {
  return useCallback<CollisionDetection>(
    args => {
      const within = pointerWithin(args)
      if (within.length > 0) return within
      return fallback === 'center' ? closestCenter(args) : closestCenter(args)
    },
    [fallback]
  )
}

export function useBoardColumns<T>(source: T, build: (source: T) => Record<string, string[]>) {
  const [columns, setColumns] = useState(() => build(source))
  const draggingRef = useRef(false)
  const sourceRef = useRef(source)
  sourceRef.current = source

  useEffect(() => {
    if (!draggingRef.current) setColumns(build(source))

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source])

  const resync = useCallback(() => setColumns(build(sourceRef.current)), [build])

  return { columns, setColumns, draggingRef, resync }
}

const ContestoPista = createContext(false)

export function BoardScroller({ dragging, children }: { dragging: boolean; children: ReactNode }) {
  const guscio = useRef<HTMLDivElement | null>(null)

  const [ancora, setAncora] = useState(false)

  useEffect(() => {
    const vista = guscio.current?.querySelector<HTMLElement>('[data-slot=scroll-area-viewport]')
    if (vista == null) return

    const misura = () => setAncora(vista.scrollLeft + vista.clientWidth < vista.scrollWidth - 1)
    misura()
    vista.addEventListener('scroll', misura, { passive: true })
    const osserva = new ResizeObserver(misura)
    osserva.observe(vista)
    if (vista.firstElementChild != null) osserva.observe(vista.firstElementChild)
    return () => {
      vista.removeEventListener('scroll', misura)
      osserva.disconnect()
    }
  }, [])

  useQuotaVista(guscio, { telefono: 'scorre' })

  return (
    <div
      ref={guscio}
      style={QUOTA_INIZIALE_VISTA}
      className='group/board relative mb-[calc(-1*var(--vista-assorbi))]'
    >
      <ScrollArea className='w-full [contain:inline-size]'>
        <div className={cn('flex items-start gap-3 pb-3 sm:gap-4 sm:pb-2', dragging && 'cursor-grabbing')}>
          <ContestoPista.Provider value>{children}</ContestoPista.Provider>
        </div>
        <ScrollBar
          orientation='horizontal'

          className='absolute inset-x-0 bottom-0 opacity-0 transition-opacity group-hover/board:opacity-100 data-[state=visible]:opacity-100 motion-reduce:transition-none sm:h-2'
        />
      </ScrollArea>
      <div
        aria-hidden
        className={cn(
          'from-background pointer-events-none absolute inset-y-0 end-0 z-(--z-raised) w-16 bg-gradient-to-l to-transparent transition-opacity motion-reduce:transition-none',
          ancora ? 'opacity-100' : 'opacity-0'
        )}
      />
    </div>
  )
}

type DropNativo = {
  onDragOver?: DragEventHandler<HTMLElement>
  onDrop?: DragEventHandler<HTMLElement>
  onDragLeave?: DragEventHandler<HTMLElement>
}

const ALTEZZA_COLONNA_TELEFONO = 'max-h-[calc(100svh-3rem-var(--vista-coda)-1.75rem)]'

const GRONDA_COLONNA_TELEFONO =
  'max-sm:data-scorre:pb-[max(0.5rem,calc(var(--flottanti-riserva,0px)-var(--vista-coda,0px)-0.75rem))]'

export type LarghezzaColonna = 'normale' | 'stretta'

const LARGHEZZA_COLONNA: Record<LarghezzaColonna, string> = {
  normale: 'w-72 lg:w-64',
  stretta: 'w-72 lg:w-48',
}

const LARGHEZZA_ANTEPRIMA: Record<LarghezzaColonna, string> = {
  normale: 'w-72',
  stretta: 'w-72 lg:w-48',
}

export function BoardColumnShell({
  title,
  icon,
  count,
  isOver,
  onCollapse,
  comprimiSpento,
  innerRef,
  children,
  className,
  scrollClassName,
  larghezza = 'normale',
  onDragOver,
  onDrop,
  onDragLeave,
}: {
  title: string
  icon?: ReactNode
  count: number
  isOver?: boolean
  onCollapse?: () => void

  comprimiSpento?: string
  innerRef?: (node: HTMLElement | null) => void
  children: ReactNode
  className?: string
  scrollClassName?: string

  larghezza?: LarghezzaColonna
} & DropNativo) {
  const corpo = useRef<HTMLDivElement | null>(null)
  const inPista = useContext(ContestoPista)
  useLayoutEffect(() => {
    const el = corpo.current
    if (!inPista || el == null) return
    const misura = () => el.toggleAttribute('data-scorre', el.scrollHeight > el.clientHeight + 1)
    misura()
    const osserva = new ResizeObserver(misura)
    osserva.observe(el)
    return () => osserva.disconnect()
  }, [inPista])

  return (
    <div
      ref={innerRef}
      data-slot='board-colonna'

      data-vista-cima=''
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragLeave={onDragLeave}
      className={cn(
        'bg-muted flex shrink-0 flex-col rounded-lg transition-shadow sm:max-h-none',
        LARGHEZZA_COLONNA[larghezza],
        ALTEZZA_COLONNA_TELEFONO,
        ALTEZZA_VISTA,
        isOver && 'ring-ring ring-2',
        className
      )}
    >
      <div className='flex shrink-0 items-center gap-2 px-3 pt-2.5 pb-1.5'>
        {icon}
        <span className={cn(TITOLO_CARTA, 'min-w-0 flex-1 truncate')} title={title}>
          {title}
        </span>
        <Badge
          variant='secondary'
          className='bg-background h-5 w-auto min-w-5 shrink-0 justify-center rounded-sm px-1 py-0 text-2xs tabular-nums'
        >
          {count}
        </Badge>
        {comprimiSpento != null ? (
          <button
            type='button'
            aria-disabled='true'
            aria-label={`Comprimi la colonna ${title}`}
            title={comprimiSpento}
            className='text-muted-foreground/30 focus-visible:ring-ring shrink-0 cursor-not-allowed rounded p-0.5 outline-none focus-visible:ring-2'
          >
            <ChevronsRightLeftIcon className='size-3.5' />
          </button>
        ) : (
          onCollapse && (
            <button
              type='button'
              onClick={onCollapse}
              aria-label={`Comprimi la colonna ${title}`}
              className='text-muted-foreground/60 hover:text-muted-foreground focus-visible:ring-ring shrink-0 rounded p-0.5 transition-colors outline-none focus-visible:ring-2'
            >
              <ChevronsRightLeftIcon className='size-3.5' />
            </button>
          )
        )}
      </div>

      <div
        ref={corpo}
        className={cn(
          'flex min-h-24 flex-col gap-2 overflow-y-auto ps-2 pe-1.5 pb-2 [scrollbar-width:thin] sm:min-h-0 sm:flex-1',
          GRONDA_VISTA,
          GRONDA_COLONNA_TELEFONO,
          scrollClassName
        )}
      >
        {children}
      </div>
    </div>
  )
}

export function BoardEmptyDrop({ label = 'Trascina qui' }: { label?: string }) {
  return (
    <div className='text-muted-foreground/70 flex min-h-24 items-center justify-center rounded-md border border-dashed text-center text-xs'>
      {label}
    </div>
  )
}

export function BoardCollapsedColumn({
  label,
  count,
  icon,
  onExpand,
  onDragOver,
  onDrop,
  onDragLeave,
}: {
  label: string
  count: number
  icon?: ReactNode
  onExpand: () => void
} & DropNativo) {
  return (
    <button
      type='button'
      onClick={onExpand}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragLeave={onDragLeave}
      aria-label={`Espandi la colonna ${label} (${count})`}

      className='bg-muted hover:bg-border focus-visible:ring-ring flex min-h-48 w-10 shrink-0 flex-col items-center gap-2 rounded-lg py-3 transition-colors outline-none focus-visible:ring-2 sm:self-stretch'
    >
      {icon}
      <span className={cn(TITOLO_CARTA, '[writing-mode:vertical-rl]')}>{label}</span>
      <Badge
        variant='secondary'
        className='bg-background mt-auto h-5 w-auto min-w-5 justify-center rounded-sm px-1 py-0 text-2xs tabular-nums'
      >
        {count}
      </Badge>
    </button>
  )
}

export function BoardDragPreview({
  children,
  larghezza = 'normale',
}: {
  children: ReactNode
  larghezza?: LarghezzaColonna
}) {
  return <div className={LARGHEZZA_ANTEPRIMA[larghezza]}>{children}</div>
}

export function TestaCardBoard({
  titolo,
  glifi,
  menu,
  barrato = false,
}: {
  titolo: ReactNode

  glifi?: ReactNode

  menu?: { etichetta: string; voci: ReactNode }

  barrato?: boolean
}) {
  return (
    <div className='flex items-start gap-1.5'>
      <p
        className={cn(
          'line-clamp-2 min-w-0 flex-1 text-sm leading-snug font-medium',
          barrato && 'text-muted-foreground line-through'
        )}
      >
        {titolo}
      </p>
      {(glifi != null || menu != null) && (
        <div className='flex h-5 shrink-0 items-center gap-1'>
          {glifi}
          {menu != null && (
            <MenuAzioni
              etichetta={menu.etichetta}
              size='icon-xs'
              className='text-muted-foreground -me-1.5 opacity-0 transition-opacity group-hover/card:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 max-sm:opacity-100'
              onPointerDown={e => e.stopPropagation()}
            >
              {menu.voci}
            </MenuAzioni>
          )}
        </div>
      )}
    </div>
  )
}
