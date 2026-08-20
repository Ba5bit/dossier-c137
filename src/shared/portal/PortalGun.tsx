import { PortalCanvas } from './PortalCanvas'

/**
 * The hub's central object. It draws the same vortex the transition overlay
 * uses, at rest — the archive's one permitted piece of visual drama. It is
 * decoration only: settings live behind the gun in the header, and a second
 * way in competed with the search box for the first click on the page.
 */
export function PortalGun() {
  return (
    <div className="flex justify-center">
      <div className="portal-idle">
        <PortalCanvas size={220} />
      </div>
    </div>
  )
}
