import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PortalProvider } from './PortalProvider'
import { PortalLink } from './PortalLink'
import { SettingsProvider } from '../settings/SettingsProvider'
import { DEFAULT_SETTINGS, SETTINGS_KEY } from '../settings/settings'

function renderLink(options: { portal: boolean; transitions?: boolean }) {
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({
      ...DEFAULT_SETTINGS,
      portalTransitions: options.transitions ?? true,
    }),
  )

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  const tree = (
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route
          path="/"
          element={<PortalLink to="/characters">CHARACTERS</PortalLink>}
        />
        <Route path="/characters" element={<p>character list</p>} />
      </Routes>
    </MemoryRouter>
  )

  return render(
    <QueryClientProvider client={client}>
      <SettingsProvider>
        {options.portal ? <PortalProvider>{tree}</PortalProvider> : tree}
      </SettingsProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => localStorage.clear())
afterEach(() => vi.useRealTimers())

describe('PortalLink', () => {
  it('is a real link, so it can be opened in a new tab', () => {
    renderLink({ portal: true })

    expect(screen.getByRole('link', { name: 'CHARACTERS' })).toHaveAttribute(
      'href',
      '/characters',
    )
  })

  it('opens the portal before the destination appears', async () => {
    renderLink({ portal: true })

    await userEvent.click(screen.getByRole('link', { name: 'CHARACTERS' }))

    expect(screen.getByTestId('portal-overlay')).toBeInTheDocument()
    expect(screen.getByText('character list')).toBeInTheDocument()
  })

  it('navigates without a portal when transitions are off', async () => {
    renderLink({ portal: true, transitions: false })

    await userEvent.click(screen.getByRole('link', { name: 'CHARACTERS' }))

    expect(screen.queryByTestId('portal-overlay')).not.toBeInTheDocument()
    expect(screen.getByText('character list')).toBeInTheDocument()
  })

  it('navigates with no portal provider at all', async () => {
    renderLink({ portal: false })

    await userEvent.click(screen.getByRole('link', { name: 'CHARACTERS' }))

    expect(screen.getByText('character list')).toBeInTheDocument()
  })

  it('leaves a modified click to the browser', async () => {
    // One session, because the direct userEvent API does not carry held
    // modifier keys from one call into the next.
    const user = userEvent.setup()
    renderLink({ portal: true })

    await user.keyboard('{Meta>}')
    await user.click(screen.getByRole('link', { name: 'CHARACTERS' }))
    await user.keyboard('{/Meta}')

    // A command-click opens a tab; the portal has nothing to say about that.
    expect(screen.queryByTestId('portal-overlay')).not.toBeInTheDocument()
  })
})
