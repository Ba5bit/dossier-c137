import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server } from '../test/msw'
import { CharactersPage } from './CharactersPage'

beforeAll(() => {
  vi.stubEnv('VITE_API_BASE', 'https://api.test/api')
  server.listen({ onUnhandledRequest: 'error' })
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function renderPage(path = '/characters') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/characters" element={<CharactersPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CharactersPage', () => {
  it('loads and renders characters from the backend', async () => {
    renderPage()
    expect(await screen.findByText('Character Page 1')).toBeInTheDocument()
  })

  it('reports the total from the backend pagination block', async () => {
    renderPage()
    expect(await screen.findByText('DIMENSION 1 / 42')).toBeInTheDocument()
  })

  it('honours a page supplied in the URL', async () => {
    renderPage('/characters?page=7')
    expect(await screen.findByText('Character Page 7')).toBeInTheDocument()
  })

  it('advances the page when the next control is used', async () => {
    renderPage()
    await screen.findByText('Character Page 1')
    await userEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(await screen.findByText('Character Page 2')).toBeInTheDocument()
  })

  it('shows the empty state when a filter matches nothing', async () => {
    renderPage()
    await screen.findByText('Character Page 1')
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'dead')
    await waitFor(() =>
      expect(screen.getByText('NO RECORDS FOUND')).toBeInTheDocument(),
    )
  })
})
