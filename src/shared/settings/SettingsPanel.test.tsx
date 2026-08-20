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

/** Every setting but the dimension now lives behind a tab. */
async function openTab(name: string) {
  await userEvent.click(screen.getByRole('tab', { name }))
}

describe('SettingsPanel', () => {
  it('presents one tab per group of settings', async () => {
    renderPanel()

    expect(screen.getByText('PORTAL SETTINGS')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'DIMENSION' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'AI VOICE' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'MOTION' })).toBeInTheDocument()

    // The dimension tab is the one that opens.
    expect(screen.getByRole('radio', { name: 'C-137' })).toBeInTheDocument()

    await openTab('MOTION')
    expect(
      screen.getByRole('button', { name: 'PORTAL TRANSITIONS' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'REDUCED MOTION' }),
    ).toBeInTheDocument()
  })

  it('carries no sound control any more', async () => {
    renderPanel()
    await openTab('MOTION')

    expect(
      screen.queryByRole('button', { name: 'PORTAL SFX' }),
    ).not.toBeInTheDocument()
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

  it('turns portal transitions off, which are on by default', async () => {
    renderPanel()
    await openTab('MOTION')
    const toggle = screen.getByRole('button', { name: 'PORTAL TRANSITIONS' })

    expect(toggle).toHaveTextContent('ON')

    await userEvent.click(toggle)

    expect(toggle).toHaveTextContent('OFF')
    expect(stored().portalTransitions).toBe(false)
  })

  it('cycles reduced motion through its three states', async () => {
    renderPanel()
    await openTab('MOTION')
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

  it('switches the persona', async () => {
    const user = userEvent.setup()
    renderPanel()
    await user.click(screen.getByRole('tab', { name: 'AI VOICE' }))

    await user.click(screen.getByRole('radio', { name: 'Morty' }))

    expect(screen.getByRole('radio', { name: 'Morty' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })
})
