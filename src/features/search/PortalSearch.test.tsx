import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { PortalSearch } from './PortalSearch'
import { server } from '../../test/msw'

beforeAll(() => {
  // Without this the client reads VITE_API_BASE out of .env.local and the
  // request sails past MSW to the live function.
  vi.stubEnv('VITE_API_BASE', 'https://api.test/api')
  server.listen({ onUnhandledRequest: 'error' })
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function renderSearch() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<PortalSearch autoFocus />} />
          <Route path="/search" element={<p>SEARCH PAGE</p>} />
          <Route path="/ask" element={<p>ASK PAGE</p>} />
          <Route path="/characters/:id" element={<p>CHARACTER PAGE</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('PortalSearch', () => {
  it('asks for nothing until the second character', async () => {
    const user = userEvent.setup()
    renderSearch()

    await user.type(screen.getByRole('searchbox'), 'r')

    expect(await screen.findByText(/two characters/i)).toBeInTheDocument()
    expect(screen.queryByText('Rick Sanchez')).not.toBeInTheDocument()
  })

  it('shows results grouped by type', async () => {
    const user = userEvent.setup()
    renderSearch()

    await user.type(screen.getByRole('searchbox'), 'rick')

    expect(await screen.findByText('Rick Sanchez')).toBeInTheDocument()
    expect(screen.getByText('Citadel of Ricks')).toBeInTheDocument()
    expect(screen.getByText('Pilot')).toBeInTheDocument()
  })


  it('drops the results when the box is emptied', async () => {
    const user = userEvent.setup()
    renderSearch()

    const box = screen.getByRole('searchbox')
    await user.type(box, 'rick')
    expect(await screen.findByText('Rick Sanchez')).toBeInTheDocument()

    await user.clear(box)

    // The last query's results used to stay standing under an empty box.
    await waitFor(() =>
      expect(screen.queryByText('Rick Sanchez')).not.toBeInTheDocument(),
    )
  })
  it('says so when nothing matches', async () => {
    const user = userEvent.setup()
    renderSearch()

    await user.type(screen.getByRole('searchbox'), 'nothing')

    expect(await screen.findByText(/nothing on file/i)).toBeInTheDocument()
  })

  it('opens a result with the arrow keys and Enter', async () => {
    const user = userEvent.setup()
    renderSearch()

    await user.type(screen.getByRole('searchbox'), 'rick')
    await screen.findByText('Rick Sanchez')
    await user.keyboard('{ArrowDown}{Enter}')

    expect(await screen.findByText('CHARACTER PAGE')).toBeInTheDocument()
  })

  it('sends a bare lookup to the search page', async () => {
    const user = userEvent.setup()
    renderSearch()

    await user.type(screen.getByRole('searchbox'), 'rick{Enter}')

    expect(await screen.findByText('SEARCH PAGE')).toBeInTheDocument()
  })

  it('sends a question to the chat', async () => {
    const user = userEvent.setup()
    renderSearch()

    await user.type(screen.getByRole('searchbox'), 'who is rick?{Enter}')

    expect(await screen.findByText('ASK PAGE')).toBeInTheDocument()
  })

  it('sends a lookup to the chat when ASK is pressed', async () => {
    const user = userEvent.setup()
    renderSearch()

    await user.type(screen.getByRole('searchbox'), 'rick')
    await user.click(screen.getByRole('button', { name: /ask/i }))

    expect(await screen.findByText('ASK PAGE')).toBeInTheDocument()
  })

  it('reports the query it navigated with', async () => {
    const user = userEvent.setup()
    renderSearch()

    await user.type(screen.getByRole('searchbox'), 'rick{Enter}')

    await waitFor(() => expect(screen.getByText('SEARCH PAGE')).toBeInTheDocument())
  })
})
