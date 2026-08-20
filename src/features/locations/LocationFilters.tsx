import { useCallback } from 'react'
import { TextFilter } from '../../shared/ui/TextFilter'
import type { LocationFilters as Filters } from '../../shared/api/types'
import type { FilterSetter } from '../../shared/hooks/useUrlFilters'
import { COPY } from '../../shared/lore/copy'

export const LOCATION_FILTER_KEYS = ['name', 'type', 'dimension'] as const
export type LocationFilterKey = (typeof LOCATION_FILTER_KEYS)[number]

type LocationFiltersProps = {
  filters: Filters
  onChange: FilterSetter<LocationFilterKey>
  onClear: () => void
}

export function LocationFilters({
  filters,
  onChange,
  onClear,
}: LocationFiltersProps) {
  const hasActiveFilter = Boolean(filters.name || filters.type || filters.dimension)

  const commitName = useCallback(
    (value: string | undefined) => onChange('name', value),
    [onChange],
  )
  const commitType = useCallback(
    (value: string | undefined) => onChange('type', value),
    [onChange],
  )
  const commitDimension = useCallback(
    (value: string | undefined) => onChange('dimension', value),
    [onChange],
  )

  return (
    <div className="flex flex-wrap items-end gap-4 border border-line bg-surface p-4">
      <TextFilter
        id="filter-location-name"
        label={COPY.filters.name}
        placeholder={COPY.filters.namePlaceholder}
        value={filters.name}
        width="w-56"
        onCommit={commitName}
      />
      <TextFilter
        id="filter-location-type"
        label={COPY.filters.type}
        placeholder={COPY.filters.any}
        value={filters.type}
        width="w-40"
        onCommit={commitType}
      />
      <TextFilter
        id="filter-location-dimension"
        label={COPY.filters.dimension}
        placeholder={COPY.filters.any}
        value={filters.dimension}
        width="w-48"
        onCommit={commitDimension}
      />

      {hasActiveFilter && (
        <button
          type="button"
          onClick={onClear}
          className="border border-line px-3 py-2 font-mono text-xs text-muted transition-colors hover:border-accent hover:text-accent"
        >
          {COPY.filters.clear}
        </button>
      )}
    </div>
  )
}
