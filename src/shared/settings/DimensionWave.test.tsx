import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsProvider } from './SettingsProvider'
import { DimensionWave } from './DimensionWave'
import { useSettings } from './useSettings'
import { DEFAULT_SETTINGS, SETTINGS_KEY } from './settings'

function Switcher() {
  const { setSetting } = useSettings()
  return <button onClick={() => setSetting('dimension', 'citadel')}>switch</button>
}

function renderWave(reducedMotion: 'auto' | 'on' = 'auto') {
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ ...DEFAULT_SETTINGS, reducedMotion }),
  )

  return render(
    <SettingsProvider>
      <Switcher />
      <DimensionWave />
    </SettingsProvider>,
  )
}

beforeEach(() => localStorage.clear())

describe('DimensionWave', () => {
  it('renders nothing until a dimension actually changes', () => {
    renderWave()
    expect(screen.queryByTestId('dimension-wave')).not.toBeInTheDocument()
  })

  it('plays when the dimension changes', async () => {
    renderWave()

    await userEvent.click(screen.getByText('switch'))

    expect(screen.getByTestId('dimension-wave')).toBeInTheDocument()
  })

  it('stays silent under reduced motion', async () => {
    renderWave('on')

    await userEvent.click(screen.getByText('switch'))

    expect(screen.queryByTestId('dimension-wave')).not.toBeInTheDocument()
  })
})
