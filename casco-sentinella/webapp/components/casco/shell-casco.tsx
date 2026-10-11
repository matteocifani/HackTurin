'use client'

// Cornice comune delle tre pagine: AppShell del kit IAMAimpresa con la nostra navigazione,
// marchio FBL, banner "dati SIMULATI" (obbligatorio, SPEC §8) e tema scuro solo su /emergenza.

import { useEffect, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboardIcon, MapIcon, SirenIcon } from 'lucide-react'

import AppShell, { type AppShellNavItem } from '@/components/ds/app-shell'
import { Avviso } from '@/components/ds/avviso'
import { StatusBadge } from '@/components/ds/status-badge'

const PAGINE = [
  { href: '/', title: 'Mappa pubblica', shortTitle: 'Mappa', icon: MapIcon },
  { href: '/comune', title: 'Dashboard Comune', shortTitle: 'Comune', icon: LayoutDashboardIcon },
  { href: '/emergenza', title: 'Emergenze 112', shortTitle: '112', icon: SirenIcon },
] as const

function normalizza(p: string | null) {
  const senzaSlash = (p ?? '/').replace(/\/+$/, '')
  return senzaSlash === '' ? '/' : senzaSlash
}

export function ShellCasco({ children }: { children: ReactNode }) {
  const pathname = normalizza(usePathname())
  const router = useRouter()
  const corrente = PAGINE.find(p => p.href === pathname) ?? PAGINE[0]
  const scuro = corrente.href === '/emergenza'

  useEffect(() => {
    document.documentElement.classList.toggle('dark', scuro)
    return () => document.documentElement.classList.remove('dark')
  }, [scuro])

  const nav: AppShellNavItem[] = PAGINE.map(p => ({
    title: p.title,
    shortTitle: p.shortTitle,
    icon: p.icon,
    isActive: p.href === corrente.href,
    onSelect: () => router.push(p.href),
  }))

  return (
    <AppShell
      brand={<Marchio />}
      nav={nav}
      groupLabel='Monitoraggio'
      current={corrente.title}
      headerActions={
        <StatusBadge tone='warning' variant='bordata' size='sm'>
          DEMO · dati SIMULATI
        </StatusBadge>
      }
      footer={<Credito />}
      contenutoPieno
    >
      <Avviso tono='warning' className='mb-4 px-3 py-2 text-sm font-medium'>
        Demo HackTurin — include dati storici SIMULATI (luoghi reali, distribuzione inventata). Posizione dei
        caschi SIMULATA (percorso predefinito, nessun GPS).
      </Avviso>
      {children}
    </AppShell>
  )
}

function Marchio() {
  return (
    <div className='flex items-center gap-2.5'>
      <span className='bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-bold tracking-tight'>
        FBL
      </span>
      <span className='flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden'>
        <span className='truncate text-sm font-semibold'>FBL</span>
        <span className='truncate text-xs opacity-70'>Casco Sentinella</span>
      </span>
    </div>
  )
}

function Credito() {
  return (
    <div className='px-2 text-xs leading-relaxed opacity-70 group-data-[collapsible=icon]:hidden'>
      HackTurin 2026 · Track City Signals
      <br />
      UI costruita con il kit IAMAimpresa
      <br />
      Nessuna autenticazione in demo
    </div>
  )
}
