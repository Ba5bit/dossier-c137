import { PortalCanvas } from './PortalCanvas'
import type { PortalPhase, PortalVariant } from './usePortalMachine'

type PortalOverlayProps = {
  phase: PortalPhase
  variant: PortalVariant
  quote: string | null
}

export function PortalOverlay({ phase, variant, quote }: PortalOverlayProps) {
  if (phase === 'idle') return null

  return (
    <div
      data-testid="portal-overlay"
      data-phase={phase}
      data-variant={variant}
      aria-hidden="true"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg/90"
    >
      <div className="portal-vortex">
        <PortalCanvas size={320} />
      </div>

      {quote && (
        <p
          data-testid="portal-quote"
          className="portal-quote mt-8 max-w-md px-6 text-center font-mono text-xs text-muted"
        >
          {quote}
        </p>
      )}
    </div>
  )
}
