import { COPY } from '../lore/copy'

type PaginationProps = {
  page: number
  pageCount: number
  onChange: (page: number) => void
}

// FINDING-006: at 40% opacity the disabled edge of the range was invisible
// against the surface, so the control read as missing rather than as spent.
const BUTTON =
  'border border-line px-3 py-2 font-mono text-xs text-fg transition-colors ' +
  'hover:border-accent hover:text-accent disabled:cursor-not-allowed ' +
  'disabled:border-line disabled:bg-surface disabled:text-muted ' +
  'disabled:hover:border-line disabled:hover:text-muted'

export function Pagination({ page, pageCount, onChange }: PaginationProps) {
  if (pageCount <= 1) return null

  return (
    <nav
      aria-label={COPY.pagination.label}
      className="flex flex-wrap items-center justify-center gap-2 py-6 sm:gap-4"
    >
      <button
        type="button"
        aria-label={COPY.pagination.previous}
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className={BUTTON}
      >
        {COPY.pagination.previousText}
      </button>

      <span className="font-mono text-xs text-muted">
        {COPY.pagination.position(page, pageCount)}
      </span>

      <button
        type="button"
        aria-label={COPY.pagination.next}
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
        className={BUTTON}
      >
        {COPY.pagination.nextText}
      </button>
    </nav>
  )
}
