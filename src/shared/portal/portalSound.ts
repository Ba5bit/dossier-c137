type AudioContextConstructor = new () => AudioContext

function resolveAudioContext(): AudioContextConstructor | null {
  const scope = window as unknown as {
    AudioContext?: AudioContextConstructor
    webkitAudioContext?: AudioContextConstructor
  }
  return scope.AudioContext ?? scope.webkitAudioContext ?? null
}

/**
 * A short falling whoosh, synthesized rather than shipped: one more network
 * asset for two hundred milliseconds of sound is a poor trade. Returns
 * whether anything was actually played, which is what makes it testable.
 */
export function playPortalSound(enabled: boolean): boolean {
  if (!enabled) return false

  const Constructor = resolveAudioContext()
  if (!Constructor) return false

  try {
    const context = new Constructor()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const start = context.currentTime
    const end = start + 0.35

    oscillator.type = 'sawtooth'
    oscillator.frequency.setValueAtTime(680, start)
    oscillator.frequency.exponentialRampToValueAtTime(90, end)

    gain.gain.setValueAtTime(0.08, start)
    gain.gain.exponentialRampToValueAtTime(0.0001, end)

    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    oscillator.stop(end)

    return true
  } catch {
    // An autoplay policy or a missing output device is not worth an error.
    return false
  }
}
