import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server } from '../test/msw'
import { EpisodesPage } from './EpisodesPage'
import { EpisodeDetailPage } from './EpisodeDetailPage'

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
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/episodes" element={<EpisodesPage />} />
          <Route path="/episodes/:id" element={<EpisodeDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('EpisodesPage', () => {
  it('loads and renders episodes from the backend', async () => {
    renderAt('/episodes')
    expect(await screen.findByText('Episode Page 1')).toBeInTheDocument()
  })

  it('reports the position from the backend pagination block', async () => {
    renderAt('/episodes')
    expect(await screen.findByText('DIMENSION 1 / 3')).toBeInTheDocument()
  })

  it('advances the page when the next control is used', async () => {
    renderAt('/episodes')
    await screen.findByText('Episode Page 1')
    await userEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(await screen.findByText('Episode Page 2')).toBeInTheDocument()
  })
})

describe('EpisodeDetailPage', () => {
  it('renders the episode title and code', async () => {
    renderAt('/episodes/1')
    expect(await screen.findByRole('heading', { name: 'Pilot' })).toBeInTheDocument()
    expect(screen.getByText('S01E01')).toBeInTheDocument()
  })

  it('lists the personnel present', async () => {
    renderAt('/episodes/1')
    expect(await screen.findByText('PERSONNEL PRESENT')).toBeInTheDocument()
    expect(screen.getByText('Rick Sanchez')).toBeInTheDocument()
  })

  it('links a cast member to their own dossier', async () => {
    renderAt('/episodes/1')
    await screen.findByText('Rick Sanchez')
    expect(screen.getByRole('link', { name: /Rick Sanchez/ })).toHaveAttribute(
      'href',
      '/characters/1',
    )
  })
})
