/** shadcn/ui Skeleton primitive on the IAMAimpresa tokens. Part of the IAMAimpresa design system. */
import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot='skeleton' className={cn('animate-pulse rounded-md bg-accent', className)} {...props} />
  )
}

export { Skeleton }
