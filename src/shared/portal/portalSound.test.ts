import { describe, it, expect, afterEach, vi } from 'vitest'
import { playPortalSound } from './portalSound'

function stubAudio() {
  const oscillator = {
    type: '',
    frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }
  const gain = {
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
  }
  // A real class rather than vi.fn: a Vitest 4 mock function is not
  // constructible, and the code under test calls `new AudioContext()`.
  const constructor = vi.fn()
  class FakeAudioContext {
    currentTime = 0
    destination = {}
    constructor() {
      constructor()
    }
    createOscillator() {
      return oscillator
    }
    createGain() {
      return gain
    }
  }

  vi.stubGlobal('AudioContext', FakeAudioContext)
  return { constructor, oscillator }
}

afterEach(() => vi.unstubAllGlobals())

describe('playPortalSound', () => {
  it('stays silent when the setting is off', () => {
    const { constructor } = stubAudio()

    expect(playPortalSound(false)).toBe(false)
    expect(constructor).not.toHaveBeenCalled()
  })

  it('makes a noise when the setting is on', () => {
    const { constructor, oscillator } = stubAudio()

    expect(playPortalSound(true)).toBe(true)
    expect(constructor).toHaveBeenCalledOnce()
    expect(oscillator.start).toHaveBeenCalledOnce()
  })

  it('gives up quietly where there is no audio API', () => {
    vi.stubGlobal('AudioContext', undefined)
    vi.stubGlobal('webkitAudioContext', undefined)

    expect(playPortalSound(true)).toBe(false)
  })
})
