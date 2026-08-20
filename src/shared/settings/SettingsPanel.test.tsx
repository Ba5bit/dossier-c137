import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsProvider } from './SettingsProvider'
import { SettingsPanel } from './SettingsPanel'
import { SETTINGS_KEY } from './settings'

function renderPanel(onClose = () => {}) {
  return render(
    <SettingsProvider>
      <SettingsPanel onClose={onClose} />
    </SettingsProvider>,
  )
}

function stored() {
  return JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}')
}

beforeEach(() => localStorage.clear())

describe('SettingsPanel', () => {
  it('presents the four settings the spec names', () => {
    renderPanel()

    expect(screen.getByText('PORTAL GUN SETTINGS')).toBeInTheDocument()
    expect(screen.getByText('DIMENSION')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'PORTAL SFX' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'PORTAL TRANSITIONS' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'REDUCED MOTION' }),
    ).toBeInTheDocument()
  })

  it('marks the active dimension and only that one', () => {
    renderPanel()

    expect(screen.getByRole('radio', { name: 'C-137' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Citadel' })).not.toBeChecked()
  })

  it('switches dimension on selection', async () => {
    renderPanel()

    await userEvent.click(screen.getByRole('radio', { name: 'Cronenberg-1' }))

    expect(screen.getByRole('radio', { name: 'Cronenberg-1' })).toBeChecked()
    expect(stored().dimension).toBe('cronenberg')
  })

  it('turns portal sound on, which is off by default', async () => {
    renderPanel()
    const toggle = screen.getByRole('button', { name: 'PORTAL SFX' })

    expect(toggle).toHaveTextContent('OFF')

    await userEvent.click(toggle)

    expect(toggle).toHaveTextContent('ON')
    expect(stored().portalSfx).toBe(true)
  })

  it('turns portal transitions off, which are on by default', async () => {
    renderPanel()
    const toggle = screen.getByRole('button', { name: 'PORTAL TRANSITIONS' })

    expect(toggle).toHaveTextContent('ON')

    await userEvent.click(toggle)

    expect(toggle).toHaveTextContent('OFF')
    expect(stored().portalTransitions).toBe(false)
  })

  it('cycles reduced motion through its three states', async () => {
    renderPanel()
    const toggle = screen.getByRole('button', { name: 'REDUCED MOTION' })

    expect(toggle).toHaveTextContent('AUTO')

    await userEvent.click(toggle)
    expect(toggle).toHaveTextContent('ON')

    await userEvent.click(toggle)
    expect(toggle).toHaveTextContent('OFF')

    await userEvent.click(toggle)
    expect(toggle).toHaveTextContent('AUTO')
  })

  it('closes on Escape', async () => {
    const onClose = vi.fn()
    renderPanel(onClose)

    await userEvent.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledOnce()
  })
})
