import { useEffect } from 'react'
import { PortalSearch } from './PortalSearch'
import { COPY } from '../../shared/lore/copy'

type SearchOverlayProps = {
  onClose: () => void
}

export function SearchOverlay({ onClose }: SearchOverlayProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={COPY.search.overlayLabel}
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24"
    >
      <div
        data-testid="search-backdrop"
        onClick={onClose}
        className="absolute inset-0 bg-bg/85 backdrop-blur-sm"
      />
      {/* The box used to float on a translucent scrim, so the page's own
          headline read straight through the hint underneath it. Everything
          the dialog owns now sits on an opaque panel of its own. */}
      <div className="relative w-full max-w-[640px] px-4 sm:px-6">
        <div className="border border-line bg-raised p-4 shadow-2xl sm:p-6">
          <PortalSearch
            autoFocus
            onNavigate={onClose}
            inputId="overlay-search"
          />
          <p className="mt-3 font-mono text-xs text-muted">{COPY.search.hint}</p>
        </div>
      </div>
    </div>
  )
}
