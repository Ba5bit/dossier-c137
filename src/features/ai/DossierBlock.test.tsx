import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { DossierBlock } from './DossierBlock'
import { server } from '../../test/msw'

beforeAll(() => {
  vi.stubEnv('VITE_API_BASE', 'https://api.test/api')
  server.listen({ onUnhandledRequest: 'error' })
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function renderBlock(entityId = 1) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  render(
    <QueryClientProvider client={client}>
      <DossierBlock entityId={entityId} />
    </QueryClientProvider>,
  )
}

describe('DossierBlock', () => {
  it('offers to generate before anything is generated', () => {
    renderBlock()

    expect(screen.getByRole('button', { name: /generate dossier/i })).toBeInTheDocument()
  })

  it('renders the generated text', async () => {
    const user = userEvent.setup()
    renderBlock()

    await user.click(screen.getByRole('button', { name: /generate dossier/i }))

    expect(await screen.findByText(/subject invents/i)).toBeInTheDocument()
  })

  it('marks a burp rather than printing the asterisks', async () => {
    const user = userEvent.setup()
    renderBlock()

    await user.click(screen.getByRole('button', { name: /generate dossier/i }))

    expect(await screen.findByTestId('burp')).toHaveTextContent('*burp*')
  })

  it('explains an exhausted quota in the block, not as a page error', async () => {
    const user = userEvent.setup()
    renderBlock(429)

    await user.click(screen.getByRole('button', { name: /generate dossier/i }))

    expect(await screen.findByText(/out of portal fluid/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('confines a provider failure to the block', async () => {
    const user = userEvent.setup()
    renderBlock(502)

    await user.click(screen.getByRole('button', { name: /generate dossier/i }))

    expect(await screen.findByText(/grok is having a day/i)).toBeInTheDocument()
  })
})
