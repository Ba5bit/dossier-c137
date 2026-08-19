import { assertEquals, assertRejects } from 'jsr:@std/assert'
import { createRmClient } from '../clients/rmClient.ts'
import { UpstreamError } from '../lib/errors.ts'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

Deno.test('builds a character list URL with only the supplied filters', async () => {
  let seen = ''
  const client = createRmClient(async (url) => {
    seen = url
    return jsonResponse({ info: { count: 0, pages: 0 }, results: [] })
  })

  await client.listCharacters({ page: 2, status: 'alive' })

  assertEquals(
    seen,
    'https://rickandmortyapi.com/api/character?page=2&status=alive',
  )
})

Deno.test('omits undefined filters from the URL', async () => {
  let seen = ''
  const client = createRmClient(async (url) => {
    seen = url
    return jsonResponse({ info: { count: 0, pages: 0 }, results: [] })
  })

  await client.listCharacters({ page: 1 })

  assertEquals(seen, 'https://rickandmortyapi.com/api/character?page=1')
})

Deno.test('normalizes an upstream 404 into an empty result set', async () => {
  const client = createRmClient(async () =>
    jsonResponse({ error: 'There is nothing here' }, 404)
  )

  const result = await client.listCharacters({ page: 1, name: 'zzzzz' })

  assertEquals(result.results, [])
  assertEquals(result.info.count, 0)
  assertEquals(result.info.pages, 0)
})

Deno.test('raises UpstreamError on a server failure', async () => {
  const client = createRmClient(async () => jsonResponse({}, 500))

  await assertRejects(
    () => client.listCharacters({ page: 1 }),
    UpstreamError,
  )
})

Deno.test('raises UpstreamError when the network throws', async () => {
  const client = createRmClient(async () => {
    throw new TypeError('network down')
  })

  await assertRejects(
    () => client.listCharacters({ page: 1 }),
    UpstreamError,
  )
})

Deno.test('returns the parsed payload on success', async () => {
  const client = createRmClient(async () =>
    jsonResponse({
      info: { count: 826, pages: 42 },
      results: [{ id: 1, name: 'Rick Sanchez' }],
    })
  )

  const result = await client.listCharacters({ page: 1 })

  assertEquals(result.info.count, 826)
  assertEquals(result.info.pages, 42)
  assertEquals(result.results.length, 1)
})
