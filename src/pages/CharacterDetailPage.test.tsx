import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server } from '../test/msw'
import { CharacterDetailPage } from './CharacterDetailPage'

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
          <Route path="/characters/:id" element={<CharacterDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CharacterDetailPage', () => {
  it('renders the dossier header stamp', async () => {
    renderAt('/characters/1')
    expect(
      await screen.findByText('DOSSIER C-137 // CLEARANCE: UNRESTRICTED'),
    ).toBeInTheDocument()
  })

  it('renders the character name and portrait', async () => {
    renderAt('/characters/1')
    expect(await screen.findByRole('heading', { name: 'Rick Sanchez' })).toBeInTheDocument()
    expect(screen.getByAltText('Rick Sanchez')).toBeInTheDocument()
  })

  it('links a resolved origin to its location page', async () => {
    renderAt('/characters/1')
    expect(
      await screen.findByRole('link', { name: 'Earth (C-137)' }),
    ).toHaveAttribute('href', '/locations/1')
  })

  it('lists the episodes the character appears in', async () => {
    renderAt('/characters/1')
    expect(await screen.findByText('S01E01')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Pilot/ })).toHaveAttribute(
      'href',
      '/episodes/1',
    )
  })

  it('shows skeletons while the dossier loads', () => {
    renderAt('/characters/1')
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0)
  })

  it('shows the 404 body for a character that does not exist', async () => {
    renderAt('/characters/99999')
    expect(
      await screen.findByText("This dimension doesn't exist."),
    ).toBeInTheDocument()
  })
})
