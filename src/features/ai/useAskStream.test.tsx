import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAskStream } from './useAskStream'
import { ApiError } from '../../shared/api/client'
import type { AskEvent } from '../../shared/api/types'

const streamAsk = vi.hoisted(() => vi.fn())

vi.mock('../../shared/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../shared/api/client')>()
  return { ...actual, streamAsk }
})

function stream(events: AskEvent[]) {
  return async function* () {
    for (const event of events) yield event
  }
}

beforeEach(() => {
  streamAsk.mockReset()
  sessionStorage.clear()
})

describe('useAskStream', () => {
  it('records the question and accumulates the answer', async () => {
    streamAsk.mockImplementation(
      stream([
        { type: 'token', text: 'Wubba' },
        { type: 'token', text: ' lubba' },
      ]),
    )
    const { result } = renderHook(() => useAskStream('rick'))

    await act(async () => {
      await result.current.ask('who is Rick?')
    })

    expect(result.current.messages).toEqual([
      { role: 'user', content: 'who is Rick?' },
      { role: 'assistant', content: 'Wubba lubba', persona: 'rick', sources: [] },
    ])
  })

  it('attaches the sources to the answer', async () => {
    streamAsk.mockImplementation(
      stream([
        { type: 'sources', sources: [{ type: 'character', id: 1, name: 'Rick Sanchez' }], citable: [] },
        { type: 'token', text: 'Me.' },
      ]),
    )
    const { result } = renderHook(() => useAskStream('rick'))

    await act(async () => {
      await result.current.ask('who is Rick?')
    })

    expect(result.current.messages[1].sources).toEqual([
      { type: 'character', id: 1, name: 'Rick Sanchez' },
    ])
  })

  it('sends the earlier turns as history', async () => {
    streamAsk.mockImplementation(stream([{ type: 'token', text: 'ok' }]))
    const { result } = renderHook(() => useAskStream('morty'))

    await act(async () => {
      await result.current.ask('who is Rick?')
    })
    await act(async () => {
      await result.current.ask('and then?')
    })

    expect(streamAsk.mock.calls[1][0]).toEqual({
      q: 'and then?',
      persona: 'morty',
      history: [
        { role: 'user', content: 'who is Rick?' },
        { role: 'assistant', content: 'ok' },
      ],
      focus: undefined,
    })
  })

  it('renders an in-band error event on the answer', async () => {
    streamAsk.mockImplementation(
      stream([
        { type: 'token', text: 'Wub' },
        { type: 'error', code: 'AI_UNAVAILABLE', message: 'Grok is having a day.' },
      ]),
    )
    const { result } = renderHook(() => useAskStream('rick'))

    await act(async () => {
      await result.current.ask('who is Rick?')
    })

    expect(result.current.messages[1].error).toBe('Grok is having a day.')
    expect(result.current.messages[1].content).toBe('Wub')
  })

  it('renders a refused request on the answer', async () => {
    streamAsk.mockImplementation(() => {
      throw new ApiError('RATE_LIMITED', 'Out of portal fluid for today.')
    })
    const { result } = renderHook(() => useAskStream('rick'))

    await act(async () => {
      await result.current.ask('who is Rick?')
    })

    expect(result.current.messages[1].error).toBe('Out of portal fluid for today.')
  })

  it('reports while it is streaming', async () => {
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    streamAsk.mockImplementation(async function* () {
      await gate
      yield { type: 'token', text: 'late' }
    })
    const { result } = renderHook(() => useAskStream('rick'))

    let pending: Promise<void> = Promise.resolve()
    act(() => {
      pending = result.current.ask('who is Rick?')
    })

    await waitFor(() => expect(result.current.streaming).toBe(true))

    await act(async () => {
      release()
      await pending
    })

    expect(result.current.streaming).toBe(false)
  })
})
