import { useUrlFilters } from '../shared/hooks/useUrlFilters'
import { useCharacters } from '../features/characters/useCharacters'
import { CharacterFilters } from '../features/characters/CharacterFilters'
import { CharacterGrid } from '../features/characters/CharacterGrid'
import { Pagination } from '../shared/ui/Pagination'

export function CharactersPage() {
  const { filters, setFilter, clearFilters } = useUrlFilters()
  const { data, isPending, isError, refetch } = useCharacters(filters)

  return (
    <main className="mx-auto max-w-[1280px] space-y-6 px-6 py-10">
      <header className="space-y-1">
        <p className="font-mono text-xs text-muted">
          DOSSIER C-137 // CLEARANCE: UNRESTRICTED
        </p>
        <h1 className="text-fg text-3xl font-bold">Characters</h1>
      </header>

      <CharacterFilters
        filters={filters}
        onChange={setFilter}
        onClear={clearFilters}
      />

      <CharacterGrid
        characters={data?.items ?? []}
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
