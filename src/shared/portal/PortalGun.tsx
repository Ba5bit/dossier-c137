import { PortalCanvas } from './PortalCanvas'

type PortalGunProps = {
  onOpenSettings: () => void
}

/**
 * The hub's central object. It draws the same vortex the transition overlay
 * uses, at rest — the archive's one permitted piece of visual drama.
 */
export function PortalGun({ onOpenSettings }: PortalGunProps) {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="portal-idle">
        <PortalCanvas size={280} />
      </div>

      <button
        type="button"
        onClick={onOpenSettings}
        className="border border-line px-4 py-2 font-mono text-xs tracking-widest text-fg transition-colors hover:border-accent hover:text-accent"
      >
        PORTAL GUN SETTINGS
      </button>
    </div>
  )
}
