import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SettingsProvider } from './SettingsProvider'
import { useReducedMotion, usePortalEnabled } from './useReducedMotion'
import { DEFAULT_SETTINGS, SETTINGS_KEY } from './settings'
import type { Settings } from './settings'

function stubSystemPreference(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }))
}

function Probe() {
  const reduced = useReducedMotion()
  const portalEnabled = usePortalEnabled()

  return (
    <div>
      <span data-testid="reduced">{String(reduced)}</span>
      <span data-testid="portal">{String(portalEnabled)}</span>
    </div>
  )
}

function renderWith(settings: Partial<Settings>) {
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ ...DEFAULT_SETTINGS, ...settings }),
  )

  return render(
    <SettingsProvider>
      <Probe />
    </SettingsProvider>,
  )
}

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

describe('useReducedMotion', () => {
  it('follows the system when set to auto and the system is quiet', () => {
    stubSystemPreference(false)
    renderWith({ reducedMotion: 'auto' })
    expect(screen.getByTestId('reduced')).toHaveTextContent('false')
  })

  it('follows the system when set to auto and the system asks to reduce', () => {
    stubSystemPreference(true)
    renderWith({ reducedMotion: 'auto' })
    expect(screen.getByTestId('reduced')).toHaveTextContent('true')
  })

  it('overrides a quiet system when set to on', () => {
    stubSystemPreference(false)
    renderWith({ reducedMotion: 'on' })
    expect(screen.getByTestId('reduced')).toHaveTextContent('true')
  })

  it('overrides a reducing system when set to off', () => {
    stubSystemPreference(true)
    renderWith({ reducedMotion: 'off' })
    expect(screen.getByTestId('reduced')).toHaveTextContent('false')
  })
})

describe('usePortalEnabled', () => {
  it('is on when transitions are on and motion is not reduced', () => {
    stubSystemPreference(false)
    renderWith({ portalTransitions: true, reducedMotion: 'auto' })
    expect(screen.getByTestId('portal')).toHaveTextContent('true')
  })

  it('is off when the transitions toggle is off', () => {
    stubSystemPreference(false)
    renderWith({ portalTransitions: false, reducedMotion: 'auto' })
    expect(screen.getByTestId('portal')).toHaveTextContent('false')
  })

  it('is off when motion is reduced, whatever the toggle says', () => {
    stubSystemPreference(true)
    renderWith({ portalTransitions: true, reducedMotion: 'auto' })
    expect(screen.getByTestId('portal')).toHaveTextContent('false')
  })
})
