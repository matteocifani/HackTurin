'use client'

// Hook condiviso dalle tre pagine: carica gli eventi, li aggiorna ogni 2 s con after_id (SPEC §8)
// e li riallinea periodicamente con una ricarica completa (per i cambi di stato fatti altrove).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import { api, etichettaTipo, fmtOra, FONTI, POLL_MS, type Evento } from '@/lib/casco/api'

type Opzioni = {
  query: string // es. 'public=1&from=…' oppure 'type=A,B' (senza after_id)
  ricaricaMs?: number
  notifiche?: boolean // toast "Nuovo evento" (mappa pubblica e /comune)
  onNuovi?: (nuovi: Evento[]) => void
}

export function useEventi({ query, ricaricaMs = 20000, notifiche = false, onNuovi }: Opzioni) {
  const [eventi, setEventi] = useState<Map<number, Evento>>(() => new Map())
  const [freschi, setFreschi] = useState<Set<number>>(() => new Set())
  const [online, setOnline] = useState<boolean | null>(null)
  const [aggiornatoAlle, setAggiornatoAlle] = useState<Date | null>(null)
  const maxId = useRef(0)
  const firma = useRef('')
  const onNuoviRef = useRef(onNuovi)
  onNuoviRef.current = onNuovi

  const ricarica = useCallback(async () => {
    try {
      const lista = await api<Evento[]>(`/api/events?${query}`)
      maxId.current = lista.reduce((m, e) => Math.max(m, e.id), maxId.current)
      const f = lista.map(e => `${e.id}${e.status}`).join('|')
      if (f !== firma.current) {
        firma.current = f
        setEventi(new Map(lista.map(e => [e.id, e])))
      }
      setOnline(true)
      setAggiornatoAlle(new Date())
    } catch {
      setOnline(false)
    }
  }, [query])

  const sonda = useCallback(async () => {
    try {
      const sep = query ? `${query}&` : ''
      const lista = await api<Evento[]>(`/api/events?${sep}after_id=${maxId.current}`)
      if (lista.length) {
        maxId.current = lista.reduce((m, e) => Math.max(m, e.id), maxId.current)
        firma.current = ''
        setEventi(prev => {
          const n = new Map(prev)
          for (const e of lista) n.set(e.id, e)
          return n
        })
        const ids = lista.map(e => e.id)
        setFreschi(prev => new Set([...prev, ...ids]))
        setTimeout(() => {
          setFreschi(prev => {
            const n = new Set(prev)
            ids.forEach(id => n.delete(id))
            return n
          })
        }, 4000)
        if (notifiche) lista.forEach(notificaNuovo)
        onNuoviRef.current?.(lista)
      }
      setOnline(true)
      setAggiornatoAlle(new Date())
    } catch {
      setOnline(false)
    }
  }, [query, notifiche])

  useEffect(() => {
    firma.current = ''
    void ricarica()
    const a = setInterval(sonda, POLL_MS)
    const b = setInterval(ricarica, ricaricaMs)
    return () => {
      clearInterval(a)
      clearInterval(b)
    }
  }, [ricarica, sonda, ricaricaMs])

  // Aggiornamento locale dopo una PATCH riuscita (senza aspettare la ricarica).
  const applica = useCallback((e: Evento) => {
    firma.current = ''
    setEventi(prev => {
      const n = new Map(prev)
      n.set(e.id, e)
      return n
    })
  }, [])

  const lista = useMemo(() => [...eventi.values()], [eventi])
  return { eventi: lista, freschi, online, aggiornatoAlle, applica, ricarica }
}

function notificaNuovo(e: Evento) {
  toast(`Nuovo evento · ${etichettaTipo(e.type)}`, {
    description: `${fmtOra(e.ts)} · severità ${e.severity}/5 · ${FONTI[e.source]?.label ?? e.source}${e.emergency ? ' · allarme inviato' : ''}`,
    duration: 6000,
  })
}
