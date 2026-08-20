import { useEffect, useState } from 'react'
import { useSettings } from './useSettings'

const REDUCE_QUERY = '(prefers-reduced-motion: reduce)'

function systemPrefersReduce(): boolean {
  if (typeof matchMedia !== 'function') return false
  return matchMedia(REDUCE_QUERY).matches
}

/**
 * AUTO reads the system preference; ON and OFF are a deliberate override in
 * either direction, which is what spec section 11.5 asks the three-state
 * control to mean.
 */
export function useReducedMotion(): boolean {
  const { settings } = useSettings()
  const [systemReduce, setSystemReduce] = useState(systemPrefersReduce)

  useEffect(() => {
    if (typeof matchMedia !== 'function') return

    const media = matchMedia(REDUCE_QUERY)
    const update = () => setSystemReduce(media.matches)

    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  if (settings.reducedMotion === 'on') return true
  if (settings.reducedMotion === 'off') return false
  return systemReduce
}

export function usePortalEnabled(): boolean {
  const { settings } = useSettings()
  const reducedMotion = useReducedMotion()
  return settings.portalTransitions && !reducedMotion
}
