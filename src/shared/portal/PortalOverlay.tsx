import { PortalCanvas } from './PortalCanvas'
import type { PortalPhase, PortalVariant } from './usePortalMachine'

type PortalOverlayProps = {
  phase: PortalPhase
  variant: PortalVariant
  quote: string | null
}

/**
 * 320px of vortex over a near-opaque scrim took the whole viewport for the
 * length of every navigation, which is a lot of theatre to sit through on the
 * way to a list of episodes. The shot is now a small badge over a light,
 * blurred scrim: the page it is carrying you to stays visible behind it.
 */
export function PortalOverlay({ phase, variant, quote }: PortalOverlayProps) {
  if (phase === 'idle') return null

  return (
    <div
      data-testid="portal-overlay"
      data-phase={phase}
      data-variant={variant}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-bg/45 backdrop-blur-[2px]"
    >
      <div className="portal-vortex">
        <PortalCanvas size={132} />
      </div>

      {quote && (
        <p
          data-testid="portal-quote"
          className="portal-quote max-w-xs border border-line bg-surface px-4 py-2 text-center font-mono text-xs text-muted shadow-lg"
        >
          {quote}
        </p>
      )}
    </div>
  )
}
