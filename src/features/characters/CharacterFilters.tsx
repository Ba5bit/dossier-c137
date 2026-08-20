import { useCallback, useEffect, useRef, useState } from 'react'
import type { CharacterFilters as Filters } from '../../shared/api/types'
import type { FilterSetter } from '../../shared/hooks/useUrlFilters'

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

const LABEL = 'font-mono text-xs text-muted'

// Long enough that a burst of typing produces one navigation, short enough
// that the grid still feels like it reacts to the keyboard.
export const FILTER_DEBOUNCE_MS = 300

type TextFilterProps = {
  id: string
  label: string
  placeholder: string
  value: string | undefined
  width: string
  onCommit: (value: string | undefined) => void
}

/**
 * A text filter keeps its own draft and pushes it upward on a debounce.
 *
 * Binding the input straight to the URL loses keystrokes: the round trip
 * through the router is asynchronous, so React restores the stale value into
 * the DOM while the next character is already being typed.
 */
function TextFilter({
  id,
  label,
  placeholder,
  value,
  width,
  onCommit,
}: TextFilterProps) {
  const external = value ?? ''
  const [draft, setDraft] = useState(external)
  const committed = useRef(external)

  useEffect(() => {
    // Ignore the echo of our own commit; adopt anything else — the clear
    // button, the back button, a pasted URL.
    if (external === committed.current) return
    committed.current = external
    setDraft(external)
  }, [external])

  useEffect(() => {
    if (draft === committed.current) return

    const timer = setTimeout(() => {
      committed.current = draft
      onCommit(draft || undefined)
    }, FILTER_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [draft, onCommit])

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={draft}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        className={`${FIELD} ${width}`}
      />
    </div>
  )
}

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
    <div className="flex flex-wrap items-end gap-4 border border-line bg-surface p-4">
      <TextFilter
        id="filter-name"
        label="Search by name"
        placeholder="ENTER DESIGNATION"
        value={filters.name}
        width="w-56"
        onCommit={commitName}
      />

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

      <TextFilter
        id="filter-species"
        label="Species"
        placeholder="ANY"
        value={filters.species}
        width="w-40"
        onCommit={commitSpecies}
      />

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
