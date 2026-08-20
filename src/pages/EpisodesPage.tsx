import { useUrlFilters } from '../shared/hooks/useUrlFilters'
import { useEpisodes } from '../features/episodes/useEpisodes'
import {
  EpisodeFilters,
  EPISODE_FILTER_KEYS,
} from '../features/episodes/EpisodeFilters'
import { EpisodeGrid } from '../features/episodes/EpisodeGrid'
import { Pagination } from '../shared/ui/Pagination'
import { COPY } from '../shared/lore/copy'

export function EpisodesPage() {
  const { filters, setFilter, clearFilters } = useUrlFilters(EPISODE_FILTER_KEYS)
  const { data, isPending, isError, refetch } = useEpisodes(filters)

  return (
    <main className="mx-auto max-w-[1280px] space-y-6 px-6 py-10">
      <header className="space-y-1">
        <p className="font-mono text-xs text-muted">
          {COPY.clearanceStamp}
        </p>
        <h1 className="text-fg text-3xl font-bold">{COPY.sections.episodesHeading}</h1>
      </header>

      <EpisodeFilters
        filters={filters}
        onChange={setFilter}
        onClear={clearFilters}
      />

      <EpisodeGrid
        episodes={data?.items ?? []}
        isPending={isPending}
        isError={isError}
        onRetry={() => refetch()}
      />

      <Pagination
        page={data?.pagination.page ?? 1}
        pageCount={data?.pagination.pageCount ?? 0}
        onChange={(page) => setFilter('page', String(page))}
      />
    </main>
  )
}
