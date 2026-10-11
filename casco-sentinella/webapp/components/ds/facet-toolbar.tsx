/** DataToolbar wired to MegaFilter: one "Filtri" trigger, one panel, summary of active filters. Part of the IAMAimpresa design system. */
'use client'

import type { ReactNode } from 'react'

import DataToolbar from '@/components/ds/data-toolbar'
import { MegaFilter, type FacetSpec, type MegaFilterSort } from '@/components/ds/mega-filter'

export type { FacetSpec } from '@/components/ds/mega-filter'

type FacetToolbarProps = {
  search?: { placeholder: string; value: string; onChange: (value: string) => void }
  facets: FacetSpec[]

  resultCount?: number

  activeCount: number
  onClearAll: () => void

  extraFilters?: ReactNode

  extraSummary?: string[]

  actions?: ReactNode

  sort?: MegaFilterSort

  sortDesktop?: ReactNode

  rowExtra?: ReactNode

  sheetExtra?: ReactNode

  ricercaAIcona?: boolean
}

export function FacetToolbar({
  search,
  facets,
  resultCount,
  onClearAll,
  extraFilters,
  extraSummary,
  actions,
  sort,
  sortDesktop,
  rowExtra,
  sheetExtra,
  ricercaAIcona,
}: FacetToolbarProps) {
  return (
    <DataToolbar
      search={search}
      ricercaAIcona={ricercaAIcona}
      filtersSelfContained

      filters={testo => (
        <>
          {rowExtra && <div className='flex items-center gap-2 max-md:hidden'>{rowExtra}</div>}
          <MegaFilter
            searchValue={testo}
            facets={facets}
            resultCount={resultCount}
            onClearAll={onClearAll}
            extraFilters={extraFilters}
            extraSummary={extraSummary}
            sort={sort}
            sheetExtra={sheetExtra}
          />
          {sortDesktop}
        </>
      )}
      actions={actions}
    />
  )
}
