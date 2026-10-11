import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import './globals.css'

import { ShellCasco } from '@/components/casco/shell-casco'
import { Toaster } from '@/components/ui/sonner'

export const metadata: Metadata = {
  title: { default: 'Casco Sentinella', template: '%s · Casco Sentinella' },
  description: 'Buche e cadute segnalate dai caschi sensorizzati — demo HackTurin 2026 (dati storici simulati).',
  applicationName: 'Casco Sentinella',
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang='it' suppressHydrationWarning>
      <body className='min-h-dvh antialiased'>
        <ShellCasco>{children}</ShellCasco>
        <Toaster position='bottom-right' />
      </body>
    </html>
  )
}
