import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server } from '../test/msw'
import { LocationsPage } from './LocationsPage'
import { LocationDetailPage } from './LocationDetailPage'

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
          <Route path="/locations" element={<LocationsPage />} />
          <Route path="/locations/:id" element={<LocationDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('LocationsPage', () => {
  it('loads and renders locations from the backend', async () => {
    renderAt('/locations')
    expect(await screen.findByText('Location Page 1')).toBeInTheDocument()
  })

  it('reports the position from the backend pagination block', async () => {
    renderAt('/locations')
    expect(await screen.findByText('DIMENSION 1 / 7')).toBeInTheDocument()
  })

  it('honours a page supplied in the URL', async () => {
    renderAt('/locations?page=4')
    expect(await screen.findByText('Location Page 4')).toBeInTheDocument()
  })

  it('advances the page when the next control is used', async () => {
    renderAt('/locations')
    await screen.findByText('Location Page 1')
    await userEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(await screen.findByText('Location Page 2')).toBeInTheDocument()
  })
})

describe('LocationDetailPage', () => {
  it('renders the location name and fields', async () => {
    renderAt('/locations/1')
    expect(await screen.findByRole('heading', { name: 'Earth (C-137)' })).toBeInTheDocument()
    expect(screen.getByText('Planet')).toBeInTheDocument()
  })

  it('lists the registered residents', async () => {
    renderAt('/locations/1')
    expect(await screen.findByText('REGISTERED RESIDENTS')).toBeInTheDocument()
    expect(screen.getByText('Beth Smith')).toBeInTheDocument()
  })

  it('links a resident to their own dossier', async () => {
    renderAt('/locations/1')
    await screen.findByText('Beth Smith')
    expect(screen.getByRole('link', { name: /Beth Smith/ })).toHaveAttribute(
      'href',
      '/characters/38',
    )
  })
})
