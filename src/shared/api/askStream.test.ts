import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, streamAsk } from './client'
import type { AskEvent } from './types'

function sseResponse(frames: string[], status = 200) {
  const encoder = new TextEncoder()
  const body = new ReadableStream({
    start(controller) {
      for (const frame of frames) controller.enqueue(encoder.encode(frame))
      controller.close()
    },
  })
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/event-stream' },
  })
}

async function collect(source: AsyncGenerator<AskEvent>): Promise<AskEvent[]> {
  const events: AskEvent[] = []
  for await (const event of source) events.push(event)
  return events
}

const request = { q: 'who is Rick?', persona: 'rick' as const, history: [] }

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('streamAsk', () => {
  it('yields every frame of the stream in order', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        sseResponse([
          'event: sources\ndata: {"type":"sources","sources":[{"type":"character","id":1,"name":"Rick Sanchez"}]}\n\n',
          'event: token\ndata: {"type":"token","text":"Wubba"}\n\n',
          'event: token\ndata: {"type":"token","text":" lubba"}\n\n',
        ]),
      ),
    )

    const events = await collect(streamAsk(request))

    expect(events).toEqual([
      { type: 'sources', sources: [{ type: 'character', id: 1, name: 'Rick Sanchez' }] },
      { type: 'token', text: 'Wubba' },
      { type: 'token', text: ' lubba' },
    ])
  })

  it('reassembles a frame split across two reads', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        sseResponse(['event: token\ndata: {"type":"token","te', 'xt":"split"}\n\n']),
      ),
    )

    const events = await collect(streamAsk(request))

    expect(events).toEqual([{ type: 'token', text: 'split' }])
  })

  it('posts the question, the persona and the history', async () => {
    const fetchMock = vi.fn(async () => sseResponse([]))
    vi.stubGlobal('fetch', fetchMock)

    await collect(
      streamAsk({
        q: 'and then?',
        persona: 'morty',
        history: [{ role: 'user', content: 'who is Rick?' }],
      }),
    )

    // The stub takes no declared parameters, so its recorded call tuple is
    // typed as empty; the real fetch signature has to be asserted through unknown.
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({
      q: 'and then?',
      persona: 'morty',
      history: [{ role: 'user', content: 'who is Rick?' }],
    })
  })

  it('raises the API error code when the request is refused', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({ error: { code: 'RATE_LIMITED', message: 'Out of fluid.' } }),
          { status: 429, headers: { 'content-type': 'application/json' } },
        ),
      ),
    )

    await expect(collect(streamAsk(request))).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      message: 'Out of fluid.',
    })
  })

  it('raises a network error when the request never lands', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('connection reset')
    }))

    await expect(collect(streamAsk(request))).rejects.toBeInstanceOf(ApiError)
  })
})
