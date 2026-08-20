import { useEffect, useRef } from 'react'

/** Spec section 11.3. Typed anywhere, including inside an input. */
export const KONAMI_PHRASE = 'wubbalubbadubdub'

/**
 * A rolling buffer rather than an index: a false start costs nothing, because
 * only the last N characters are ever compared. Non-printing keys are ignored
 * so Shift and the arrows do not break a run.
 */
export function useKonami(onMatch: () => void): void {
  const buffer = useRef('')

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.length !== 1) return

      buffer.current = (buffer.current + event.key.toLowerCase()).slice(
        -KONAMI_PHRASE.length,
      )

      if (buffer.current === KONAMI_PHRASE) {
        buffer.current = ''
        onMatch()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onMatch])
}
