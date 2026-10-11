// Indicatore di connessione al server (polling a 2 s): "aggiornato hh:mm:ss" oppure "server non raggiungibile".
import { StatusBadge } from '@/components/ds/status-badge'

export function Vivo({ online, alle }: { online: boolean | null; alle: Date | null }) {
  if (online === null)
    return (
      <StatusBadge tone='muted' dot size='sm'>
        connessione…
      </StatusBadge>
    )
  return online ? (
    <StatusBadge tone='success' dot size='sm'>
      aggiornato {alle?.toLocaleTimeString('it-IT')}
    </StatusBadge>
  ) : (
    <StatusBadge tone='destructive' dot size='sm'>
      server non raggiungibile
    </StatusBadge>
  )
}
