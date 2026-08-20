import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { SearchOverlay } from './SearchOverlay'
import { server } from '../../test/msw'

beforeAll(() => {
  vi.stubEnv('VITE_API_BASE', 'https://api.test/api')
  server.listen({ onUnhandledRequest: 'error' })
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function renderOverlay(onClose = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <SearchOverlay onClose={onClose} />
      </MemoryRouter>
    </QueryClientProvider>,
  )

  return onClose
}

describe('SearchOverlay', () => {
  it('is a labelled dialog holding the search input', () => {
    renderOverlay()

    expect(screen.getByRole('dialog', { name: /search/i })).toBeInTheDocument()
    expect(screen.getByRole('searchbox')).toHaveFocus()
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    const onClose = renderOverlay()

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalled()
  })

  it('closes when the backdrop is clicked', async () => {
    const user = userEvent.setup()
    const onClose = renderOverlay()

    await user.click(screen.getByTestId('search-backdrop'))

    expect(onClose).toHaveBeenCalled()
  })
})
