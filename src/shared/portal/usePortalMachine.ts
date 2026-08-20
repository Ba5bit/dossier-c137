import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CEILING_MS,
  COLLAPSING_MS,
  FIRING_MS,
  FIRING_SHORT_MS,
  QUOTE_AFTER_MS,
  TRAVERSING_MIN_MS,
} from './portalTimings'

export type PortalPhase = 'idle' | 'firing' | 'traversing' | 'collapsing'
export type PortalVariant = 'full' | 'short'

function inFlight(phase: PortalPhase): boolean {
  return phase === 'firing' || phase === 'traversing'
}

/**
 * The transition is not a fixed animation laid over a wait: `traversing`
 * lasts exactly as long as the request, subject to a floor and a ceiling.
 */
export function usePortalMachine(now: () => number = Date.now) {
  const [phase, setPhase] = useState<PortalPhase>('idle')
  const [variant, setVariant] = useState<PortalVariant>('full')
  const [arrived, setArrived] = useState(false)
  const [showQuote, setShowQuote] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const [run, setRun] = useState(0)

  const traverseStartRef = useRef(0)
  const phaseRef = useRef<PortalPhase>('idle')

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  const open = useCallback((nextVariant: PortalVariant = 'full') => {
    setVariant(nextVariant)
    setArrived(false)
    setShowQuote(false)
    setTimedOut(false)
    setPhase('firing')
    setRun((current) => current + 1)
  }, [])

  const arrive = useCallback(() => setArrived(true), [])

  // firing -> traversing
  useEffect(() => {
    if (phase !== 'firing') return

    const duration = variant === 'short' ? FIRING_SHORT_MS : FIRING_MS
    const timer = setTimeout(() => {
      traverseStartRef.current = now()
      setPhase('traversing')
    }, duration)

    return () => clearTimeout(timer)
  }, [phase, variant, now])

  // traversing -> collapsing, never before the floor
  useEffect(() => {
    if (phase !== 'traversing' || !arrived) return

    const elapsed = now() - traverseStartRef.current
    const remaining = Math.max(0, TRAVERSING_MIN_MS - elapsed)
    const timer = setTimeout(() => setPhase('collapsing'), remaining)

    return () => clearTimeout(timer)
  }, [phase, arrived, now])

  // collapsing -> idle
  useEffect(() => {
    if (phase !== 'collapsing') return

    const timer = setTimeout(() => {
      setPhase('idle')
      setShowQuote(false)
      setArrived(false)
    }, COLLAPSING_MS)

    return () => clearTimeout(timer)
  }, [phase])

  // The quote and the ceiling are both measured from the shot rather than
  // from the current phase, so they hang off the run counter. An effect keyed
  // on the phase would restart both every time the phase advanced.
  useEffect(() => {
    if (run === 0) return

    const quoteTimer = setTimeout(() => {
      if (inFlight(phaseRef.current)) setShowQuote(true)
    }, QUOTE_AFTER_MS)

    const ceilingTimer = setTimeout(() => {
      if (!inFlight(phaseRef.current)) return
      // An endlessly spinning vortex reads as a frozen application.
      setTimedOut(true)
      setPhase('idle')
      setShowQuote(false)
      setArrived(false)
    }, CEILING_MS)

    return () => {
      clearTimeout(quoteTimer)
      clearTimeout(ceilingTimer)
    }
  }, [run])

  return { phase, variant, showQuote, timedOut, open, arrive }
}
