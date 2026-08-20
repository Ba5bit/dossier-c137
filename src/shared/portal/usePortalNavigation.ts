import { useCallback, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { PortalContext } from './PortalContext'
import { playPortalSound } from './portalSound'
import { usePortalEnabled } from '../settings/useReducedMotion'
import { useSettings } from '../settings/useSettings'
import type { PortalVariant } from './usePortalMachine'

/**
 * Navigation happens immediately in every case; the portal is an overlay on
 * top of it, not a gate in front of it. That is also why browser back never
 * plays one — it never comes through here.
 */
export function usePortalNavigation() {
  const navigate = useNavigate()
  const portal = useContext(PortalContext)
  const enabled = usePortalEnabled()
  const { settings } = useSettings()

  return useCallback(
    (to: string, variant: PortalVariant = 'full') => {
      if (portal && enabled) {
        portal.open(variant)
        playPortalSound(settings.portalSfx)
      }
      navigate(to)
    },
    [navigate, portal, enabled, settings.portalSfx],
  )
}
