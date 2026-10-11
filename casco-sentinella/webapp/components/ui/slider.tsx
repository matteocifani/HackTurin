/** shadcn/ui Slider primitive on the IAMAimpresa tokens. Part of the IAMAimpresa design system. */
import * as React from 'react'
import { Slider as SliderPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  etichette,
  testoValore,
  segni,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root> & {
  etichette?: readonly string[]

  testoValore?: (valore: number) => string

  segni?: readonly number[]
}) {
  const _values = React.useMemo(
    () => (Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min, max]),
    [value, defaultValue, min, max]
  )

  return (
    <SliderPrimitive.Root
      data-slot='slider'
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        'relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col',
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot='slider-track'
        className={cn(
          'relative grow overflow-hidden rounded-full bg-muted data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5'
        )}
      >
        <SliderPrimitive.Range
          data-slot='slider-range'
          className={cn(
            'absolute bg-primary data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full'
          )}
        />
      </SliderPrimitive.Track>
      {props.orientation !== 'vertical' &&
        segni
          ?.filter(s => max > min && s >= min && s <= max)
          .map(s => {
            const p = ((s - min) / (max - min)) * 100
            return (
              <span
                key={s}
                aria-hidden
                data-slot='slider-segno'
                className='pointer-events-none absolute top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-muted-foreground'
                style={{ left: `calc(${p}% + ${8 - 0.16 * p}px)` }}
              />
            )
          })}
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot='slider-thumb'
          key={index}
          aria-label={etichette?.[index]}
          aria-valuetext={
            testoValore != null && _values[index] != null ? testoValore(_values[index]) : undefined
          }
          className='relative block size-4 shrink-0 rounded-full border border-primary bg-fixed-light ring-ring/50 transition-[color,box-shadow] before:absolute before:-inset-4 hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50'
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
