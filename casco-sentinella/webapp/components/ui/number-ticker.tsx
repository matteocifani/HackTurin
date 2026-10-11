/** shadcn/ui NumberTicker primitive on the IAMAimpresa tokens. Part of the IAMAimpresa design system. */
'use client'

import * as React from 'react'

import { useInView, useMotionValue, useReducedMotion, useSpring } from 'motion/react'

import { cn } from '@/lib/utils'

interface NumberTickerProps extends React.ComponentPropsWithoutRef<'span'> {
  value: number

  startValue?: number

  direction?: 'up' | 'down'

  delay?: number
  decimalPlaces?: number
  damping?: number
  stiffness?: number

  locale?: string
}

function NumberTicker({
  value,
  startValue,
  direction = 'up',
  delay = 0,
  className,
  decimalPlaces = 0,
  damping = 30,
  stiffness = 200,
  locale = 'it-IT',
  ...props
}: NumberTickerProps) {
  const ref = React.useRef<HTMLSpanElement>(null)
  const entrata = startValue !== undefined
  const partenza = entrata ? (direction === 'down' ? value : (startValue ?? 0)) : value

  const motionValue = useMotionValue(partenza)

  const springValue = useSpring(motionValue, {
    damping,
    stiffness,
  })

  const isInView = useInView(ref, { once: true, margin: '0px' })

  const riduciMovimento = useReducedMotion()

  const [testoIniziale] = React.useState(() =>
    Intl.NumberFormat(locale, {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(partenza)
  )

  React.useEffect(() => {
    if (entrata && !isInView) return

    const arrivo = entrata && direction === 'down' ? (startValue ?? 0) : value

    if (riduciMovimento) {
      motionValue.jump(arrivo)
      return
    }

    if (entrata && delay > 0) {
      const timer = setTimeout(() => motionValue.set(arrivo), delay * 1000)
      return () => clearTimeout(timer)
    }

    motionValue.set(arrivo)
  }, [entrata, isInView, riduciMovimento, motionValue, delay, value, direction, startValue])

  React.useEffect(
    () =>
      springValue.on('change', latest => {
        if (ref.current) {
          ref.current.textContent = Intl.NumberFormat(locale, {
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces,
          }).format(Number(latest.toFixed(decimalPlaces)))
        }
      }),
    [springValue, decimalPlaces, locale]
  )

  return (
    <span ref={ref} className={cn('inline-block tabular-nums', className)} {...props}>
      {testoIniziale}
    </span>
  )
}

export { NumberTicker, type NumberTickerProps }
