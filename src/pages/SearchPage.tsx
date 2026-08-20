import { useSearchParams } from 'react-router-dom'
import { PortalSearch } from '../features/search/PortalSearch'
import { useSearch, SEARCH_MIN } from '../features/search/useSearch'
import { PortalLink } from '../shared/portal/PortalLink'
import { EmptyState } from '../shared/ui/EmptyState'
import { ErrorState } from '../shared/ui/ErrorState'
import { Skeleton } from '../shared/ui/Skeleton'
import { COPY } from '../shared/lore/copy'
import type { SearchResponse } from '../shared/api/types'

type GroupProps = {
  title: string
  section: string
  query: string
  total: number
  rows: { id: number; label: string; meta: string }[]
}

function Group({ title, section, query, total, rows }: GroupProps) {
  if (rows.length === 0) return null

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-mono text-xs tracking-widest text-muted">{title}</h2>
        <span className="font-mono text-xs text-muted">{COPY.search.onFile(total)}</span>
      </div>

      <ul className="border border-line bg-surface">
        {rows.map((row) => (
          <li key={row.id}>
            <PortalLink
              to={`/${section}/${row.id}`}
              variant="short"
              className="text-fg flex items-center justify-between gap-4 border-b border-line px-4 py-3 transition-colors last:border-b-0 hover:border-accent hover:text-accent"
            >
              <span className="truncate text-sm">{row.label}</span>
              <span className="shrink-0 font-mono text-xs text-muted">{row.meta}</span>
            </PortalLink>
          </li>
        ))}
      </ul>

      {/* The list pages already paginate the same name filter, so the rest of
          a large result set lives there rather than in a second paginator. */}
      <PortalLink
        to={`/${section}?name=${encodeURIComponent(query)}`}
        className="inline-block font-mono text-xs text-link underline-offset-4 hover:underline"
      >
        {COPY.search.allOf(total, title)}
      </PortalLink>
    </section>
  )
}

function groupsOf(data: SearchResponse) {
  return {
    characters: data.groups.characters.items.map((item) => ({
      id: item.id,
      label: item.name,
      meta: `${item.species} · ${item.status}`,
    })),
    locations: data.groups.locations.items.map((item) => ({
      id: item.id,
      label: item.name,
      meta: `${item.type} · ${item.dimension}`,
    })),
    episodes: data.groups.episodes.items.map((item) => ({
      id: item.id,
      label: item.name,
      meta: `${item.episode} · ${item.airDate}`,
    })),
  }
}

export function SearchPage() {
  const [params] = useSearchParams()
  const query = params.get('q') ?? ''
  const trimmed = query.trim()
  const { data, isPending, isError, refetch } = useSearch(query)

  // A disabled query reports `pending` forever, so the length check has to
  // come first: below the minimum nothing is on the way and skeletons lie.
  const tooShort = trimmed.length > 0 && trimmed.length < SEARCH_MIN

  const rows = data ? groupsOf(data) : null
  const nothing =
    rows !== null &&
    rows.characters.length === 0 &&
    rows.locations.length === 0 &&
    rows.episodes.length === 0

  return (
    <main className="mx-auto max-w-[1280px] space-y-8 px-4 py-10 sm:px-6">
      <header className="space-y-4">
        <p className="font-mono text-xs tracking-widest text-muted">{COPY.search.pageLabel}</p>
        <PortalSearch
          initialDraft={query}
          suggestions={false}
          inputId="page-search"
        />
      </header>

      {trimmed === '' && (
        <p className="text-muted">
          {COPY.search.pageEmpty}
        </p>
      )}

      {tooShort && (
        <p className="text-muted">
          {COPY.search.tooShort}
        </p>
      )}

      {trimmed !== '' && !tooShort && isError && <ErrorState onRetry={() => refetch()} />}

      {trimmed !== '' && !tooShort && isPending && (
        <div className="space-y-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}

      {rows && nothing && <EmptyState />}

      {rows && !nothing && (
        <div className="space-y-10">
          <Group
            title={COPY.search.groupCharacters}
            section="characters"
            query={query}
            total={data!.groups.characters.total}
            rows={rows.characters}
          />
          <Group
            title={COPY.search.groupLocations}
            section="locations"
            query={query}
            total={data!.groups.locations.total}
            rows={rows.locations}
          />
          <Group
            title={COPY.search.groupEpisodes}
            section="episodes"
            query={query}
            total={data!.groups.episodes.total}
            rows={rows.episodes}
          />
        </div>
      )}
    </main>
  )
}
