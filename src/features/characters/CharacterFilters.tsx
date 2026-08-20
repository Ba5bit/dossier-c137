import { useCallback } from 'react'
import { TextFilter } from '../../shared/ui/TextFilter'
import type { CharacterFilters as Filters } from '../../shared/api/types'
import type { FilterSetter } from '../../shared/hooks/useUrlFilters'
import { COPY } from '../../shared/lore/copy'

export const CHARACTER_FILTER_KEYS = ['name', 'status', 'species', 'gender'] as const
export type CharacterFilterKey = (typeof CHARACTER_FILTER_KEYS)[number]

type CharacterFiltersProps = {
  filters: Filters
  onChange: FilterSetter<CharacterFilterKey>
  onClear: () => void
}

const STATUSES = ['alive', 'dead', 'unknown']
const GENDERS = ['female', 'male', 'genderless', 'unknown']

const FIELD =
  'border border-line bg-surface px-3 py-2 font-mono text-xs text-fg ' +
  'outline-none focus:border-accent'

const LABEL = 'font-mono text-xs tracking-widest text-muted'

export function CharacterFilters({
  filters,
  onChange,
  onClear,
}: CharacterFiltersProps) {
  // Page is navigation, not filtering — it must not light up the clear control.
  const hasActiveFilter = Boolean(
    filters.name || filters.status || filters.species || filters.gender,
  )

  const commitName = useCallback(
    (value: string | undefined) => onChange('name', value),
    [onChange],
  )
  const commitSpecies = useCallback(
    (value: string | undefined) => onChange('species', value),
    [onChange],
  )

  return (
    <div className="flex flex-wrap items-end gap-3 border border-line bg-surface p-3 sm:gap-4 sm:p-4">
      <TextFilter
        id="filter-name"
        label={COPY.filters.name}
        placeholder={COPY.filters.namePlaceholder}
        value={filters.name}
        width="w-full sm:w-56"
        onCommit={commitName}
      />

      <div className="flex flex-col gap-1">
        <label htmlFor="filter-status" className={LABEL}>
          {COPY.filters.status}
        </label>
        <select
          id="filter-status"
          value={filters.status ?? ''}
          onChange={(event) =>
            onChange('status', event.target.value || undefined)
          }
          className={FIELD}
        >
          <option value="">{COPY.filters.any}</option>
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {value.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      <TextFilter
        id="filter-species"
        label={COPY.filters.species}
        placeholder={COPY.filters.any}
        value={filters.species}
        width="w-40"
        onCommit={commitSpecies}
      />

      <div className="flex flex-col gap-1">
        <label htmlFor="filter-gender" className={LABEL}>
          {COPY.filters.gender}
        </label>
        <select
          id="filter-gender"
          value={filters.gender ?? ''}
          onChange={(event) =>
            onChange('gender', event.target.value || undefined)
          }
          className={FIELD}
        >
          <option value="">{COPY.filters.any}</option>
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
          {COPY.filters.clear}
        </button>
      )}
    </div>
  )
}
