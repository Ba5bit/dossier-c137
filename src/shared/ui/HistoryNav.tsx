import { useLocation, useNavigate } from 'react-router-dom'
import { COPY } from '../lore/copy'

const BUTTON =
  'tap-target border border-line px-3 py-1 font-mono text-xs text-muted ' +
  'transition-colors hover:border-accent hover:text-accent'

/**
 * Deep links, portal jumps and source cards all move sideways through the
 * archive, and the browser chrome is the only thing that used to move back.
 * This is the in-page equivalent, plus a trail saying where the visitor is.
 */
function trailOf(pathname: string): string {
  const [section, id] = pathname.split('/').filter(Boolean)
  if (!section) return ''
  const head = section.toUpperCase()
  return id ? `${head} / #${id}` : head
}

export function HistoryNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  if (pathname === '/') return null

  function goBack() {
    // A fresh tab opened straight onto a dossier has nothing behind it, and
    // sending the visitor out of the site is not "back".
    const index = (window.history.state as { idx?: number } | null)?.idx
    if (typeof index === 'number' && index <= 0) {
      navigate('/')
      return
    }
    navigate(-1)
  }

  return (
    <div className="border-b border-line bg-bg">
      <nav
        aria-label="History"
        className="mx-auto flex max-w-[1280px] items-center gap-2 px-4 py-2 sm:px-6"
      >
        <button
          type="button"
          aria-label={COPY.layout.backLabel}
          onClick={goBack}
          className={BUTTON}
        >
          {COPY.layout.back}
        </button>
        <button
          type="button"
          aria-label={COPY.layout.forwardLabel}
          onClick={() => navigate(1)}
          className={BUTTON}
        >
          {COPY.layout.forward}
        </button>

        <span className="ml-auto truncate font-mono text-xs tracking-widest text-muted">
          {trailOf(pathname)}
        </span>
      </nav>
    </div>
  )
}
