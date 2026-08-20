import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '../test/msw'
import { SettingsProvider } from '../shared/settings/SettingsProvider'
import { HubPage } from './HubPage'

beforeAll(() => {
  vi.stubEnv('VITE_API_BASE', 'https://api.test/api')
  server.listen({ onUnhandledRequest: 'error' })
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function renderHub() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={client}>
      <SettingsProvider>
        <MemoryRouter>
          <HubPage />
        </MemoryRouter>
      </SettingsProvider>
    </QueryClientProvider>,
  )
}

describe('HubPage', () => {
  it('names the archive', async () => {
    renderHub()
    expect(
      await screen.findByRole('heading', { name: 'DOSSIER C-137' }),
    ).toBeInTheDocument()
  })

  it('offers all three destinations with their live counts', async () => {
    renderHub()

    expect(await screen.findByText('826')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /CHARACTERS/ })).toHaveAttribute(
      'href',
      '/characters',
    )
    expect(screen.getByRole('link', { name: /LOCATIONS/ })).toHaveAttribute(
      'href',
      '/locations',
    )
    expect(screen.getByRole('link', { name: /EPISODES/ })).toHaveAttribute(
      'href',
      '/episodes',
    )
  })

  it('counts the Ricks and the Mortys on file', async () => {
    renderHub()

    // Anchored on a figure rather than a label: the labels are on screen
    // beside their skeletons before any data lands.
    expect(await screen.findByText('112')).toBeInTheDocument()
    expect(screen.getByText('RICKS ON FILE')).toBeInTheDocument()
    expect(screen.getByText('MORTYS ON FILE')).toBeInTheDocument()
    expect(screen.getByText('53')).toBeInTheDocument()
  })

  it('adds up everything indexed', async () => {
    renderHub()

    // 826 characters plus 126 locations plus 51 episodes.
    expect(await screen.findByText('1003')).toBeInTheDocument()
  })

  it('shows skeletons before the figures land', () => {
    renderHub()
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0)
  })

  it('offers the error state when the archive will not answer', async () => {
    server.use(
      http.get('https://api.test/api/stats', () =>
        HttpResponse.json(
          { error: { code: 'UPSTREAM_UNAVAILABLE', message: 'no' } },
          { status: 503 },
        ),
      ),
    )

    renderHub()

    expect(await screen.findByText('REGISTRY UNREACHABLE')).toBeInTheDocument()
  })

  it('opens the settings panel from the gun', async () => {
    renderHub()

    await userEvent.click(
      screen.getByRole('button', { name: 'PORTAL GUN SETTINGS' }),
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
