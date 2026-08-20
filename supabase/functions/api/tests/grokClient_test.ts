import { assertEquals, assertRejects, assertStringIncludes } from 'jsr:@std/assert'
import { createGrokClient, DEFAULT_MODEL } from '../clients/grokClient.ts'
import { AiError } from '../lib/errors.ts'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function sseResponse(frames: string[]) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      for (const frame of frames) controller.enqueue(encoder.encode(frame))
      controller.close()
    },
  })
  return new Response(stream, {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
  })
}

Deno.test('sends the key, the model and the messages', async () => {
  let seenUrl = ''
  let seenInit: RequestInit = {}
  const client = createGrokClient({
    apiKey: 'test-key',
    fetchFn: async (url, init) => {
      seenUrl = url
      seenInit = init
      return jsonResponse({ choices: [{ message: { content: 'Wubba.' } }] })
    },
  })

  const text = await client.complete([{ role: 'user', content: 'hi' }])

  assertEquals(text, 'Wubba.')
  assertStringIncludes(seenUrl, 'api.x.ai/v1/chat/completions')
  assertEquals((seenInit.headers as Record<string, string>).authorization, 'Bearer test-key')
  const body = JSON.parse(seenInit.body as string)
  assertEquals(body.model, DEFAULT_MODEL)
  assertEquals(body.stream, false)
  assertEquals(body.messages, [{ role: 'user', content: 'hi' }])
})

Deno.test('honours a model override', async () => {
  let model = ''
  const client = createGrokClient({
    apiKey: 'k',
    model: 'grok-3-mini',
    fetchFn: async (_url, init) => {
      model = JSON.parse(init.body as string).model
      return jsonResponse({ choices: [{ message: { content: 'ok' } }] })
    },
  })

  await client.complete([{ role: 'user', content: 'hi' }])

  assertEquals(model, 'grok-3-mini')
})

Deno.test('turns a provider error status into a 502', async () => {
  const client = createGrokClient({
    apiKey: 'k',
    fetchFn: async () => jsonResponse({ error: 'nope' }, 500),
  })

  await assertRejects(
    () => client.complete([{ role: 'user', content: 'hi' }]),
    AiError,
    '500',
  )
})

Deno.test('turns a network failure into a 502', async () => {
  const client = createGrokClient({
    apiKey: 'k',
    fetchFn: () => Promise.reject(new Error('connection reset')),
  })

  await assertRejects(
    () => client.complete([{ role: 'user', content: 'hi' }]),
    AiError,
    'connection reset',
  )
})

Deno.test('rejects an empty completion rather than returning nothing', async () => {
  const client = createGrokClient({
    apiKey: 'k',
    fetchFn: async () => jsonResponse({ choices: [] }),
  })

  await assertRejects(
    () => client.complete([{ role: 'user', content: 'hi' }]),
    AiError,
    'empty',
  )
})

Deno.test('yields the content deltas of a stream in order', async () => {
  const client = createGrokClient({
    apiKey: 'k',
    fetchFn: async () =>
      sseResponse([
        'data: {"choices":[{"delta":{"content":"Wub"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"ba lubba"}}]}\n\n',
        'data: [DONE]\n\n',
      ]),
  })

  const chunks: string[] = []
  for await (const chunk of client.stream([{ role: 'user', content: 'hi' }])) {
    chunks.push(chunk)
  }

  assertEquals(chunks, ['Wub', 'ba lubba'])
})

Deno.test('reassembles a frame split across two network reads', async () => {
  const client = createGrokClient({
    apiKey: 'k',
    fetchFn: async () =>
      sseResponse(['data: {"choices":[{"delta":{"con', 'tent":"split"}}]}\n\n', 'data: [DONE]\n\n']),
  })

  const chunks: string[] = []
  for await (const chunk of client.stream([{ role: 'user', content: 'hi' }])) {
    chunks.push(chunk)
  }

  assertEquals(chunks, ['split'])
})

Deno.test('skips a frame carrying no content delta', async () => {
  const client = createGrokClient({
    apiKey: 'k',
    fetchFn: async () =>
      sseResponse([
        'data: {"choices":[{"delta":{"role":"assistant"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"ok"}}]}\n\n',
        'data: [DONE]\n\n',
      ]),
  })

  const chunks: string[] = []
  for await (const chunk of client.stream([{ role: 'user', content: 'hi' }])) {
    chunks.push(chunk)
  }

  assertEquals(chunks, ['ok'])
})

Deno.test('turns a provider error status into a 502 before streaming', async () => {
  const client = createGrokClient({
    apiKey: 'k',
    fetchFn: async () => jsonResponse({ error: 'nope' }, 429),
  })

  await assertRejects(async () => {
    for await (const _ of client.stream([{ role: 'user', content: 'hi' }])) {
      // The rejection happens before the first chunk.
    }
  }, AiError)
})
