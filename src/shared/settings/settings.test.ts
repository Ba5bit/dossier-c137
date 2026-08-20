import { describe, it, expect } from 'vitest'
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  parseSettings,
  serializeSettings,
} from './settings'

describe('parseSettings', () => {
  it('falls back to the defaults when nothing is stored', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS)
  })

  it('falls back to the defaults on unparseable JSON', () => {
    expect(parseSettings('{not json')).toEqual(DEFAULT_SETTINGS)
  })

  it('falls back to the defaults when the payload is not an object', () => {
    expect(parseSettings('42')).toEqual(DEFAULT_SETTINGS)
  })

  it('reads a complete stored object', () => {
    const stored = {
      dimension: 'citadel',
      portalSfx: true,
      portalTransitions: false,
      reducedMotion: 'on',
    }

    expect(parseSettings(JSON.stringify(stored))).toEqual(stored)
  })

  it('replaces an unknown dimension without discarding the rest', () => {
    const stored = {
      dimension: 'froopyland',
      portalSfx: true,
      portalTransitions: false,
      reducedMotion: 'off',
    }

    expect(parseSettings(JSON.stringify(stored))).toEqual({
      dimension: 'c-137',
      portalSfx: true,
      portalTransitions: false,
      reducedMotion: 'off',
    })
  })

  it('round-trips through serializeSettings', () => {
    const settings = {
      dimension: 'cronenberg' as const,
      portalSfx: true,
      portalTransitions: true,
      reducedMotion: 'auto' as const,
    }

    expect(parseSettings(serializeSettings(settings))).toEqual(settings)
  })
})

describe('SETTINGS_KEY', () => {
  it('is the key the pre-paint script in index.html reads', () => {
    expect(SETTINGS_KEY).toBe('citadel-settings')
  })
})
