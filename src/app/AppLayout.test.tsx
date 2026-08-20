import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SettingsProvider } from '../shared/settings/SettingsProvider'
import { AppLayout } from './AppLayout'
import { server } from '../test/msw'

beforeAll(() => {
  vi.stubEnv('VITE_API_BASE', 'https://api.test/api')
  server.listen({ onUnhandledRequest: 'error' })
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function renderAt(path: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={client}>
      <SettingsProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/characters" element={<p>characters outlet</p>} />
              <Route path="/locations" element={<p>locations outlet</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </SettingsProvider>
    </QueryClientProvider>,
  )
}

describe('AppLayout', () => {
  it('offers a link to each section', () => {
    renderAt('/characters')

    expect(screen.getByRole('link', { name: 'CHARACTERS' })).toHaveAttribute(
      'href',
      '/characters',
    )
    expect(screen.getByRole('link', { name: 'LOCATIONS' })).toHaveAttribute(
      'href',
      '/locations',
    )
    expect(screen.getByRole('link', { name: 'EPISODES' })).toHaveAttribute(
      'href',
      '/episodes',
    )
  })

  it('sends the wordmark back to the hub', () => {
    renderAt('/characters')

    expect(screen.getByRole('link', { name: 'DOSSIER C-137' })).toHaveAttribute(
      'href',
      '/',
    )
  })

  it('marks the active section', () => {
    renderAt('/locations')

    expect(screen.getByRole('link', { name: 'LOCATIONS' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: 'CHARACTERS' })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('renders the routed page inside the shell', () => {
    renderAt('/characters')
    expect(screen.getByText('characters outlet')).toBeInTheDocument()
  })

  it('opens the settings panel from the mini gun', async () => {
    renderAt('/characters')

    await userEvent.click(screen.getByRole('button', { name: 'Portal gun' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('closes the panel on Escape and gives focus back to the gun', async () => {
    renderAt('/characters')
    const gun = screen.getByRole('button', { name: 'Portal gun' })

    await userEvent.click(gun)
    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    // Focus that vanishes into the body strands a keyboard user where the
    // panel used to be.
    expect(gun).toHaveFocus()
  })

  it('opens the search overlay from the header button', async () => {
    const user = userEvent.setup()
    renderAt('/characters')

    await user.click(screen.getByRole('button', { name: /search/i }))

    expect(screen.getByRole('dialog', { name: /search/i })).toBeInTheDocument()
  })

  it('opens the search overlay with the keyboard shortcut', async () => {
    const user = userEvent.setup()
    renderAt('/characters')

    await user.keyboard('{Control>}k{/Control}')

    expect(screen.getByRole('dialog', { name: /search/i })).toBeInTheDocument()
  })
})
