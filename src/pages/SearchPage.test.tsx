import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { SearchPage } from './SearchPage'
import { server } from '../test/msw'

beforeAll(() => {
  vi.stubEnv('VITE_API_BASE', 'https://api.test/api')
  server.listen({ onUnhandledRequest: 'error' })
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function renderPage(entry: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/search" element={<SearchPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('SearchPage', () => {
  it('shows every group with its upstream total', async () => {
    renderPage('/search?q=rick')

    expect(await screen.findByText('Rick Sanchez')).toBeInTheDocument()
    expect(screen.getByText('Citadel of Ricks')).toBeInTheDocument()
    expect(screen.getByText('Pilot')).toBeInTheDocument()
    // The figure appears twice — as the group counter and inside the link to
    // the full list — so the assertion names the counter specifically.
    expect(screen.getByText(/107 ON FILE/)).toBeInTheDocument()
  })

  it('links a group to its own section, carrying the query', async () => {
    renderPage('/search?q=rick')

    const all = await screen.findByRole('link', { name: /all 107 characters/i })
    expect(all).toHaveAttribute('href', '/characters?name=rick')
  })

  it('says so when nothing matched', async () => {
    renderPage('/search?q=nothing')

    expect(await screen.findByText(/no records found/i)).toBeInTheDocument()
  })

  it('asks for a query when the URL carries none', () => {
    renderPage('/search')

    expect(screen.getByText(/enter coordinates/i)).toBeInTheDocument()
  })
})
