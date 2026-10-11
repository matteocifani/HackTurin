/** Context that lets a toolbar collapse its search into an icon and reopen it. Part of the IAMAimpresa design system. */
'use client'

import { createContext, useContext } from 'react'

export type RicercaALente = { testo: string; rimetti: (testo: string) => void }

export const RicercaALenteContext = createContext<RicercaALente | null>(null)

export const useRicercaALente = (): RicercaALente | null => useContext(RicercaALenteContext)
