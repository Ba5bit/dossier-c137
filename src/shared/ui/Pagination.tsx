type PaginationProps = {
  page: number
  pageCount: number
  onChange: (page: number) => void
}

const BUTTON =
  'border border-line px-3 py-2 font-mono text-xs text-fg transition-colors ' +
  'hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 ' +
  'disabled:hover:border-line disabled:hover:text-fg'

export function Pagination({ page, pageCount, onChange }: PaginationProps) {
  if (pageCount <= 1) return null

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-center gap-4 py-6"
    >
      <button
        type="button"
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className={BUTTON}
      >
        &larr; JUMP
      </button>

      <span className="font-mono text-xs text-muted">
        DIMENSION {page} / {pageCount}
      </span>

      <button
        type="button"
        aria-label="Next page"
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
        className={BUTTON}
      >
        JUMP &rarr;
      </button>
    </nav>
  )
}
