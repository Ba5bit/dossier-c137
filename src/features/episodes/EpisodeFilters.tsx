import { useCallback } from 'react'
import { TextFilter } from '../../shared/ui/TextFilter'
import { SEASONS, seasonOf } from './seasons'
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

const CHIP =
  'border px-3 py-2 font-mono text-xs tracking-widest transition-colors'
const CHIP_ON = 'border-accent bg-accent/10 text-accent'
const CHIP_OFF = 'border-line text-muted hover:border-accent hover:text-accent'

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

  // `S01E07` and `S01` both belong to season one, so a typed code lights up
  // the season it came from rather than leaving the row looking unset.
  const activeSeason = filters.episode ? seasonOf(filters.episode) : undefined

  return (
    <div className="space-y-3 border border-line bg-surface p-3 sm:p-4">
      {/* Fifty-one episodes on one paginated list is a lot of arrowing. The
          season is how anyone actually looks for an episode, so it gets a
          row of its own above the text fields. */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs tracking-widest text-muted">
          {COPY.filters.season}
        </span>
        <button
          type="button"
          aria-pressed={activeSeason === undefined}
          onClick={() => onChange('episode', undefined)}
          className={`${CHIP} ${activeSeason === undefined ? CHIP_ON : CHIP_OFF}`}
        >
          {COPY.filters.seasonAll}
        </button>
        {SEASONS.map((season) => (
          <button
            key={season}
            type="button"
            aria-pressed={activeSeason === season}
            onClick={() => onChange('episode', season)}
            className={`${CHIP} ${activeSeason === season ? CHIP_ON : CHIP_OFF}`}
          >
            {season}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3 border-t border-line pt-3 sm:gap-4">
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
    </div>
  )
}
