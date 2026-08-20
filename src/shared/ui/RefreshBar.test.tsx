import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { RefreshBar } from './RefreshBar'

function Consumer({ resolve }: { resolve: Promise<string> }) {
  useQuery({ queryKey: ['thing'], queryFn: () => resolve })
  return <p>content</p>
}

function renderWith(children: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={client}>
      <RefreshBar />
      {children}
    </QueryClientProvider>,
  )
}

describe('RefreshBar', () => {
  it('stays out of the way when nothing is happening', () => {
    renderWith(null)
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('stays out of the way on a first load', () => {
    // The first load is represented by skeletons. A bar on top of them is
    // two loading indicators for one wait.
    renderWith(<Consumer resolve={new Promise(() => {})} />)
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('appears once there is content to refresh behind it', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    client.setQueryData(['thing'], 'already here')

    render(
      <QueryClientProvider client={client}>
        <RefreshBar />
        <Consumer resolve={new Promise(() => {})} />
      </QueryClientProvider>,
    )

    await waitFor(() =>
      expect(screen.getByRole('progressbar')).toBeInTheDocument(),
    )
  })
})
