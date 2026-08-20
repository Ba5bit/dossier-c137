import { useEffect, useState } from 'react'
import { useSettings } from './useSettings'
import { useReducedMotion } from './useReducedMotion'

const WAVE_MS = 250

/**
 * Switching dimensions repaints instantly — every colour is a custom property,
 * so flipping the attribute is the change. This is the decorative half: a
 * tinted disc expanding from the settings panel, so the repaint reads as an
 * event rather than as a glitch.
 */
export function DimensionWave() {
  const { settings } = useSettings()
  const reducedMotion = useReducedMotion()
  const [previousDimension, setPreviousDimension] = useState(settings.dimension)
  // Zero means nothing is playing; any other value identifies the current run,
  // so a second switch mid-wave restarts the timer rather than being swallowed.
  const [wave, setWave] = useState(0)

  // Adjusted during render, which is React's own answer to "react to a changed
  // value" — an effect that calls setState synchronously cascades renders.
  if (previousDimension !== settings.dimension) {
    setPreviousDimension(settings.dimension)
    if (!reducedMotion) setWave((current) => current + 1)
  }

  useEffect(() => {
    if (wave === 0) return

    const timer = setTimeout(() => setWave(0), WAVE_MS)
    return () => clearTimeout(timer)
  }, [wave])

  if (wave === 0) return null

  return (
    <div
      data-testid="dimension-wave"
      aria-hidden="true"
      className="dimension-wave pointer-events-none fixed inset-0 z-40 bg-accent/20"
    />
  )
}
