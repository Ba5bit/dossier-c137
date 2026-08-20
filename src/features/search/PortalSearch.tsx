import { useEffect, useMemo, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { PortalLink } from '../../shared/portal/PortalLink'
import { usePortalNavigation } from '../../shared/portal/usePortalNavigation'
import { useSearch, SEARCH_MIN } from './useSearch'
import { isQuestion } from './question'
import type { SearchResponse } from '../../shared/api/types'

/** Five per group is what fits under the input without scrolling. */
const PER_GROUP = 5

/** Same delay as the list filters: fast enough to feel live, slow enough to be one request. */
const DEBOUNCE_MS = 300

type PortalSearchProps = {
  autoFocus?: boolean
  /** Called after a navigation, so an overlay can close itself. */
  onNavigate?: () => void
  placeholder?: string
}

type Row = {
  to: string
  label: string
  meta: string
}

function rowsFrom(data: SearchResponse | undefined): Row[] {
  if (!data) return []

  return [
    ...data.groups.characters.items.slice(0, PER_GROUP).map((item) => ({
      to: `/characters/${item.id}`,
      label: item.name,
      meta: `CHARACTER · ${item.species}`,
    })),
    ...data.groups.locations.items.slice(0, PER_GROUP).map((item) => ({
      to: `/locations/${item.id}`,
      label: item.name,
      meta: `LOCATION · ${item.type}`,
    })),
    ...data.groups.episodes.items.slice(0, PER_GROUP).map((item) => ({
      to: `/episodes/${item.id}`,
      label: item.name,
      meta: `EPISODE · ${item.episode}`,
    })),
  ]
}

export function PortalSearch({
  autoFocus = false,
  onNavigate,
  placeholder = 'ENTER COORDINATES OR ASK A QUESTION',
}: PortalSearchProps) {
  const [draft, setDraft] = useState('')
  const [committed, setCommitted] = useState('')
  const [highlight, setHighlight] = useState(-1)
  const navigateThroughPortal = usePortalNavigation()

  // The draft is local and the request is debounced, for the same reason
  // TextFilter does it: one keystroke per request drops characters.
  useEffect(() => {
    const timer = setTimeout(() => setCommitted(draft), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [draft])

  const { data, isFetching } = useSearch(committed)
  const rows = useMemo(() => rowsFrom(data), [data])

  function go(to: string) {
    navigateThroughPortal(to, 'short')
    onNavigate?.()
  }

  function submit() {
    const query = draft.trim()
    if (query === '') return

    if (highlight >= 0 && rows[highlight]) {
      go(rows[highlight].to)
      return
    }

    go(
      isQuestion(query)
        ? `/ask?q=${encodeURIComponent(query)}`
        : `/search?q=${encodeURIComponent(query)}`,
    )
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlight((current) => Math.min(current + 1, rows.length - 1))
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlight((current) => Math.max(current - 1, -1))
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      submit()
    }
  }

  const tooShort = draft.trim().length > 0 && draft.trim().length < SEARCH_MIN
  const empty = committed.trim().length >= SEARCH_MIN && !isFetching && rows.length === 0

  return (
    <div className="w-full">
      <div className="flex gap-2">
        <input
          type="search"
          value={draft}
          autoFocus={autoFocus}
          aria-label="Search the archive"
          placeholder={placeholder}
          onChange={(event) => {
            setDraft(event.target.value)
            setHighlight(-1)
          }}
          onKeyDown={onKeyDown}
          className="text-fg placeholder:text-muted w-full border border-line bg-surface px-4 py-3 font-mono text-sm outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={() => {
            const query = draft.trim()
            if (query === '') return
            go(`/ask?q=${encodeURIComponent(query)}`)
          }}
          className="shrink-0 border border-line px-4 font-mono text-xs text-muted transition-colors hover:border-accent hover:text-accent"
        >
          ASK ▸
        </button>
      </div>

      {tooShort && (
        <p className="mt-2 font-mono text-xs text-muted">
          Two characters minimum. The archive is big, not psychic.
        </p>
      )}

      {empty && (
        <p className="mt-2 font-mono text-xs text-muted">
          Nothing on file. Try a different dimension.
        </p>
      )}

      {rows.length > 0 && (
        <ul className="mt-2 border border-line bg-surface">
          {rows.map((row, index) => (
            <li key={row.to}>
              <PortalLink
                to={row.to}
                variant="short"
                onClick={() => onNavigate?.()}
                aria-current={index === highlight ? 'true' : undefined}
                className={`flex items-center justify-between gap-4 border-b border-line px-4 py-2 last:border-b-0 ${
                  index === highlight ? 'bg-raised text-accent' : 'text-fg'
                }`}
              >
                <span className="truncate text-sm">{row.label}</span>
                <span className="shrink-0 font-mono text-xs text-muted">{row.meta}</span>
              </PortalLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
