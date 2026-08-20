import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePortalMachine } from './usePortalMachine'
import {
  CEILING_MS,
  COLLAPSING_MS,
  FIRING_MS,
  FIRING_SHORT_MS,
  QUOTE_AFTER_MS,
  TRAVERSING_MIN_MS,
} from './portalTimings'

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('usePortalMachine', () => {
  it('starts idle', () => {
    const { result } = renderHook(() => usePortalMachine())
    expect(result.current.phase).toBe('idle')
  })

  it('fires on open', () => {
    const { result } = renderHook(() => usePortalMachine())

    act(() => result.current.open())

    expect(result.current.phase).toBe('firing')
  })

  it('reaches traversing after the full shot', () => {
    const { result } = renderHook(() => usePortalMachine())

    act(() => result.current.open())
    advance(FIRING_MS - 1)
    expect(result.current.phase).toBe('firing')

    advance(1)
    expect(result.current.phase).toBe('traversing')
  })

  it('shortens the shot for a relation jump', () => {
    const { result } = renderHook(() => usePortalMachine())

    act(() => result.current.open('short'))
    advance(FIRING_SHORT_MS)

    expect(result.current.phase).toBe('traversing')
    expect(result.current.variant).toBe('short')
  })

  it('holds the floor when the data is already there', () => {
    const { result } = renderHook(() => usePortalMachine())

    act(() => result.current.open())
    advance(FIRING_MS)
    act(() => result.current.arrive())

    advance(TRAVERSING_MIN_MS - 1)
    // A 20 ms cache hit would otherwise produce a single-frame flash, which
    // is worse than having no animation at all.
    expect(result.current.phase).toBe('traversing')

    advance(1)
    expect(result.current.phase).toBe('collapsing')
  })

  it('collapses immediately when the wait already outran the floor', () => {
    const { result } = renderHook(() => usePortalMachine())

    act(() => result.current.open())
    advance(FIRING_MS + TRAVERSING_MIN_MS + 500)
    expect(result.current.phase).toBe('traversing')

    act(() => result.current.arrive())
    advance(0)

    expect(result.current.phase).toBe('collapsing')
  })

  it('honours an arrival that lands during the shot', () => {
    const { result } = renderHook(() => usePortalMachine())

    act(() => result.current.open())
    act(() => result.current.arrive())

    advance(FIRING_MS)
    expect(result.current.phase).toBe('traversing')

    advance(TRAVERSING_MIN_MS)
    expect(result.current.phase).toBe('collapsing')
  })

  it('returns to idle after the collapse', () => {
    const { result } = renderHook(() => usePortalMachine())

    act(() => result.current.open())
    advance(FIRING_MS)
    act(() => result.current.arrive())
    advance(TRAVERSING_MIN_MS)
    advance(COLLAPSING_MS)

    expect(result.current.phase).toBe('idle')
  })

  it('raises a quote once the wait runs long', () => {
    const { result } = renderHook(() => usePortalMachine())

    act(() => result.current.open())
    advance(QUOTE_AFTER_MS - 1)
    expect(result.current.showQuote).toBe(false)

    advance(1)
    expect(result.current.showQuote).toBe(true)
  })

  it('never raises a quote on a fast response', () => {
    const { result } = renderHook(() => usePortalMachine())

    act(() => result.current.open())
    advance(FIRING_MS)
    act(() => result.current.arrive())
    // Advanced in two steps, as in the collapse test above: one act() block
    // does not flush the state change that schedules the next phase's timer.
    advance(TRAVERSING_MIN_MS)
    advance(COLLAPSING_MS)
    expect(result.current.phase).toBe('idle')

    advance(QUOTE_AFTER_MS)
    // The timer outlived its run; it must not light up over an idle portal.
    expect(result.current.showQuote).toBe(false)
  })

  it('gives up at the ceiling rather than spinning forever', () => {
    const { result } = renderHook(() => usePortalMachine())

    act(() => result.current.open())
    advance(CEILING_MS - 1)
    expect(result.current.phase).toBe('traversing')

    advance(1)
    expect(result.current.phase).toBe('idle')
    expect(result.current.timedOut).toBe(true)
  })
})
