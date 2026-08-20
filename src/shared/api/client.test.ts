import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchCharacters, ApiError } from './client'

const BASE = 'https://api.test/api'

beforeEach(() => {
  vi.stubEnv('VITE_API_BASE', BASE)
  vi.unstubAllGlobals()
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('fetchCharacters', () => {
  it('sends only the filters that are present', async () => {
    const spy = vi.fn(async () => jsonResponse({ items: [], pagination: {} }))
    vi.stubGlobal('fetch', spy)

    await fetchCharacters({ page: 2, status: 'alive' })

    expect(spy).toHaveBeenCalledWith(`${BASE}/characters?page=2&status=alive`)
  })

  it('always sends a page even when none is given', async () => {
    const spy = vi.fn(async () => jsonResponse({ items: [], pagination: {} }))
    vi.stubGlobal('fetch', spy)

    await fetchCharacters({})

    expect(spy).toHaveBeenCalledWith(`${BASE}/characters?page=1`)
  })

  it('returns the parsed body on success', async () => {
    vi.stubGlobal('fetch', async () =>
      jsonResponse({
        items: [{ id: 1, name: 'Rick Sanchez' }],
        pagination: { page: 1, pageCount: 42, total: 826, pageSize: 20 },
      }),
    )

    const result = await fetchCharacters({ page: 1 })

    expect(result.items).toHaveLength(1)
    expect(result.pagination.pageCount).toBe(42)
  })

  it('raises ApiError carrying the backend code', async () => {
    vi.stubGlobal('fetch', async () =>
      jsonResponse(
        { error: { code: 'INVALID_PARAMETER', message: 'bad status' } },
        400,
      ),
    )

    await expect(fetchCharacters({ page: 1 })).rejects.toThrow(ApiError)
    await expect(fetchCharacters({ page: 1 })).rejects.toMatchObject({
      code: 'INVALID_PARAMETER',
    })
  })

  it('raises ApiError with a NETWORK code when fetch throws', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('offline')
    })

    await expect(fetchCharacters({ page: 1 })).rejects.toMatchObject({
      code: 'NETWORK',
    })
  })
})
