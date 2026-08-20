import { useEffect, useRef, useState } from 'react'
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
  const previous = useRef(settings.dimension)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (previous.current === settings.dimension) return
    previous.current = settings.dimension
    if (reducedMotion) return

    setPlaying(true)
    const timer = setTimeout(() => setPlaying(false), WAVE_MS)
    return () => clearTimeout(timer)
  }, [settings.dimension, reducedMotion])

  if (!playing) return null

  return (
    <div
      data-testid="dimension-wave"
      aria-hidden="true"
      className="dimension-wave pointer-events-none fixed inset-0 z-40 bg-accent/20"
    />
  )
}
