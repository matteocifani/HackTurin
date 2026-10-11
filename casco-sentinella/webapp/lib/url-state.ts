'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'

/**
 * The URL as the state of a list: filters, search, sort and view live in the query string, so a
 * view can be shared and survives a refresh. `set` replaces the entry (no history spam) and keeps
 * the scroll position.
 */
export function useUrlState() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const params = useMemo(() => new URLSearchParams(searchParams.toString()), [searchParams])

  const setMany = useCallback(
    (changes: Record<string, string | string[] | null | undefined>) => {
      const next = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(changes)) {
        const serialized = Array.isArray(value) ? value.join(',') : value
        if (serialized === null || serialized === undefined || serialized === '') next.delete(key)
        else next.set(key, serialized)
      }
      const query = next.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const set = useCallback(
    (key: string, value: string | string[] | null | undefined) => setMany({ [key]: value }),
    [setMany]
  )

  const getList = useCallback((key: string) => (params.get(key) ?? '').split(',').filter(Boolean), [params])

  const toggleInList = useCallback(
    (key: string, value: string) => {
      const list = getList(key)
      set(key, list.includes(value) ? list.filter(item => item !== value) : [...list, value])
    },
    [getList, set]
  )

  return { params, get: (key: string) => params.get(key), getList, set, setMany, toggleInList }
}
