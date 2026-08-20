import type { CharacterFilters as Filters } from '../../shared/api/types'
import type { FilterKey } from '../../shared/hooks/useUrlFilters'

type CharacterFiltersProps = {
  filters: Filters
  onChange: (key: FilterKey, value: string | undefined) => void
  onClear: () => void
}

const STATUSES = ['alive', 'dead', 'unknown']
const GENDERS = ['female', 'male', 'genderless', 'unknown']

const FIELD =
  'border border-line bg-surface px-3 py-2 font-mono text-xs text-fg ' +
  'outline-none focus:border-accent'

const LABEL = 'font-mono text-xs text-muted'

export function CharacterFilters({
  filters,
  onChange,
  onClear,
}: CharacterFiltersProps) {
  // Page is navigation, not filtering — it must not light up the clear control.
  const hasActiveFilter = Boolean(
    filters.name || filters.status || filters.species || filters.gender,
  )

  return (
    <div className="flex flex-wrap items-end gap-4 border border-line bg-surface p-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="filter-name" className={LABEL}>
          Search by name
        </label>
        <input
          id="filter-name"
          type="text"
          value={filters.name ?? ''}
          placeholder="ENTER DESIGNATION"
          onChange={(event) =>
            onChange('name', event.target.value || undefined)
          }
          className={`${FIELD} w-56`}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="filter-status" className={LABEL}>
          Status
        </label>
        <select
          id="filter-status"
          value={filters.status ?? ''}
          onChange={(event) =>
            onChange('status', event.target.value || undefined)
          }
          className={FIELD}
        >
          <option value="">ANY</option>
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {value.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="filter-species" className={LABEL}>
          Species
        </label>
        <input
          id="filter-species"
          type="text"
          value={filters.species ?? ''}
          placeholder="ANY"
          onChange={(event) =>
            onChange('species', event.target.value || undefined)
          }
          className={`${FIELD} w-40`}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="filter-gender" className={LABEL}>
          Gender
        </label>
        <select
          id="filter-gender"
          value={filters.gender ?? ''}
          onChange={(event) =>
            onChange('gender', event.target.value || undefined)
          }
          className={FIELD}
        >
          <option value="">ANY</option>
          {GENDERS.map((value) => (
            <option key={value} value={value}>
              {value.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

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
