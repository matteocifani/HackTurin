/** shadcn/ui CircularProgress primitive on the IAMAimpresa tokens. Part of the IAMAimpresa design system. */
import { cn } from '@/lib/utils'

const DIAMETRO = 96
const SPESSORE_ANELLO = 4

const LUNGHEZZA = 100

interface CircularProgressProps {
  value: number
  renderLabel?: (progress: number) => number | string
  size?: number
  strokeWidth?: number
  circleStrokeWidth?: number
  progressStrokeWidth?: number
  shape?: 'square' | 'round'
  className?: string
  progressClassName?: string
  labelClassName?: string
  showLabel?: boolean
}

const CircularProgress = ({
  value,
  renderLabel,
  className,
  progressClassName,
  labelClassName,
  showLabel,
  shape = 'round',
  size = DIAMETRO,
  strokeWidth,
  circleStrokeWidth = SPESSORE_ANELLO,
  progressStrokeWidth = SPESSORE_ANELLO,
}: CircularProgressProps) => {
  const traccia = strokeWidth ?? circleStrokeWidth
  const arco = strokeWidth ?? progressStrokeWidth

  const raggio = (size - Math.max(traccia, arco)) / 2
  const pieno = Math.min(100, Math.max(0, value))

  return (
    <div className='relative'>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        version='1.1'
        xmlns='http://www.w3.org/2000/svg'

        className='relative block -rotate-90'
      >
        <circle
          r={raggio}
          cx={size / 2}
          cy={size / 2}
          fill='none'
          strokeWidth={traccia}
          className={cn('stroke-chart-context', className)}
        />

        {pieno > 0 && (
          <circle
            r={raggio}
            cx={size / 2}
            cy={size / 2}
            fill='none'
            strokeWidth={arco}
            strokeLinecap={shape}
            pathLength={LUNGHEZZA}
            strokeDasharray={LUNGHEZZA}
            strokeDashoffset={LUNGHEZZA - pieno}
            className={cn('stroke-chart-1', progressClassName)}
          />
        )}
      </svg>
      {showLabel && (
        <div className={cn('absolute inset-0 flex items-center justify-center', labelClassName)}>
          {renderLabel ? renderLabel(value) : value}%
        </div>
      )}
    </div>
  )
}

export { CircularProgress }
