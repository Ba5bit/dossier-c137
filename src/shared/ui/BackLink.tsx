import { useNavigate } from 'react-router-dom'
import { COPY } from '../lore/copy'

/**
 * Deep links, portal jumps and source cards all land the visitor mid-archive
 * with nothing on the page pointing back out. This used to be a bar of its
 * own above the content; it sits in the dossier's own stamp line instead, so
 * a detail page carries one row of chrome rather than two.
 */
export function BackLink() {
  const navigate = useNavigate()

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
    <button
      type="button"
      aria-label={COPY.layout.backLabel}
      onClick={goBack}
      className="tap-target -ml-1 px-1 font-mono text-xs tracking-widest text-muted transition-colors hover:text-accent"
    >
      {COPY.layout.back}
    </button>
  )
}
