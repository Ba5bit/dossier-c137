import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { useContext } from 'react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { PortalProvider } from './PortalProvider'
import { PortalContext } from './PortalContext'
import {
  COLLAPSING_MS,
  FIRING_MS,
  QUOTE_AFTER_MS,
  TRAVERSING_MIN_MS,
} from './portalTimings'

function Trigger() {
  const portal = useContext(PortalContext)

  return (
    <div>
      <button onClick={() => portal?.open()}>fire</button>
      <button onClick={() => portal?.open('short')}>jump</button>
    </div>
  )
}

/** A destination whose data never lands, which keeps useIsFetching above zero. */
function Pending() {
  useQuery({ queryKey: ['pending'], queryFn: () => new Promise<string>(() => {}) })
  return null
}

function renderProvider(pending: ReactNode = null) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={client}>
      <PortalProvider>
        <Trigger />
        {pending}
      </PortalProvider>
    </QueryClientProvider>,
  )
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

function fire(label = 'fire') {
  act(() => {
    screen.getByText(label).click()
  })
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('PortalProvider', () => {
  it('shows no overlay while idle', () => {
    renderProvider()
    expect(screen.queryByTestId('portal-overlay')).not.toBeInTheDocument()
  })

  it('opens the overlay and reports its phase', () => {
    renderProvider()

    fire()

    expect(screen.getByTestId('portal-overlay')).toHaveAttribute(
      'data-phase',
      'firing',
    )
  })

  it('marks a shortened jump so the keyframes can match it', () => {
    renderProvider()

    fire('jump')

    expect(screen.getByTestId('portal-overlay')).toHaveAttribute(
      'data-variant',
      'short',
    )
  })

  it('closes once nothing is fetching and the floor has passed', () => {
    renderProvider()

    fire()
    // Nothing is in flight in this test, which is the cache-hit case: the
    // floor alone carries the shot. Advanced one phase at a time, because a
    // single act() block does not flush the state change that schedules the
    // next phase's timer.
    advance(FIRING_MS)
    advance(TRAVERSING_MIN_MS)
    advance(COLLAPSING_MS)

    expect(screen.queryByTestId('portal-overlay')).not.toBeInTheDocument()
  })

  it('holds the portal open while a request is still in flight', () => {
    renderProvider(<Pending />)

    fire()
    advance(FIRING_MS + TRAVERSING_MIN_MS + COLLAPSING_MS + 100)

    // The query never settles, so nothing has arrived and the portal must
    // not close on the floor alone.
    expect(screen.getByTestId('portal-overlay')).toHaveAttribute(
      'data-phase',
      'traversing',
    )
  })

  it('raises a quote once that wait passes the threshold', () => {
    renderProvider(<Pending />)

    fire()
    advance(QUOTE_AFTER_MS + 1)

    expect(screen.getByTestId('portal-quote')).toBeInTheDocument()
  })
})
