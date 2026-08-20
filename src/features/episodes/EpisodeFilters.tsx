import { useCallback } from 'react'
import { TextFilter } from '../../shared/ui/TextFilter'
import type { EpisodeFilters as Filters } from '../../shared/api/types'
import type { FilterSetter } from '../../shared/hooks/useUrlFilters'

export const EPISODE_FILTER_KEYS = ['name', 'episode'] as const
export type EpisodeFilterKey = (typeof EPISODE_FILTER_KEYS)[number]

type EpisodeFiltersProps = {
  filters: Filters
  onChange: FilterSetter<EpisodeFilterKey>
  onClear: () => void
}

export function EpisodeFilters({
  filters,
  onChange,
  onClear,
}: EpisodeFiltersProps) {
  const hasActiveFilter = Boolean(filters.name || filters.episode)

  const commitName = useCallback(
    (value: string | undefined) => onChange('name', value),
    [onChange],
  )
  const commitEpisode = useCallback(
    (value: string | undefined) => onChange('episode', value),
    [onChange],
  )

  return (
    <div className="flex flex-wrap items-end gap-4 border border-line bg-surface p-4">
      <TextFilter
        id="filter-episode-name"
        label="Search by name"
        placeholder="ENTER TITLE"
        value={filters.name}
        width="w-56"
        onCommit={commitName}
      />
      <TextFilter
        id="filter-episode-code"
        label="Season or episode code"
        placeholder="S01 OR S01E01"
        value={filters.episode}
        width="w-40"
        onCommit={commitEpisode}
      />

      {hasActiveFilter && (
        <button
          type="button"
          onClick={onClear}
          className="border border-line px-3 py-2 font-mono text-xs text-muted transition-colors hover:border-accent hover:text-accent"
        >
          CLEAR
        </button>
      )}
    </div>
  )
}
