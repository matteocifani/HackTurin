/** Dialog with a built-in footer (cancel on the left, the verb on the right); width follows its nature. Part of the IAMAimpresa design system. */
'use client'

import { createContext, useContext, type ComponentProps, type ReactNode } from 'react'

import { ComandiDialog } from '@/components/ds/dialog-comandi'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export type MisuraDialogo = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'

export type NaturaDialogo = 'conferma' | 'gesto' | 'creazione' | 'documento'

export const MISURA_DI_NATURA: Record<NaturaDialogo, MisuraDialogo> = {
  conferma: 'md',
  gesto: 'lg',
  creazione: 'xl',
  documento: '2xl',
}

const MISURE: Record<MisuraDialogo, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  '2xl': 'sm:max-w-2xl',
  '3xl': 'sm:max-w-3xl',
}

export type AzioneDialogo = {
  etichetta: ReactNode
  onClick?: () => void

  attesa?: boolean
  disabled?: boolean
  distruttiva?: boolean

  title?: string

  type?: 'button' | 'submit'
  form?: string

  variant?: 'default' | 'destructive' | 'outline' | 'secondary'

  attributi?: Record<`data-${string}`, string>
}

export type AnnullaDialogo = {
  etichetta?: ReactNode

  onClick?: () => void
  title?: string
}

export type DialogoAzioneProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  titolo: ReactNode

  titoloNascosto?: boolean
  descrizione?: ReactNode

  descrizioneNascosta?: boolean

  sottoTestata?: ReactNode

  natura?: NaturaDialogo

  misura?: MisuraDialogo

  scorre?: boolean

  azione?: AzioneDialogo

  annulla?: AnnullaDialogo | false

  altre?: ReactNode

  comandi?: { onExpand: () => void }

  chiudiVisibile?: boolean

  className?: string

  classeTestata?: string
  classeTitolo?: string

  classeDescrizione?: string

  classePiede?: string
  children?: ReactNode
  onOpenAutoFocus?: ComponentProps<typeof DialogContent>['onOpenAutoFocus']
  onCloseAutoFocus?: ComponentProps<typeof DialogContent>['onCloseAutoFocus']
} & Omit<
  ComponentProps<typeof DialogContent>,
  'className' | 'children' | 'showCloseButton' | 'onOpenAutoFocus' | 'onCloseAutoFocus' | 'title'
>

const CorpoCheScorre = createContext(false)

const GUSCIO_CHE_SCORRE = 'flex max-h-[85vh] flex-col overflow-hidden'
const CORPO_CHE_SCORRE =
  '-mx-6 -my-1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-6 py-1 *:shrink-0'

const PIEDE_FERMO = 'sticky bottom-0 z-(--z-sticky) -mt-2 -mb-1 bg-background pt-2 pb-1'

export function PiedeAzione({
  azione,
  annulla,
  altre,
  className,
}: {
  azione?: AzioneDialogo
  annulla?: AnnullaDialogo | false
  altre?: ReactNode
  className?: string
}) {
  const inAttesa = azione?.attesa === true
  const nelCorpo = useContext(CorpoCheScorre)
  return (
    <DialogFooter className={cn(nelCorpo && PIEDE_FERMO, className)}>
      {altre}
      {annulla !== false && (
        <Button variant='outline' onClick={annulla?.onClick} disabled={inAttesa} title={annulla?.title}>
          {annulla?.etichetta ?? 'Annulla'}
        </Button>
      )}
      {azione != null && (
        <Button
          variant={azione.variant ?? (azione.distruttiva ? 'destructive' : 'default')}
          type={azione.type ?? 'button'}
          form={azione.form}
          onClick={azione.onClick}
          disabled={azione.disabled}
          attesa={azione.attesa}
          title={azione.title}
          {...azione.attributi}
        >
          {azione.etichetta}
        </Button>
      )}
    </DialogFooter>
  )
}

export function DialogoAzione({
  open,
  onOpenChange,
  titolo,
  titoloNascosto = false,
  descrizione,
  descrizioneNascosta = false,
  sottoTestata,
  natura,
  misura,
  scorre = false,
  azione,
  annulla,
  altre,
  comandi,
  chiudiVisibile,
  className,
  classeTestata,
  classeTitolo,
  classeDescrizione,
  classePiede,
  children,
  onOpenAutoFocus,
  onCloseAutoFocus,
  ...resto
}: DialogoAzioneProps) {
  const inAttesa = azione?.attesa === true
  const larghezza = misura ?? MISURA_DI_NATURA[natura ?? 'conferma']
  const chiudi = () => onOpenChange(false)
  const conPiede = azione != null || annulla !== false || altre != null
  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (!next && inAttesa) return
        onOpenChange(next)
      }}
    >
      <DialogContent
        className={cn(MISURE[larghezza], scorre && GUSCIO_CHE_SCORRE, className)}
        showCloseButton={chiudiVisibile ?? comandi == null}
        onOpenAutoFocus={onOpenAutoFocus}
        onCloseAutoFocus={onCloseAutoFocus}
        {...resto}
      >
        <CorpoCheScorre.Provider value={false}>
          {comandi != null && <ComandiDialog onExpand={comandi.onExpand} />}
          <DialogHeader className={cn(scorre && 'shrink-0', classeTestata)}>
            <DialogTitle className={cn(titoloNascosto && 'sr-only', classeTitolo)}>{titolo}</DialogTitle>
            {descrizione != null && (
              <DialogDescription className={cn(descrizioneNascosta && 'sr-only', classeDescrizione)}>
                {descrizione}
              </DialogDescription>
            )}
          </DialogHeader>
          {sottoTestata != null && (
            <div data-slot='dialogo-sotto-testata' className={cn('min-w-0', scorre && 'shrink-0')}>
              {sottoTestata}
            </div>
          )}
          {scorre ? (
            <div data-slot='dialogo-corpo' className={CORPO_CHE_SCORRE}>
              <CorpoCheScorre.Provider value={true}>{children}</CorpoCheScorre.Provider>
            </div>
          ) : (
            children
          )}
          {conPiede && (
            <PiedeAzione
              azione={azione}
              annulla={annulla === false ? false : { ...annulla, onClick: annulla?.onClick ?? chiudi }}
              altre={altre}
              className={cn(scorre && 'shrink-0', classePiede)}
            />
          )}
        </CorpoCheScorre.Provider>
      </DialogContent>
    </Dialog>
  )
}
