import { assertEquals } from 'jsr:@std/assert'
import { normalizePath, createRouter } from '../router.ts'

Deno.test('strips the function name prefix from the path', () => {
  assertEquals(normalizePath('/api/characters'), '/characters')
  assertEquals(normalizePath('/api/health'), '/health')
})

Deno.test('reduces a bare function path to root', () => {
  assertEquals(normalizePath('/api'), '/')
  assertEquals(normalizePath('/api/'), '/')
})

Deno.test('leaves an already-normalized path alone', () => {
  assertEquals(normalizePath('/characters'), '/characters')
})

Deno.test('answers health checks', async () => {
  const router = createRouter({
    listCharacters: async () => ({
      payload: { items: [], pagination: { page: 1, pageCount: 0, total: 0, pageSize: 20 } },
      stale: false,
    }),
  })

  const response = await router(new Request('https://x.test/api/health'))

  assertEquals(response.status, 200)
  assertEquals((await response.json()).status, 'ok')
})

Deno.test('routes character list requests to the service', async () => {
  const router = createRouter({
    listCharacters: async (query) => ({
      payload: {
        items: [],
        pagination: { page: query.page, pageCount: 42, total: 826, pageSize: 20 },
      },
      stale: false,
    }),
  })

  const response = await router(
    new Request('https://x.test/api/characters?page=5'),
  )
  const body = await response.json()

  assertEquals(response.status, 200)
  assertEquals(body.pagination.page, 5)
  assertEquals(body.pagination.pageCount, 42)
})

Deno.test('marks a stale response with a header', async () => {
  const router = createRouter({
    listCharacters: async () => ({
      payload: { items: [], pagination: { page: 1, pageCount: 0, total: 0, pageSize: 20 } },
      stale: true,
    }),
  })

  const response = await router(new Request('https://x.test/api/characters'))

  assertEquals(response.headers.get('X-Cache'), 'stale')
})

Deno.test('returns 400 with a typed code for an invalid parameter', async () => {
  const router = createRouter({
    listCharacters: async () => ({
      payload: { items: [], pagination: { page: 1, pageCount: 0, total: 0, pageSize: 20 } },
      stale: false,
    }),
  })

  const response = await router(
    new Request('https://x.test/api/characters?status=undead'),
  )
  const body = await response.json()

  assertEquals(response.status, 400)
  assertEquals(body.error.code, 'INVALID_PARAMETER')
})

Deno.test('returns 404 for an unknown route', async () => {
  const router = createRouter({
    listCharacters: async () => ({
      payload: { items: [], pagination: { page: 1, pageCount: 0, total: 0, pageSize: 20 } },
      stale: false,
    }),
  })

  const response = await router(new Request('https://x.test/api/nope'))

  assertEquals(response.status, 404)
})
