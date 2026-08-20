import { useUrlFilters } from '../shared/hooks/useUrlFilters'
import { useLocations } from '../features/locations/useLocations'
import {
  LocationFilters,
  LOCATION_FILTER_KEYS,
} from '../features/locations/LocationFilters'
import { LocationGrid } from '../features/locations/LocationGrid'
import { Pagination } from '../shared/ui/Pagination'
import { COPY } from '../shared/lore/copy'

export function LocationsPage() {
  const { filters, setFilter, clearFilters } = useUrlFilters(LOCATION_FILTER_KEYS)
  const { data, isPending, isError, refetch } = useLocations(filters)

  return (
    <main className="mx-auto max-w-[1280px] space-y-6 px-4 py-10 sm:px-6">
      <header className="space-y-1">
        <p className="font-mono text-xs text-muted">
          {COPY.clearanceStamp}
        </p>
        <h1 className="text-fg text-3xl font-bold">{COPY.sections.locationsHeading}</h1>
      </header>

      <LocationFilters
        filters={filters}
        onChange={setFilter}
        onClear={clearFilters}
      />

      <LocationGrid
        locations={data?.items ?? []}
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
