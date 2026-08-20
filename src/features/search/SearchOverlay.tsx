import { useEffect } from 'react'
import { PortalSearch } from './PortalSearch'

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
      aria-label="Search the archive"
      className="fixed inset-0 z-50 flex items-start justify-center pt-24"
    >
      <div
        data-testid="search-backdrop"
        onClick={onClose}
        className="absolute inset-0 bg-black/70"
      />
      <div className="relative w-full max-w-[640px] px-6">
        <PortalSearch autoFocus onNavigate={onClose} />
        <p className="mt-3 text-center font-mono text-xs text-muted">
          ↑ ↓ TO AIM · ENTER TO FIRE · ESC TO ABORT
        </p>
      </div>
    </div>
  )
}
