import { useCallback, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { PortalContext } from './PortalContext'
import { usePortalEnabled } from '../settings/useReducedMotion'
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

  return useCallback(
    (to: string, variant: PortalVariant = 'full') => {
      if (portal && enabled) portal.open(variant)
      navigate(to)
    },
    [navigate, portal, enabled],
  )
}
