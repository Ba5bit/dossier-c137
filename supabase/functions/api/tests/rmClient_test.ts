import { assertEquals, assertRejects } from 'jsr:@std/assert'
import { createRmClient } from '../clients/rmClient.ts'
import { NotFoundError, UpstreamError } from '../lib/errors.ts'

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

Deno.test('fetches one character by id', async () => {
  let seen = ''
  const client = createRmClient(async (url) => {
    seen = url
    return jsonResponse({ id: 1, name: 'Rick Sanchez' })
  })

  const raw = await client.getCharacter(1)

  assertEquals(seen, 'https://rickandmortyapi.com/api/character/1')
  assertEquals(raw.name, 'Rick Sanchez')
})

Deno.test('raises NotFoundError for a missing single entity', async () => {
  const client = createRmClient(async () =>
    jsonResponse({ error: 'Character not found' }, 404)
  )

  await assertRejects(() => client.getCharacter(99999), NotFoundError)
})

Deno.test('requests a batch of episodes in one call', async () => {
  let seen = ''
  const client = createRmClient(async (url) => {
    seen = url
    return jsonResponse([
      { id: 1, name: 'Pilot' },
      { id: 2, name: 'Lawnmower Dog' },
    ])
  })

  const episodes = await client.getEpisodesByIds([1, 2])

  assertEquals(seen, 'https://rickandmortyapi.com/api/episode/1,2')
  assertEquals(episodes.length, 2)
})

Deno.test('wraps the bare object the batch endpoint returns for one id', async () => {
  const client = createRmClient(async () => jsonResponse({ id: 1, name: 'Pilot' }))

  const episodes = await client.getEpisodesByIds([1])

  assertEquals(episodes.length, 1)
  assertEquals(episodes[0].name, 'Pilot')
})

Deno.test('makes no request for an empty batch', async () => {
  let calls = 0
  const client = createRmClient(async () => {
    calls += 1
    return jsonResponse([])
  })

  const episodes = await client.getEpisodesByIds([])

  assertEquals(calls, 0)
  assertEquals(episodes, [])
})

Deno.test('builds a location list URL from its own filters', async () => {
  let seen = ''
  const client = createRmClient(async (url) => {
    seen = url
    return jsonResponse({ info: { count: 0, pages: 0 }, results: [] })
  })

  await client.listLocations({ page: 3, dimension: 'C-137' })

  assertEquals(
    seen,
    'https://rickandmortyapi.com/api/location?page=3&dimension=C-137',
  )
})

Deno.test('builds an episode list URL from its own filters', async () => {
  let seen = ''
  const client = createRmClient(async (url) => {
    seen = url
    return jsonResponse({ info: { count: 0, pages: 0 }, results: [] })
  })

  await client.listEpisodes({ page: 1, episode: 'S03' })

  assertEquals(
    seen,
    'https://rickandmortyapi.com/api/episode?page=1&episode=S03',
  )
})
