import { useEffect, useMemo, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { PortalLink } from '../../shared/portal/PortalLink'
import { usePortalNavigation } from '../../shared/portal/usePortalNavigation'
import { useSearch, SEARCH_MIN } from './useSearch'
import { isQuestion } from './question'
import { COPY } from '../../shared/lore/copy'
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
  /** Seeds the box, so a query carried in the URL can be refined rather than retyped. */
  initialDraft?: string
  /**
   * The search page renders the full result groups itself, so the box there is
   * an input and nothing else — a dropdown of the same names above them is
   * two answers to one question.
   */
  suggestions?: boolean
  /** Two of these can be on the page at once; they must not share a name. */
  label?: string
  /** Two of these can be on the page at once; they must not share an id. */
  inputId?: string
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
  placeholder = COPY.search.placeholder,
  initialDraft = '',
  suggestions = true,
  label = COPY.search.label,
  inputId = 'portal-search',
}: PortalSearchProps) {
  const [draft, setDraft] = useState(initialDraft)
  // Committed starts seeded as well: a draft that arrived with the page has
  // nothing to debounce, and waiting 300 ms to show its own results is a
  // flicker with no purpose.
  const [committed, setCommitted] = useState(initialDraft)
  const [highlight, setHighlight] = useState(-1)
  const navigateThroughPortal = usePortalNavigation()

  // The draft is local and the request is debounced, for the same reason
  // TextFilter does it: one keystroke per request drops characters.
  useEffect(() => {
    const timer = setTimeout(() => setCommitted(draft), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [draft])

  const { data, isFetching } = useSearch(committed)
  const allRows = useMemo(() => rowsFrom(data), [data])
  const rows = suggestions ? allRows : []

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

  const tooShort =
    suggestions && draft.trim().length > 0 && draft.trim().length < SEARCH_MIN
  const empty =
    suggestions &&
    committed.trim().length >= SEARCH_MIN &&
    !isFetching &&
    rows.length === 0

  return (
    <div className="w-full">
      {/* FINDING-009: the placeholder was the only prompt, and it left the
          moment the visitor typed. The label stays. */}
      <label
        htmlFor={inputId}
        className="mb-2 block font-mono text-xs tracking-widest text-muted"
      >
        {label}
      </label>

      <div className="flex gap-2">
        <input
          id={inputId}
          type="search"
          value={draft}
          autoFocus={autoFocus}
          placeholder={placeholder}
          onChange={(event) => {
            setDraft(event.target.value)
            setHighlight(-1)
          }}
          onKeyDown={onKeyDown}
          className="text-fg placeholder:text-muted w-full min-w-0 border border-line bg-surface px-4 py-3 font-mono text-sm outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={() => {
            const query = draft.trim()
            if (query === '') return
            go(`/ask?q=${encodeURIComponent(query)}`)
          }}
          className="shrink-0 border border-accent bg-accent/10 px-4 font-mono text-xs tracking-widest text-accent transition-colors hover:bg-accent/20"
        >
          {COPY.search.ask}
        </button>
      </div>

      {tooShort && (
        <p className="mt-2 font-mono text-xs text-muted">
          {COPY.search.tooShort}
        </p>
      )}

      {empty && (
        <p className="mt-2 font-mono text-xs text-muted">
          {COPY.search.nothing}
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
