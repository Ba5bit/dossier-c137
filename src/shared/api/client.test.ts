import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  ApiError,
  fetchCharacter,
  fetchCharacters,
  fetchEpisode,
  fetchEpisodes,
  fetchLocation,
  fetchLocations,
} from './client'

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

describe('detail and entity fetches', () => {
  it('requests a character detail by id', async () => {
    const spy = vi.fn(async () => jsonResponse({ character: {}, episodes: [] }))
    vi.stubGlobal('fetch', spy)

    await fetchCharacter(7)

    expect(spy).toHaveBeenCalledWith(`${BASE}/characters/7`)
  })

  it('sends only the location filters that are present', async () => {
    const spy = vi.fn(async () => jsonResponse({ items: [], pagination: {} }))
    vi.stubGlobal('fetch', spy)

    await fetchLocations({ page: 2, dimension: 'C-137' })

    expect(spy).toHaveBeenCalledWith(`${BASE}/locations?page=2&dimension=C-137`)
  })

  it('requests a location detail by id', async () => {
    const spy = vi.fn(async () => jsonResponse({ location: {}, residents: [] }))
    vi.stubGlobal('fetch', spy)

    await fetchLocation(3)

    expect(spy).toHaveBeenCalledWith(`${BASE}/locations/3`)
  })

  it('sends only the episode filters that are present', async () => {
    const spy = vi.fn(async () => jsonResponse({ items: [], pagination: {} }))
    vi.stubGlobal('fetch', spy)

    await fetchEpisodes({ page: 1, episode: 'S03' })

    expect(spy).toHaveBeenCalledWith(`${BASE}/episodes?page=1&episode=S03`)
  })

  it('requests an episode detail by id', async () => {
    const spy = vi.fn(async () => jsonResponse({ episode: {}, characters: [] }))
    vi.stubGlobal('fetch', spy)

    await fetchEpisode(5)

    expect(spy).toHaveBeenCalledWith(`${BASE}/episodes/5`)
  })

  it('raises ApiError with the NOT_FOUND code for a missing entity', async () => {
    vi.stubGlobal('fetch', async () =>
      jsonResponse({ error: { code: 'NOT_FOUND', message: 'gone' } }, 404),
    )

    await expect(fetchCharacter(99999)).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})
