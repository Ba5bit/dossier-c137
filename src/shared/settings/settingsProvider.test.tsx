import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsProvider } from './SettingsProvider'
import { useSettings } from './useSettings'
import { DEFAULT_SETTINGS, SETTINGS_KEY } from './settings'

function Probe() {
  const { settings, setSetting } = useSettings()

  return (
    <div>
      <span data-testid="dimension">{settings.dimension}</span>
      <span data-testid="sfx">{String(settings.portalSfx)}</span>
      <button onClick={() => setSetting('dimension', 'citadel')}>go citadel</button>
      <button onClick={() => setSetting('portalSfx', true)}>sfx on</button>
    </div>
  )
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-dimension')
})

describe('SettingsProvider', () => {
  it('starts from the defaults when nothing is stored', () => {
    render(
      <SettingsProvider>
        <Probe />
      </SettingsProvider>,
    )

    expect(screen.getByTestId('dimension')).toHaveTextContent(
      DEFAULT_SETTINGS.dimension,
    )
    expect(screen.getByTestId('sfx')).toHaveTextContent('false')
  })

  it('reads settings already in localStorage', () => {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ ...DEFAULT_SETTINGS, dimension: 'cronenberg' }),
    )

    render(
      <SettingsProvider>
        <Probe />
      </SettingsProvider>,
    )

    expect(screen.getByTestId('dimension')).toHaveTextContent('cronenberg')
  })

  it('updates a single setting without touching the others', async () => {
    render(
      <SettingsProvider>
        <Probe />
      </SettingsProvider>,
    )

    await userEvent.click(screen.getByText('sfx on'))

    expect(screen.getByTestId('sfx')).toHaveTextContent('true')
    expect(screen.getByTestId('dimension')).toHaveTextContent('c-137')
  })

  it('persists every change under the settings key', async () => {
    render(
      <SettingsProvider>
        <Probe />
      </SettingsProvider>,
    )

    await userEvent.click(screen.getByText('go citadel'))

    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}')
    expect(stored.dimension).toBe('citadel')
  })

  it('writes the dimension onto the document element', async () => {
    render(
      <SettingsProvider>
        <Probe />
      </SettingsProvider>,
    )

    expect(document.documentElement.getAttribute('data-dimension')).toBe('c-137')

    await userEvent.click(screen.getByText('go citadel'))

    expect(document.documentElement.getAttribute('data-dimension')).toBe('citadel')
  })

  it('falls back to inert defaults outside a provider', async () => {
    render(<Probe />)

    expect(screen.getByTestId('dimension')).toHaveTextContent('c-137')

    await userEvent.click(screen.getByText('go citadel'))

    // No provider, nothing to update — and no crash, which is what lets the
    // entity cards be rendered bare in their own tests.
    expect(screen.getByTestId('dimension')).toHaveTextContent('c-137')
  })
})
