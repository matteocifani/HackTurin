/** Loading skeletons with the shape of the main views. Part of the IAMAimpresa design system. */
import { Card } from '@/components/ui/card'

import { Skeleton } from '@/components/ui/skeleton'

export function BoardSkeleton() {
  return (
    <div className='flex gap-4 overflow-hidden [contain:inline-size]'>
      {Array.from({ length: 4 }).map((_, col) => (
        <div key={col} className='bg-muted w-72 shrink-0 rounded-lg p-2'>
          <div className='flex items-center gap-2 px-2 py-2'>
            <Skeleton className='h-4 w-24' />
            <Skeleton className='size-5 rounded-full' />
          </div>
          <div className='space-y-2'>
            {Array.from({ length: col === 0 ? 3 : col === 3 ? 1 : 2 }).map((_, row) => (
              <Card key={row} className='gap-2 p-3 shadow-none'>
                <Skeleton className='h-4 w-full' />
                <Skeleton className='h-4 w-2/3' />

                <div className='flex items-center gap-x-2 pt-1'>
                  <Skeleton className='h-3.5 w-20' />
                  <Skeleton className='ms-auto h-3.5 w-16' />
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function ListSkeleton() {
  return (
    <Card className='gap-0 py-0'>
      <div className='border-b px-4 py-3.5'>
        <Skeleton className='h-4 w-full max-w-2xl' />
      </div>
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className='flex items-center gap-4 border-b px-4 py-3 last:border-b-0'>
          <Skeleton className='h-4 w-4/12' />
          <Skeleton className='h-5 w-24 rounded-full' />
          <Skeleton className='size-6 rounded-lg' />
          <Skeleton className='h-4 w-16' />
          <Skeleton className='ms-auto h-4 w-14' />
        </div>
      ))}
    </Card>
  )
}

export function FlussoSkeleton({ misura = '3xl' }: { misura?: '3xl' | '5xl' }) {
  return (
    <div className={misura === '5xl' ? 'mx-auto w-full max-w-5xl' : 'mx-auto w-full max-w-3xl'}>
      <ListSkeleton />
    </div>
  )
}

function TestataGanttSkeleton() {
  return (
    <div className='flex h-12 gap-4 border-b px-3'>
      <div className='flex w-32 shrink-0 items-center'>
        <Skeleton className='h-3 w-16' />
      </div>
      <div className='flex min-w-0 flex-1 flex-col'>
        <div className='flex h-6 items-center justify-between border-b pe-8'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className='h-3 w-10' />
          ))}
        </div>
        <div className='flex h-6 items-center justify-between'>
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className='h-2 w-3' />
          ))}
        </div>
      </div>
    </div>
  )
}

export function GanttSkeleton() {
  return (
    <Card className='gap-0 overflow-hidden py-0'>
      <TestataGanttSkeleton />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className='flex items-center gap-4 border-b px-3 py-2.5 last:border-b-0'>
          <Skeleton className='h-4 w-32 shrink-0' />
          <div className='min-w-0 flex-1'>
            <Skeleton
              className='h-4'
              style={{ width: `${22 + ((i * 19) % 40)}%`, marginInlineStart: `${(i * 29) % 50}%` }}
            />
          </div>
        </div>
      ))}
    </Card>
  )
}

export function TimelineSkeleton() {
  return (
    <div className='space-y-3'>
      <Skeleton className='h-8 w-72' />
      <Card className='gap-0 overflow-hidden py-0'>
        <TestataGanttSkeleton />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className='flex gap-4 border-b px-3 py-3 last:border-b-0'>
            <Skeleton className='h-4 w-32 shrink-0' />
            <div className='flex-1 space-y-1.5'>
              <Skeleton
                className='h-5'
                style={{ width: `${30 + ((i * 17) % 40)}%`, marginInlineStart: `${(i * 23) % 45}%` }}
              />
              {i % 2 === 0 && (
                <Skeleton className='h-5 w-1/4' style={{ marginInlineStart: `${(i * 31 + 10) % 60}%` }} />
              )}
            </div>
          </div>
        ))}
      </Card>
    </div>
  )
}

export function CalendarSkeleton() {
  return (
    <Card className='gap-0 overflow-hidden py-0'>
      <div className='flex items-center justify-between border-b px-4 py-3'>
        <Skeleton className='h-5 w-36' />
        <Skeleton className='h-8 w-40' />
      </div>
      <div className='grid grid-cols-7'>
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className='min-h-24 border-b border-e p-2 [&:nth-child(7n)]:border-e-0'>
            <Skeleton className='mb-2 size-5 rounded-full' />
            {i % 4 === 1 && <Skeleton className='h-4 w-full' />}
            {i % 6 === 2 && <Skeleton className='mt-1 h-4 w-3/4' />}
          </div>
        ))}
      </div>
    </Card>
  )
}
