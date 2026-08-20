import { useCallback } from 'react'
import { TextFilter } from '../../shared/ui/TextFilter'
import type { EpisodeFilters as Filters } from '../../shared/api/types'
import type { FilterSetter } from '../../shared/hooks/useUrlFilters'
import { COPY } from '../../shared/lore/copy'

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
    <div className="flex flex-wrap items-end gap-3 border border-line bg-surface p-3 sm:gap-4 sm:p-4">
      <TextFilter
        id="filter-episode-name"
        label={COPY.filters.name}
        placeholder={COPY.filters.titlePlaceholder}
        value={filters.name}
        width="w-full sm:w-56"
        onCommit={commitName}
      />
      <TextFilter
        id="filter-episode-code"
        label={COPY.filters.code}
        placeholder={COPY.filters.codePlaceholder}
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
          {COPY.filters.clear}
        </button>
      )}
    </div>
  )
}
