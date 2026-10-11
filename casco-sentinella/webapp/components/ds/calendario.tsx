/** Calendar primitive with the Italian locale, used by date pickers and date facets. Part of the IAMAimpresa design system. */
'use client'

import { it } from 'react-day-picker/locale'

import { Calendar } from '@/components/ui/calendar'

type PropsCalendario = React.ComponentProps<typeof Calendar>

function valida(d: Date | undefined): Date | undefined {
  return d != null && !Number.isNaN(d.getTime()) ? d : undefined
}

function meseDellaScelta(props: PropsCalendario): Date | undefined {
  switch (props.mode) {
    case 'single':
      return valida(props.selected)
    case 'range':
      return valida(props.selected?.from) ?? valida(props.selected?.to)
    case 'multiple': {
      const giorni = (props.selected ?? []).filter(d => valida(d) != null)
      return giorni.length > 0 ? new Date(Math.min(...giorni.map(d => d.getTime()))) : undefined
    }
    default:
      return undefined
  }
}

export function Calendario(props: PropsCalendario) {
  return <Calendar locale={it} {...props} defaultMonth={props.defaultMonth ?? meseDellaScelta(props)} />
}
