# Dossier C-137 — Entities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the archive from characters-only to all three entity types — characters, locations, and episodes — each with a list page and a detail page, served by endpoints that expand relations server-side so the frontend never fans out requests.

**Architecture:** The layering established in plan 1 is unchanged: `router → handler → service → client/cache`, one way, each layer tested by stubbing the layer beneath it. Plan 2 splits the single service file into one per entity over a shared relation helper, teaches the upstream client to fetch a single entity and to batch-fetch by id, and adds a nav shell so the new sections are reachable before the hub exists.

**Tech Stack:** Unchanged from plan 1 — React 19, Vite, TypeScript, React Router v7, TanStack Query, Tailwind v4, Vitest, React Testing Library, MSW, Supabase Edge Functions (Deno), Supabase Postgres.

**Source spec:** `docs/superpowers/specs/2026-08-19-dossier-c137-design.md`
**Predecessor:** `docs/superpowers/plans/2026-08-20-dossier-c137-foundation.md`, complete and tagged `plan-1-foundation`

---

## Scope

This is plan 2 of 5. It covers spec §6.2 for locations, episodes, and all three detail endpoints, and §7.1 for the six routes those entities need.

| In scope | Out of scope, and where it lands |
|---|---|
| `/api/characters/:id`, `/api/locations`, `/api/locations/:id`, `/api/episodes`, `/api/episodes/:id` | `/api/search`, `/api/stats`, `/api/ask`, `/api/dossier`, `/api/speak` — plans 4 and 5 |
| List and detail pages for all three entity types | The hub page and portal transitions — plan 3 |
| A minimal nav shell so the sections are reachable | The header mini-gun, settings panel, dimensions — plan 3 |
| Relation expansion, resident and personnel rosters | AI dossier panels on the same pages — plan 4 |
| The TERMINATED stamp and redaction bars on detail pages | The full detail catalog and microcopy centralization in `shared/lore/copy.ts` — plan 5 |

**Copy stays inline for now.** Spec §7.3 requires all user-facing text to live in `src/shared/lore/copy.ts`. Plan 1 shipped strings inline and plan 5 owns the centralization; introducing a second convention mid-flight would leave three places to reconcile instead of one. Write new copy inline, in the same voice.

---

## Two upstream behaviours that will bite

**A 404 means two different things.** On a list endpoint (`/character?name=zzzz`) the upstream answers 404 for an empty result set, and plan 1's client already normalizes that to an empty array. On a single-entity endpoint (`/character/99999`) the same status means the record genuinely does not exist and must surface as a 404 to the browser. One client, two paths: `getList` swallows the 404, `getOne` raises `NotFoundError`. Conflating them either hides real misses or turns every empty filter into an error page.

**The batch endpoint changes shape with one id.** `/episode/1,2,3` returns an array; `/episode/1` returns a bare object. A character appearing in exactly one episode would crash a naive `.map()`. `getMany` normalizes both into an array.

---

## File structure

### Backend

```
supabase/functions/api/
  types.ts                          + location, episode, and detail contracts
  clients/rmClient.ts               + getOne, getMany, location and episode calls
  lib/validate.ts                   + parseId, parseLocationQuery, parseEpisodeQuery
  services/
    refs.ts                         NEW  relation helpers and shared constants
    characters.ts                   RENAMED from rickMorty.ts, + getCharacter
    locations.ts                    NEW  list and detail for locations
    episodes.ts                     NEW  list and detail for episodes
  handlers/
    characters.ts                   + handleGetCharacter
    locations.ts                    NEW
    episodes.ts                     NEW
  router.ts                         a services bundle and parameterized routes
  index.ts                          wires three services instead of one
  tests/
    refs_test.ts                    NEW
    characters_test.ts              RENAMED from rickMorty_test.ts, + detail cases
    locations_test.ts               NEW
    episodes_test.ts                NEW
    rmClient_test.ts                + getOne and getMany cases
    validate_test.ts                + id and new query cases
    router_test.ts                  rewritten for the services bundle
```

### Frontend

```
src/
  app/
    AppLayout.tsx                   NEW  nav shell wrapping every page
    routes.tsx                      eight routes behind the layout
  pages/
    CharacterDetailPage.tsx         NEW
    LocationsPage.tsx               NEW
    LocationDetailPage.tsx          NEW
    EpisodesPage.tsx                NEW
    EpisodeDetailPage.tsx           NEW
  features/
    characters/
      useCharacter.ts               NEW
      CharacterDossier.tsx          NEW  the detail body
      RosterGrid.tsx                NEW  a roster of characters, reused by both
                                         the location and the episode dossier
    locations/
      LocationCard.tsx  LocationGrid.tsx  LocationFilters.tsx
      LocationDossier.tsx  useLocations.ts  useLocation.ts
    episodes/
      EpisodeCard.tsx  EpisodeGrid.tsx  EpisodeFilters.tsx
      EpisodeDossier.tsx  useEpisodes.ts  useEpisode.ts
  shared/
    api/types.ts                    + the mirrored contracts
    api/client.ts                   + five fetch functions
    hooks/useUrlFilters.ts          generalized over a key set
    ui/
      RedactionBar.tsx              NEW  extracted from CharacterCard
      Stamp.tsx                     NEW  the DOSSIER and TERMINATED stamps
      DimensionNotFound.tsx         NEW  extracted from NotFoundPage
      DetailSkeleton.tsx            NEW
      TextFilter.tsx                NEW  extracted from CharacterFilters
  test/msw.ts                       handlers for every new endpoint
```

**Why the service file splits.** Spec §7.3's size rule — past roughly 150 lines, split — applies to the backend too. Adding two entities and three detail shapes to `rickMorty.ts` would take it past 300 lines with three unrelated reasons to change. Three services over one `refs.ts` keeps each file readable in one screen.

---

## Task 1: Relation helpers and the new contracts

**Files:**
- Modify: `supabase/functions/api/types.ts`
- Create: `supabase/functions/api/services/refs.ts`
- Create: `supabase/functions/api/tests/refs_test.ts`

- [ ] **Step 1: Write the failing test**

Create `supabase/functions/api/tests/refs_test.ts`:

```ts
import { assertEquals } from 'jsr:@std/assert'
import { idFromUrl, idsFromUrls, toRef, toRelationRef } from '../services/refs.ts'

Deno.test('reads the trailing id out of a relation URL', () => {
  assertEquals(idFromUrl('https://rickandmortyapi.com/api/location/20'), 20)
})

Deno.test('reports no id for an empty relation URL', () => {
  assertEquals(idFromUrl(''), null)
})

Deno.test('reports no id for a URL that does not end in a number', () => {
  assertEquals(idFromUrl('https://rickandmortyapi.com/api/location'), null)
})

Deno.test('builds a list-shaped ref', () => {
  assertEquals(
    toRef({ name: 'Earth (C-137)', url: 'https://rickandmortyapi.com/api/location/1' }),
    { name: 'Earth (C-137)', id: 1 },
  )
})

Deno.test('marks a resolvable relation as resolved', () => {
  assertEquals(
    toRelationRef({ name: 'Earth (C-137)', url: 'https://rickandmortyapi.com/api/location/1' }),
    { id: 1, name: 'Earth (C-137)', resolved: true },
  )
})

Deno.test('marks an unknown relation as unresolved', () => {
  assertEquals(
    toRelationRef({ name: 'unknown', url: '' }),
    { id: null, name: 'unknown', resolved: false },
  )
})

Deno.test('collects the ids from a list of relation URLs', () => {
  assertEquals(
    idsFromUrls([
      'https://rickandmortyapi.com/api/episode/1',
      'https://rickandmortyapi.com/api/episode/2',
    ]),
    [1, 2],
  )
})

Deno.test('drops relations that carry no id', () => {
  assertEquals(
    idsFromUrls(['https://rickandmortyapi.com/api/episode/1', '']),
    [1],
  )
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm run test:api
```

Expected: FAIL — module `../services/refs.ts` not found.

- [ ] **Step 3: Add the new contracts**

Append to `supabase/functions/api/types.ts`:

```ts
export type RelationRef = {
  id: number | null
  name: string
  resolved: boolean
}

export type EpisodeSummary = {
  id: number
  name: string
  episode: string
}

export type CharacterSummary = {
  id: number
  name: string
  status: string
  image: string
}

export type CharacterDetail = {
  character: Character
  origin: RelationRef
  location: RelationRef
  episodes: EpisodeSummary[]
}

export type LocationQuery = {
  page: number
  name?: string
  type?: string
  dimension?: string
}

export type Location = {
  id: number
  name: string
  type: string
  dimension: string
  residentCount: number
}

export type LocationDetail = {
  location: Location
  residents: CharacterSummary[]
}

export type EpisodeQuery = {
  page: number
  name?: string
  episode?: string
}

export type Episode = {
  id: number
  name: string
  airDate: string
  episode: string
  characterCount: number
}

export type EpisodeDetail = {
  episode: Episode
  characters: CharacterSummary[]
}
```

- [ ] **Step 4: Write the helpers**

Create `supabase/functions/api/services/refs.ts`:

```ts
import type { CharacterRef, RelationRef } from '../types.ts'

export const PAGE_SIZE = 20
export const TTL_SECONDS = 24 * 60 * 60

/**
 * Relations arrive as URLs ending in a numeric id, or as an empty string
 * when the entity has no record — origin "unknown" is common enough that
 * half of any given page carries it.
 */
export function idFromUrl(url: string): number | null {
  const match = url.match(/\/(\d+)$/)
  return match ? Number(match[1]) : null
}

export function toRef(relation: { name: string; url: string }): CharacterRef {
  return { name: relation.name, id: idFromUrl(relation.url) }
}

export function toRelationRef(relation: { name: string; url: string }): RelationRef {
  const id = idFromUrl(relation.url)
  return { id, name: relation.name, resolved: id !== null }
}

export function idsFromUrls(urls: string[]): number[] {
  return urls.map(idFromUrl).filter((id): id is number => id !== null)
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
npm run test:api
```

Expected: PASS — 41 tests (33 existing plus 8 new).

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/api/types.ts supabase/functions/api/services/refs.ts supabase/functions/api/tests/refs_test.ts
git commit -m "feat: add entity contracts and shared relation helpers"
```

---

## Task 2: Split the character service out of rickMorty.ts

This task changes no behaviour. The existing tests are the safety net: they must be green before and after.

**Files:**
- Rename: `supabase/functions/api/services/rickMorty.ts` → `supabase/functions/api/services/characters.ts`
- Rename: `supabase/functions/api/tests/rickMorty_test.ts` → `supabase/functions/api/tests/characters_test.ts`
- Modify: `supabase/functions/api/index.ts`

- [ ] **Step 1: Confirm the suite is green before touching anything**

```bash
npm run test:api
```

Expected: PASS — 41 tests.

- [ ] **Step 2: Rename both files**

```bash
git mv supabase/functions/api/services/rickMorty.ts supabase/functions/api/services/characters.ts
git mv supabase/functions/api/tests/rickMorty_test.ts supabase/functions/api/tests/characters_test.ts
```

- [ ] **Step 3: Rewrite the service over the shared helpers**

Replace the contents of `supabase/functions/api/services/characters.ts`:

```ts
import { buildCacheKey, type Resolved } from '../lib/cache.ts'
import { PAGE_SIZE, TTL_SECONDS, toRef } from './refs.ts'
import type { RawCharacter, RmListResponse } from '../clients/rmClient.ts'
import type { Character, CharacterQuery, ListResponse } from '../types.ts'

type CharacterClient = {
  listCharacters(query: CharacterQuery): Promise<RmListResponse<RawCharacter>>
}

type CacheLike = {
  resolve<T>(
    key: string,
    ttlSeconds: number,
    load: () => Promise<T>,
  ): Promise<Resolved<T>>
}

export function toCharacter(raw: RawCharacter): Character {
  return {
    id: raw.id,
    name: raw.name,
    status: raw.status,
    species: raw.species,
    type: raw.type,
    gender: raw.gender,
    image: raw.image,
    origin: toRef(raw.origin),
    location: toRef(raw.location),
    episodeCount: raw.episode.length,
  }
}

export function createCharacterService(client: CharacterClient, cache: CacheLike) {
  async function listCharacters(
    query: CharacterQuery,
  ): Promise<Resolved<ListResponse<Character>>> {
    const key = buildCacheKey('characters', {
      page: String(query.page),
      name: query.name,
      status: query.status,
      species: query.species,
      gender: query.gender,
    })

    return await cache.resolve(key, TTL_SECONDS, async () => {
      const raw = await client.listCharacters(query)
      return {
        items: raw.results.map(toCharacter),
        pagination: {
          page: query.page,
          pageCount: raw.info.pages,
          total: raw.info.count,
          pageSize: PAGE_SIZE,
        },
      }
    })
  }

  return { listCharacters }
}
```

- [ ] **Step 4: Point the test file at the new name**

In `supabase/functions/api/tests/characters_test.ts`, replace the import line:

```ts
import { createRickMortyService } from '../services/rickMorty.ts'
```

with:

```ts
import { createCharacterService } from '../services/characters.ts'
```

Then replace every occurrence of `createRickMortyService(` with `createCharacterService(` in that file.

- [ ] **Step 5: Point the entry point at the new name**

In `supabase/functions/api/index.ts`, replace the import:

```ts
import { createRickMortyService } from './services/rickMorty.ts'
```

with:

```ts
import { createCharacterService } from './services/characters.ts'
```

and replace the wiring line:

```ts
const service = createRickMortyService(createRmClient(), createCache(store))
```

with:

```ts
const service = createCharacterService(createRmClient(), createCache(store))
```

- [ ] **Step 6: Run the tests to verify nothing moved**

```bash
npm run test:api
```

Expected: PASS — 41 tests, the same count as step 1.

- [ ] **Step 7: Commit**

```bash
git add -A supabase/functions/api
git commit -m "refactor: name the character service for its entity"
```

---

## Task 3: Single-entity and batch fetches in the upstream client

**Files:**
- Modify: `supabase/functions/api/clients/rmClient.ts`
- Modify: `supabase/functions/api/tests/rmClient_test.ts`

- [ ] **Step 1: Write the failing tests**

In `supabase/functions/api/tests/rmClient_test.ts`, replace the error import line:

```ts
import { UpstreamError } from '../lib/errors.ts'
```

with:

```ts
import { NotFoundError, UpstreamError } from '../lib/errors.ts'
```

Then append to the same file:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm run test:api
```

Expected: FAIL — `client.getCharacter is not a function`.

- [ ] **Step 3: Rewrite the client**

Replace the contents of `supabase/functions/api/clients/rmClient.ts`:

```ts
import { NotFoundError, UpstreamError } from '../lib/errors.ts'
import type { CharacterQuery, EpisodeQuery, LocationQuery } from '../types.ts'

const BASE_URL = 'https://rickandmortyapi.com/api'

export type RawCharacter = {
  id: number
  name: string
  status: string
  species: string
  type: string
  gender: string
  image: string
  origin: { name: string; url: string }
  location: { name: string; url: string }
  episode: string[]
}

export type RawLocation = {
  id: number
  name: string
  type: string
  dimension: string
  residents: string[]
}

export type RawEpisode = {
  id: number
  name: string
  air_date: string
  episode: string
  characters: string[]
}

export type RmListResponse<T> = {
  info: { count: number; pages: number }
  results: T[]
}

export type FetchFn = (url: string) => Promise<Response>

const EMPTY: RmListResponse<never> = {
  info: { count: 0, pages: 0 },
  results: [],
}

function buildQuery(query: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  return params.toString()
}

export function createRmClient(fetchFn: FetchFn = fetch) {
  async function request(path: string): Promise<Response> {
    try {
      return await fetchFn(`${BASE_URL}${path}`)
    } catch (cause) {
      throw new UpstreamError(
        `Rick and Morty API unreachable: ${(cause as Error).message}`,
      )
    }
  }

  async function getList<T>(path: string): Promise<RmListResponse<T>> {
    const response = await request(path)

    // The upstream API answers 404 for an empty result set, which is a
    // normal outcome for a filter that matches nothing, not a failure.
    if (response.status === 404) {
      return EMPTY as RmListResponse<T>
    }

    if (!response.ok) {
      throw new UpstreamError(`Rick and Morty API returned ${response.status}`)
    }

    return await response.json() as RmListResponse<T>
  }

  async function getOne<T>(path: string): Promise<T> {
    const response = await request(path)

    // Here a 404 is a genuine miss rather than an empty result set, and the
    // browser has to see it as one.
    if (response.status === 404) {
      throw new NotFoundError(`No record at ${path}`)
    }

    if (!response.ok) {
      throw new UpstreamError(`Rick and Morty API returned ${response.status}`)
    }

    return await response.json() as T
  }

  async function getMany<T>(path: string, ids: number[]): Promise<T[]> {
    if (ids.length === 0) return []

    // The batch endpoint answers with a bare object when exactly one id is
    // requested and with an array otherwise.
    const body = await getOne<T | T[]>(`${path}/${ids.join(',')}`)
    return Array.isArray(body) ? body : [body]
  }

  return {
    listCharacters(query: CharacterQuery) {
      const search = buildQuery({
        page: query.page,
        name: query.name,
        status: query.status,
        species: query.species,
        gender: query.gender,
      })
      return getList<RawCharacter>(`/character?${search}`)
    },

    getCharacter(id: number) {
      return getOne<RawCharacter>(`/character/${id}`)
    },

    getCharactersByIds(ids: number[]) {
      return getMany<RawCharacter>('/character', ids)
    },

    listLocations(query: LocationQuery) {
      const search = buildQuery({
        page: query.page,
        name: query.name,
        type: query.type,
        dimension: query.dimension,
      })
      return getList<RawLocation>(`/location?${search}`)
    },

    getLocation(id: number) {
      return getOne<RawLocation>(`/location/${id}`)
    },

    listEpisodes(query: EpisodeQuery) {
      const search = buildQuery({
        page: query.page,
        name: query.name,
        episode: query.episode,
      })
      return getList<RawEpisode>(`/episode?${search}`)
    },

    getEpisode(id: number) {
      return getOne<RawEpisode>(`/episode/${id}`)
    },

    getEpisodesByIds(ids: number[]) {
      return getMany<RawEpisode>('/episode', ids)
    },
  }
}

export type RmClient = ReturnType<typeof createRmClient>
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm run test:api
```

Expected: PASS — 48 tests. The six original client tests pass unchanged, which proves the list path did not move.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/api/clients/rmClient.ts supabase/functions/api/tests/rmClient_test.ts
git commit -m "feat: fetch single entities and id batches from the upstream API"
```

---

## Task 4: The character detail service

**Files:**
- Modify: `supabase/functions/api/services/characters.ts`
- Modify: `supabase/functions/api/tests/characters_test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `supabase/functions/api/tests/characters_test.ts`:

```ts
function rawEpisode(id: number, name: string, code: string) {
  return {
    id,
    name,
    air_date: 'December 2, 2013',
    episode: code,
    characters: ['https://rickandmortyapi.com/api/character/1'],
  }
}

function stubDetailClient(
  character: RawCharacter,
  episodes: ReturnType<typeof rawEpisode>[] = [],
) {
  const seen: number[][] = []
  return {
    client: {
      listCharacters: async () => ({ info: { count: 0, pages: 0 }, results: [] }),
      getCharacter: async () => character,
      getEpisodesByIds: async (ids: number[]) => {
        seen.push(ids)
        return episodes
      },
    },
    seen,
  }
}

Deno.test('expands a character with its origin, location, and episodes', async () => {
  const { client } = stubDetailClient(rawCharacter(), [
    rawEpisode(1, 'Pilot', 'S01E01'),
    rawEpisode(2, 'Lawnmower Dog', 'S01E02'),
  ])
  const service = createCharacterService(client, passthroughCache)

  const result = await service.getCharacter(1)

  assertEquals(result.payload.character.name, 'Rick Sanchez')
  assertEquals(result.payload.origin, {
    id: 1,
    name: 'Earth (C-137)',
    resolved: true,
  })
  assertEquals(result.payload.location, {
    id: 3,
    name: 'Citadel of Ricks',
    resolved: true,
  })
  assertEquals(result.payload.episodes, [
    { id: 1, name: 'Pilot', episode: 'S01E01' },
    { id: 2, name: 'Lawnmower Dog', episode: 'S01E02' },
  ])
})

Deno.test('marks an unknown origin as unresolved on the detail response', async () => {
  const { client } = stubDetailClient(
    rawCharacter({ origin: { name: 'unknown', url: '' } }),
  )
  const service = createCharacterService(client, passthroughCache)

  const result = await service.getCharacter(1)

  assertEquals(result.payload.origin, { id: null, name: 'unknown', resolved: false })
})

Deno.test('asks for every episode in a single batch', async () => {
  const { client, seen } = stubDetailClient(rawCharacter())
  const service = createCharacterService(client, passthroughCache)

  await service.getCharacter(1)

  assertEquals(seen.length, 1)
  assertEquals(seen[0], [1, 2])
})

Deno.test('caches a character detail under its own key', async () => {
  const keys: string[] = []
  const recordingCache = {
    resolve: async <T>(key: string, _ttl: number, load: () => Promise<T>) => {
      keys.push(key)
      return { payload: await load(), stale: false }
    },
  }
  const { client } = stubDetailClient(rawCharacter())
  const service = createCharacterService(client, recordingCache)

  await service.getCharacter(7)

  assertEquals(keys, ['character/7'])
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm run test:api
```

Expected: FAIL — `service.getCharacter is not a function`.

- [ ] **Step 3: Extend the service**

In `supabase/functions/api/services/characters.ts`, replace the import block and the `CharacterClient` type:

```ts
import { buildCacheKey, type Resolved } from '../lib/cache.ts'
import { PAGE_SIZE, TTL_SECONDS, idsFromUrls, toRef, toRelationRef } from './refs.ts'
import type { RawCharacter, RawEpisode, RmListResponse } from '../clients/rmClient.ts'
import type {
  Character,
  CharacterDetail,
  CharacterQuery,
  ListResponse,
} from '../types.ts'

type CharacterClient = {
  listCharacters(query: CharacterQuery): Promise<RmListResponse<RawCharacter>>
  getCharacter(id: number): Promise<RawCharacter>
  getEpisodesByIds(ids: number[]): Promise<RawEpisode[]>
}
```

Then add the detail function inside `createCharacterService`, immediately before the `return` statement:

```ts
  async function getCharacter(id: number): Promise<Resolved<CharacterDetail>> {
    // A detail request carries no parameters, so the path alone is the key.
    return await cache.resolve(`character/${id}`, TTL_SECONDS, async () => {
      const raw = await client.getCharacter(id)
      const episodes = await client.getEpisodesByIds(idsFromUrls(raw.episode))

      return {
        character: toCharacter(raw),
        origin: toRelationRef(raw.origin),
        location: toRelationRef(raw.location),
        episodes: episodes.map((episode) => ({
          id: episode.id,
          name: episode.name,
          episode: episode.episode,
        })),
      }
    })
  }
```

and change the return line to:

```ts
  return { listCharacters, getCharacter }
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm run test:api
```

Expected: PASS — 52 tests.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/api/services/characters.ts supabase/functions/api/tests/characters_test.ts
git commit -m "feat: expand a character with its relations in one response"
```

---

## Task 5: Id validation, the detail handler, and the services bundle

The router grows from one route to six, so it switches from a single service argument to a bundle. The bundle is introduced here with only its `characters` field; tasks 7 and 9 fill in the rest.

**Files:**
- Modify: `supabase/functions/api/lib/validate.ts`
- Modify: `supabase/functions/api/tests/validate_test.ts`
- Modify: `supabase/functions/api/handlers/characters.ts`
- Modify: `supabase/functions/api/router.ts`
- Modify: `supabase/functions/api/tests/router_test.ts`
- Modify: `supabase/functions/api/index.ts`

- [ ] **Step 1: Write the failing validation tests**

Append to `supabase/functions/api/tests/validate_test.ts`:

```ts
Deno.test('accepts a numeric id', () => {
  assertEquals(parseId('42'), 42)
})

Deno.test('rejects a non-numeric id', () => {
  assertThrows(() => parseId('rick'), ValidationError)
})

Deno.test('rejects a zero id', () => {
  assertThrows(() => parseId('0'), ValidationError)
})
```

Make sure the imports at the top of that file include `parseId`, for example:

```ts
import { parseCharacterQuery, parseId } from '../lib/validate.ts'
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm run test:api
```

Expected: FAIL — `parseId is not exported`.

- [ ] **Step 3: Add the id parser**

Append to `supabase/functions/api/lib/validate.ts`:

```ts
export function parseId(raw: string): number {
  if (!/^\d+$/.test(raw)) {
    throw new ValidationError(`id must be a positive integer, received "${raw}"`)
  }
  const id = Number(raw)
  if (id < 1) {
    throw new ValidationError(`id must be at least 1, received ${id}`)
  }
  return id
}
```

- [ ] **Step 4: Extend the character handler**

Replace the contents of `supabase/functions/api/handlers/characters.ts`:

```ts
import { parseCharacterQuery, parseId } from '../lib/validate.ts'
import type { Resolved } from '../lib/cache.ts'
import type {
  Character,
  CharacterDetail,
  CharacterQuery,
  ListResponse,
} from '../types.ts'

export type CharacterService = {
  listCharacters(
    query: CharacterQuery,
  ): Promise<Resolved<ListResponse<Character>>>
  getCharacter(id: number): Promise<Resolved<CharacterDetail>>
}

export async function handleListCharacters(
  url: URL,
  service: CharacterService,
): Promise<{ body: ListResponse<Character>; stale: boolean }> {
  const query = parseCharacterQuery(url.searchParams)
  const result = await service.listCharacters(query)
  return { body: result.payload, stale: result.stale }
}

export async function handleGetCharacter(
  rawId: string,
  service: CharacterService,
): Promise<{ body: CharacterDetail; stale: boolean }> {
  const result = await service.getCharacter(parseId(rawId))
  return { body: result.payload, stale: result.stale }
}
```

- [ ] **Step 5: Rewrite the router test for the bundle**

Replace the contents of `supabase/functions/api/tests/router_test.ts`:

```ts
import { assertEquals } from 'jsr:@std/assert'
import { normalizePath, createRouter } from '../router.ts'
import { NotFoundError } from '../lib/errors.ts'

const emptyList = {
  items: [],
  pagination: { page: 1, pageCount: 0, total: 0, pageSize: 20 },
}

const character = {
  id: 1,
  name: 'Rick Sanchez',
  status: 'Alive',
  species: 'Human',
  type: '',
  gender: 'Male',
  image: 'https://example.test/1.jpeg',
  origin: { name: 'Earth (C-137)', id: 1 },
  location: { name: 'Citadel of Ricks', id: 3 },
  episodeCount: 51,
}

// Typed against the router's own bundle so that an override with the wrong
// shape fails type-checking rather than at runtime.
type StubServices = Parameters<typeof createRouter>[0]

function services(overrides: Partial<StubServices> = {}): StubServices {
  return {
    characters: {
      listCharacters: async (query: { page: number }) => ({
        payload: { ...emptyList, pagination: { ...emptyList.pagination, page: query.page, pageCount: 42 } },
        stale: false,
      }),
      getCharacter: async (id: number) => ({
        payload: {
          character: { ...character, id },
          origin: { id: 1, name: 'Earth (C-137)', resolved: true },
          location: { id: 3, name: 'Citadel of Ricks', resolved: true },
          episodes: [],
        },
        stale: false,
      }),
    },
    ...overrides,
  }
}

const detail = {
  character,
  origin: { id: 1, name: 'Earth (C-137)', resolved: true },
  location: { id: 3, name: 'Citadel of Ricks', resolved: true },
  episodes: [],
}

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
  const router = createRouter(services())

  const response = await router(new Request('https://x.test/api/health'))

  assertEquals(response.status, 200)
  assertEquals((await response.json()).status, 'ok')
})

Deno.test('routes character list requests to the service', async () => {
  const router = createRouter(services())

  const response = await router(
    new Request('https://x.test/api/characters?page=5'),
  )
  const body = await response.json()

  assertEquals(response.status, 200)
  assertEquals(body.pagination.page, 5)
  assertEquals(body.pagination.pageCount, 42)
})

Deno.test('routes a character detail request by id', async () => {
  const router = createRouter(services())

  const response = await router(new Request('https://x.test/api/characters/7'))
  const body = await response.json()

  assertEquals(response.status, 200)
  assertEquals(body.character.id, 7)
})

Deno.test('returns 400 for a non-numeric detail id', async () => {
  const router = createRouter(services())

  const response = await router(new Request('https://x.test/api/characters/rick'))
  const body = await response.json()

  assertEquals(response.status, 400)
  assertEquals(body.error.code, 'INVALID_PARAMETER')
})

Deno.test('returns 404 when the service reports a missing entity', async () => {
  const router = createRouter(
    services({
      characters: {
        listCharacters: async () => ({ payload: emptyList, stale: false }),
        getCharacter: async () => {
          throw new NotFoundError('No record at /character/99999')
        },
      },
    }),
  )

  const response = await router(new Request('https://x.test/api/characters/99999'))
  const body = await response.json()

  assertEquals(response.status, 404)
  assertEquals(body.error.code, 'NOT_FOUND')
})

Deno.test('marks a stale response with a header', async () => {
  const router = createRouter(
    services({
      characters: {
        listCharacters: async () => ({ payload: emptyList, stale: true }),
        getCharacter: async () => ({ payload: detail, stale: true }),
      },
    }),
  )

  const response = await router(new Request('https://x.test/api/characters'))

  assertEquals(response.headers.get('X-Cache'), 'stale')
})

Deno.test('returns 400 with a typed code for an invalid parameter', async () => {
  const router = createRouter(services())

  const response = await router(
    new Request('https://x.test/api/characters?status=undead'),
  )
  const body = await response.json()

  assertEquals(response.status, 400)
  assertEquals(body.error.code, 'INVALID_PARAMETER')
})

Deno.test('returns 404 for an unknown route', async () => {
  const router = createRouter(services())

  const response = await router(new Request('https://x.test/api/nope'))

  assertEquals(response.status, 404)
})
```

- [ ] **Step 6: Rewrite the router**

Replace the contents of `supabase/functions/api/router.ts`:

```ts
import {
  handleGetCharacter,
  handleListCharacters,
  type CharacterService,
} from './handlers/characters.ts'
import { AppError } from './lib/errors.ts'

const JSON_HEADERS = { 'content-type': 'application/json' }

export type Services = {
  characters: CharacterService
}

/**
 * Supabase routes requests to `/functions/v1/<name>/...`, so the function
 * name arrives as the first path segment. Strip it so handlers see clean paths.
 */
export function normalizePath(pathname: string): string {
  const stripped = pathname.replace(/^\/+api/, '')
  return stripped === '' || stripped === '/' ? '/' : stripped.replace(/\/+$/, '')
}

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...extra },
  })
}

function staleHeaders(stale: boolean): Record<string, string> {
  return stale ? { 'X-Cache': 'stale' } : {}
}

function errorResponse(error: unknown): Response {
  if (error instanceof AppError) {
    return json(
      { error: { code: error.code, message: error.message } },
      error.status,
    )
  }
  return json(
    { error: { code: 'INTERNAL', message: 'Unexpected failure' } },
    500,
  )
}

export function createRouter(services: Services) {
  return async function route(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = normalizePath(url.pathname)

    try {
      if (path === '/health') {
        return json({ status: 'ok' })
      }

      if (request.method !== 'GET') {
        return json(
          { error: { code: 'NOT_FOUND', message: `No route for ${path}` } },
          404,
        )
      }

      if (path === '/characters') {
        const { body, stale } = await handleListCharacters(url, services.characters)
        return json(body, 200, staleHeaders(stale))
      }

      // The id segment is matched loosely so that a malformed id reaches the
      // validator and answers 400, rather than falling through to a 404.
      const detail = path.match(/^\/(characters)\/([^/]+)$/)
      if (detail) {
        const { body, stale } = await handleGetCharacter(detail[2], services.characters)
        return json(body, 200, staleHeaders(stale))
      }

      return json(
        { error: { code: 'NOT_FOUND', message: `No route for ${path}` } },
        404,
      )
    } catch (error) {
      return errorResponse(error)
    }
  }
}
```

- [ ] **Step 7: Update the entry point**

In `supabase/functions/api/index.ts`, replace the wiring lines:

```ts
const service = createCharacterService(createRmClient(), createCache(store))
const route = createRouter(service)
```

with:

```ts
const client = createRmClient()
const cache = createCache(store)
const route = createRouter({
  characters: createCharacterService(client, cache),
})
```

- [ ] **Step 8: Run the tests to verify they pass**

```bash
npm run test:api
```

Expected: PASS — 58 tests.

- [ ] **Step 9: Commit**

```bash
git add supabase/functions/api
git commit -m "feat: serve character detail requests through a routed services bundle"
```

---

## Task 6: The locations service

**Files:**
- Modify: `supabase/functions/api/lib/validate.ts`
- Modify: `supabase/functions/api/tests/validate_test.ts`
- Create: `supabase/functions/api/services/locations.ts`
- Create: `supabase/functions/api/tests/locations_test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `supabase/functions/api/tests/validate_test.ts`:

```ts
Deno.test('reads every location filter out of the query string', () => {
  const query = parseLocationQuery(
    new URLSearchParams('page=2&name=earth&type=Planet&dimension=C-137'),
  )

  assertEquals(query, {
    page: 2,
    name: 'earth',
    type: 'Planet',
    dimension: 'C-137',
  })
})

Deno.test('defaults the location page to 1', () => {
  const query = parseLocationQuery(new URLSearchParams(''))
  assertEquals(query.page, 1)
})

Deno.test('rejects a malformed location page', () => {
  assertThrows(
    () => parseLocationQuery(new URLSearchParams('page=abc')),
    ValidationError,
  )
})
```

Extend the import at the top of that file:

```ts
import { parseCharacterQuery, parseId, parseLocationQuery } from '../lib/validate.ts'
```

Create `supabase/functions/api/tests/locations_test.ts`:

```ts
import { assertEquals } from 'jsr:@std/assert'
import { createLocationService } from '../services/locations.ts'
import type { RawCharacter, RawLocation } from '../clients/rmClient.ts'

function rawLocation(overrides: Partial<RawLocation> = {}): RawLocation {
  return {
    id: 1,
    name: 'Earth (C-137)',
    type: 'Planet',
    dimension: 'Dimension C-137',
    residents: [
      'https://rickandmortyapi.com/api/character/38',
      'https://rickandmortyapi.com/api/character/45',
    ],
    ...overrides,
  }
}

function rawResident(id: number, name: string): RawCharacter {
  return {
    id,
    name,
    status: 'Alive',
    species: 'Human',
    type: '',
    gender: 'Male',
    image: `https://example.test/${id}.jpeg`,
    origin: { name: 'unknown', url: '' },
    location: { name: 'Earth (C-137)', url: 'https://rickandmortyapi.com/api/location/1' },
    episode: [],
  }
}

const passthroughCache = {
  resolve: async <T>(_key: string, _ttl: number, load: () => Promise<T>) => ({
    payload: await load(),
    stale: false,
  }),
}

function stubClient(
  list: { info: { count: number; pages: number }; results: RawLocation[] },
  location: RawLocation = rawLocation(),
  residents: RawCharacter[] = [],
) {
  const batches: number[][] = []
  return {
    client: {
      listLocations: async () => list,
      getLocation: async () => location,
      getCharactersByIds: async (ids: number[]) => {
        batches.push(ids)
        return residents
      },
    },
    batches,
  }
}

Deno.test('shapes a location list with its resident counts', async () => {
  const { client } = stubClient({
    info: { count: 126, pages: 7 },
    results: [rawLocation()],
  })
  const service = createLocationService(client, passthroughCache)

  const result = await service.listLocations({ page: 1 })

  assertEquals(result.payload.items[0], {
    id: 1,
    name: 'Earth (C-137)',
    type: 'Planet',
    dimension: 'Dimension C-137',
    residentCount: 2,
  })
  assertEquals(result.payload.pagination, {
    page: 1,
    pageCount: 7,
    total: 126,
    pageSize: 20,
  })
})

Deno.test('expands a location with its resident roster', async () => {
  const { client } = stubClient(
    { info: { count: 0, pages: 0 }, results: [] },
    rawLocation(),
    [rawResident(38, 'Beth Smith'), rawResident(45, 'Bruce Chutback')],
  )
  const service = createLocationService(client, passthroughCache)

  const result = await service.getLocation(1)

  assertEquals(result.payload.location.name, 'Earth (C-137)')
  assertEquals(result.payload.residents, [
    { id: 38, name: 'Beth Smith', status: 'Alive', image: 'https://example.test/38.jpeg' },
    { id: 45, name: 'Bruce Chutback', status: 'Alive', image: 'https://example.test/45.jpeg' },
  ])
})

Deno.test('asks for every resident in a single batch', async () => {
  const { client, batches } = stubClient(
    { info: { count: 0, pages: 0 }, results: [] },
    rawLocation(),
  )
  const service = createLocationService(client, passthroughCache)

  await service.getLocation(1)

  assertEquals(batches, [[38, 45]])
})

Deno.test('handles a location with no residents at all', async () => {
  const { client } = stubClient(
    { info: { count: 0, pages: 0 }, results: [] },
    rawLocation({ residents: [] }),
  )
  const service = createLocationService(client, passthroughCache)

  const result = await service.getLocation(1)

  assertEquals(result.payload.residents, [])
  assertEquals(result.payload.location.residentCount, 0)
})

Deno.test('caches a location list under a sorted key', async () => {
  const keys: string[] = []
  const recordingCache = {
    resolve: async <T>(key: string, _ttl: number, load: () => Promise<T>) => {
      keys.push(key)
      return { payload: await load(), stale: false }
    },
  }
  const { client } = stubClient({ info: { count: 0, pages: 0 }, results: [] })
  const service = createLocationService(client, recordingCache)

  await service.listLocations({ page: 2, dimension: 'C-137', name: 'earth' })

  assertEquals(keys, ['locations?dimension=C-137&name=earth&page=2'])
})

Deno.test('caches a location detail under its own key', async () => {
  const keys: string[] = []
  const recordingCache = {
    resolve: async <T>(key: string, _ttl: number, load: () => Promise<T>) => {
      keys.push(key)
      return { payload: await load(), stale: false }
    },
  }
  const { client } = stubClient(
    { info: { count: 0, pages: 0 }, results: [] },
    rawLocation({ residents: [] }),
  )
  const service = createLocationService(client, recordingCache)

  await service.getLocation(3)

  assertEquals(keys, ['location/3'])
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm run test:api
```

Expected: FAIL — module `../services/locations.ts` not found.

- [ ] **Step 3: Add the location query parser**

Append to `supabase/functions/api/lib/validate.ts`:

```ts
export function parseLocationQuery(params: URLSearchParams): LocationQuery {
  return {
    page: parsePage(params.get('page')),
    name: parseText(params.get('name')),
    type: parseText(params.get('type')),
    dimension: parseText(params.get('dimension')),
  }
}
```

and extend the type import at the top of that file:

```ts
import type {
  CharacterGender,
  CharacterQuery,
  CharacterStatus,
  LocationQuery,
} from '../types.ts'
```

- [ ] **Step 4: Write the service**

Create `supabase/functions/api/services/locations.ts`:

```ts
import { buildCacheKey, type Resolved } from '../lib/cache.ts'
import { PAGE_SIZE, TTL_SECONDS, idsFromUrls } from './refs.ts'
import type { RawCharacter, RawLocation, RmListResponse } from '../clients/rmClient.ts'
import type {
  CharacterSummary,
  ListResponse,
  Location,
  LocationDetail,
  LocationQuery,
} from '../types.ts'

type LocationClient = {
  listLocations(query: LocationQuery): Promise<RmListResponse<RawLocation>>
  getLocation(id: number): Promise<RawLocation>
  getCharactersByIds(ids: number[]): Promise<RawCharacter[]>
}

type CacheLike = {
  resolve<T>(
    key: string,
    ttlSeconds: number,
    load: () => Promise<T>,
  ): Promise<Resolved<T>>
}

function toLocation(raw: RawLocation): Location {
  return {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    dimension: raw.dimension,
    residentCount: raw.residents.length,
  }
}

export function toSummary(raw: RawCharacter): CharacterSummary {
  return { id: raw.id, name: raw.name, status: raw.status, image: raw.image }
}

export function createLocationService(client: LocationClient, cache: CacheLike) {
  async function listLocations(
    query: LocationQuery,
  ): Promise<Resolved<ListResponse<Location>>> {
    const key = buildCacheKey('locations', {
      page: String(query.page),
      name: query.name,
      type: query.type,
      dimension: query.dimension,
    })

    return await cache.resolve(key, TTL_SECONDS, async () => {
      const raw = await client.listLocations(query)
      return {
        items: raw.results.map(toLocation),
        pagination: {
          page: query.page,
          pageCount: raw.info.pages,
          total: raw.info.count,
          pageSize: PAGE_SIZE,
        },
      }
    })
  }

  async function getLocation(id: number): Promise<Resolved<LocationDetail>> {
    return await cache.resolve(`location/${id}`, TTL_SECONDS, async () => {
      const raw = await client.getLocation(id)
      const residents = await client.getCharactersByIds(idsFromUrls(raw.residents))

      return {
        location: toLocation(raw),
        residents: residents.map(toSummary),
      }
    })
  }

  return { listLocations, getLocation }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npm run test:api
```

Expected: PASS — 67 tests.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/api/lib/validate.ts supabase/functions/api/services/locations.ts supabase/functions/api/tests
git commit -m "feat: list locations and expand one with its resident roster"
```

---

## Task 7: The locations handler and routes

**Files:**
- Create: `supabase/functions/api/handlers/locations.ts`
- Modify: `supabase/functions/api/router.ts`
- Modify: `supabase/functions/api/tests/router_test.ts`
- Modify: `supabase/functions/api/index.ts`

- [ ] **Step 1: Write the failing tests**

In `supabase/functions/api/tests/router_test.ts`, add the location stub to the `services` helper, immediately after the `characters` block:

```ts
    locations: {
      listLocations: async () => ({ payload: emptyList, stale: false }),
      getLocation: async (id: number) => ({
        payload: {
          location: {
            id,
            name: 'Earth (C-137)',
            type: 'Planet',
            dimension: 'Dimension C-137',
            residentCount: 0,
          },
          residents: [],
        },
        stale: false,
      }),
    },
```

Then append to the same file:

```ts
Deno.test('routes location list requests to the service', async () => {
  const router = createRouter(services())

  const response = await router(new Request('https://x.test/api/locations?page=2'))

  assertEquals(response.status, 200)
})

Deno.test('routes a location detail request by id', async () => {
  const router = createRouter(services())

  const response = await router(new Request('https://x.test/api/locations/3'))
  const body = await response.json()

  assertEquals(response.status, 200)
  assertEquals(body.location.id, 3)
})

Deno.test('returns 400 for a non-numeric location id', async () => {
  const router = createRouter(services())

  const response = await router(new Request('https://x.test/api/locations/earth'))
  const body = await response.json()

  assertEquals(response.status, 400)
  assertEquals(body.error.code, 'INVALID_PARAMETER')
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm run test:api
```

Expected: FAIL — the location routes answer 404.

- [ ] **Step 3: Write the handler**

Create `supabase/functions/api/handlers/locations.ts`:

```ts
import { parseId, parseLocationQuery } from '../lib/validate.ts'
import type { Resolved } from '../lib/cache.ts'
import type {
  ListResponse,
  Location,
  LocationDetail,
  LocationQuery,
} from '../types.ts'

export type LocationService = {
  listLocations(query: LocationQuery): Promise<Resolved<ListResponse<Location>>>
  getLocation(id: number): Promise<Resolved<LocationDetail>>
}

export async function handleListLocations(
  url: URL,
  service: LocationService,
): Promise<{ body: ListResponse<Location>; stale: boolean }> {
  const query = parseLocationQuery(url.searchParams)
  const result = await service.listLocations(query)
  return { body: result.payload, stale: result.stale }
}

export async function handleGetLocation(
  rawId: string,
  service: LocationService,
): Promise<{ body: LocationDetail; stale: boolean }> {
  const result = await service.getLocation(parseId(rawId))
  return { body: result.payload, stale: result.stale }
}
```

- [ ] **Step 4: Add the routes**

In `supabase/functions/api/router.ts`, extend the import block:

```ts
import {
  handleGetLocation,
  handleListLocations,
  type LocationService,
} from './handlers/locations.ts'
```

extend the bundle type:

```ts
export type Services = {
  characters: CharacterService
  locations: LocationService
}
```

add the list route immediately after the characters list route:

```ts
      if (path === '/locations') {
        const { body, stale } = await handleListLocations(url, services.locations)
        return json(body, 200, staleHeaders(stale))
      }
```

and replace the detail match block with:

```ts
      // The id segment is matched loosely so that a malformed id reaches the
      // validator and answers 400, rather than falling through to a 404.
      const detail = path.match(/^\/(characters|locations)\/([^/]+)$/)
      if (detail) {
        const [, section, rawId] = detail

        if (section === 'characters') {
          const { body, stale } = await handleGetCharacter(rawId, services.characters)
          return json(body, 200, staleHeaders(stale))
        }

        const { body, stale } = await handleGetLocation(rawId, services.locations)
        return json(body, 200, staleHeaders(stale))
      }
```

- [ ] **Step 5: Wire the service in the entry point**

In `supabase/functions/api/index.ts`, add the import:

```ts
import { createLocationService } from './services/locations.ts'
```

and extend the bundle:

```ts
const route = createRouter({
  characters: createCharacterService(client, cache),
  locations: createLocationService(client, cache),
})
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
npm run test:api
```

Expected: PASS — 70 tests.

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/api
git commit -m "feat: route location list and detail requests"
```

---

## Task 8: The episodes service

**Files:**
- Modify: `supabase/functions/api/lib/validate.ts`
- Modify: `supabase/functions/api/tests/validate_test.ts`
- Create: `supabase/functions/api/services/episodes.ts`
- Create: `supabase/functions/api/tests/episodes_test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `supabase/functions/api/tests/validate_test.ts`:

```ts
Deno.test('reads every episode filter out of the query string', () => {
  const query = parseEpisodeQuery(new URLSearchParams('page=3&name=pilot&episode=S01'))

  assertEquals(query, { page: 3, name: 'pilot', episode: 'S01' })
})

Deno.test('defaults the episode page to 1', () => {
  assertEquals(parseEpisodeQuery(new URLSearchParams('')).page, 1)
})
```

Extend the import at the top of that file:

```ts
import {
  parseCharacterQuery,
  parseEpisodeQuery,
  parseId,
  parseLocationQuery,
} from '../lib/validate.ts'
```

Create `supabase/functions/api/tests/episodes_test.ts`:

```ts
import { assertEquals } from 'jsr:@std/assert'
import { createEpisodeService } from '../services/episodes.ts'
import type { RawCharacter, RawEpisode } from '../clients/rmClient.ts'

function rawEpisode(overrides: Partial<RawEpisode> = {}): RawEpisode {
  return {
    id: 1,
    name: 'Pilot',
    air_date: 'December 2, 2013',
    episode: 'S01E01',
    characters: [
      'https://rickandmortyapi.com/api/character/1',
      'https://rickandmortyapi.com/api/character/2',
    ],
    ...overrides,
  }
}

function rawCharacter(id: number, name: string): RawCharacter {
  return {
    id,
    name,
    status: 'Alive',
    species: 'Human',
    type: '',
    gender: 'Male',
    image: `https://example.test/${id}.jpeg`,
    origin: { name: 'unknown', url: '' },
    location: { name: 'unknown', url: '' },
    episode: [],
  }
}

const passthroughCache = {
  resolve: async <T>(_key: string, _ttl: number, load: () => Promise<T>) => ({
    payload: await load(),
    stale: false,
  }),
}

function stubClient(
  list: { info: { count: number; pages: number }; results: RawEpisode[] },
  episode: RawEpisode = rawEpisode(),
  characters: RawCharacter[] = [],
) {
  const batches: number[][] = []
  return {
    client: {
      listEpisodes: async () => list,
      getEpisode: async () => episode,
      getCharactersByIds: async (ids: number[]) => {
        batches.push(ids)
        return characters
      },
    },
    batches,
  }
}

Deno.test('renames air_date to airDate and counts the cast', async () => {
  const { client } = stubClient({ info: { count: 51, pages: 3 }, results: [rawEpisode()] })
  const service = createEpisodeService(client, passthroughCache)

  const result = await service.listEpisodes({ page: 1 })

  assertEquals(result.payload.items[0], {
    id: 1,
    name: 'Pilot',
    airDate: 'December 2, 2013',
    episode: 'S01E01',
    characterCount: 2,
  })
  assertEquals(result.payload.pagination.total, 51)
})

Deno.test('expands an episode with the characters present', async () => {
  const { client } = stubClient(
    { info: { count: 0, pages: 0 }, results: [] },
    rawEpisode(),
    [rawCharacter(1, 'Rick Sanchez'), rawCharacter(2, 'Morty Smith')],
  )
  const service = createEpisodeService(client, passthroughCache)

  const result = await service.getEpisode(1)

  assertEquals(result.payload.episode.episode, 'S01E01')
  assertEquals(result.payload.characters, [
    { id: 1, name: 'Rick Sanchez', status: 'Alive', image: 'https://example.test/1.jpeg' },
    { id: 2, name: 'Morty Smith', status: 'Alive', image: 'https://example.test/2.jpeg' },
  ])
})

Deno.test('asks for the whole cast in a single batch', async () => {
  const { client, batches } = stubClient(
    { info: { count: 0, pages: 0 }, results: [] },
    rawEpisode(),
  )
  const service = createEpisodeService(client, passthroughCache)

  await service.getEpisode(1)

  assertEquals(batches, [[1, 2]])
})

Deno.test('caches an episode detail under its own key', async () => {
  const keys: string[] = []
  const recordingCache = {
    resolve: async <T>(key: string, _ttl: number, load: () => Promise<T>) => {
      keys.push(key)
      return { payload: await load(), stale: false }
    },
  }
  const { client } = stubClient(
    { info: { count: 0, pages: 0 }, results: [] },
    rawEpisode({ characters: [] }),
  )
  const service = createEpisodeService(client, recordingCache)

  await service.getEpisode(5)

  assertEquals(keys, ['episode/5'])
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm run test:api
```

Expected: FAIL — module `../services/episodes.ts` not found.

- [ ] **Step 3: Add the episode query parser**

Append to `supabase/functions/api/lib/validate.ts`:

```ts
export function parseEpisodeQuery(params: URLSearchParams): EpisodeQuery {
  return {
    page: parsePage(params.get('page')),
    name: parseText(params.get('name')),
    episode: parseText(params.get('episode')),
  }
}
```

and extend the type import at the top of that file to include `EpisodeQuery`:

```ts
import type {
  CharacterGender,
  CharacterQuery,
  CharacterStatus,
  EpisodeQuery,
  LocationQuery,
} from '../types.ts'
```

- [ ] **Step 4: Write the service**

Create `supabase/functions/api/services/episodes.ts`:

```ts
import { buildCacheKey, type Resolved } from '../lib/cache.ts'
import { PAGE_SIZE, TTL_SECONDS, idsFromUrls } from './refs.ts'
import { toSummary } from './locations.ts'
import type { RawCharacter, RawEpisode, RmListResponse } from '../clients/rmClient.ts'
import type {
  Episode,
  EpisodeDetail,
  EpisodeQuery,
  ListResponse,
} from '../types.ts'

type EpisodeClient = {
  listEpisodes(query: EpisodeQuery): Promise<RmListResponse<RawEpisode>>
  getEpisode(id: number): Promise<RawEpisode>
  getCharactersByIds(ids: number[]): Promise<RawCharacter[]>
}

type CacheLike = {
  resolve<T>(
    key: string,
    ttlSeconds: number,
    load: () => Promise<T>,
  ): Promise<Resolved<T>>
}

function toEpisode(raw: RawEpisode): Episode {
  return {
    id: raw.id,
    name: raw.name,
    // The upstream field is snake_case; the contract with the frontend is not.
    airDate: raw.air_date,
    episode: raw.episode,
    characterCount: raw.characters.length,
  }
}

export function createEpisodeService(client: EpisodeClient, cache: CacheLike) {
  async function listEpisodes(
    query: EpisodeQuery,
  ): Promise<Resolved<ListResponse<Episode>>> {
    const key = buildCacheKey('episodes', {
      page: String(query.page),
      name: query.name,
      episode: query.episode,
    })

    return await cache.resolve(key, TTL_SECONDS, async () => {
      const raw = await client.listEpisodes(query)
      return {
        items: raw.results.map(toEpisode),
        pagination: {
          page: query.page,
          pageCount: raw.info.pages,
          total: raw.info.count,
          pageSize: PAGE_SIZE,
        },
      }
    })
  }

  async function getEpisode(id: number): Promise<Resolved<EpisodeDetail>> {
    return await cache.resolve(`episode/${id}`, TTL_SECONDS, async () => {
      const raw = await client.getEpisode(id)
      const characters = await client.getCharactersByIds(idsFromUrls(raw.characters))

      return {
        episode: toEpisode(raw),
        characters: characters.map(toSummary),
      }
    })
  }

  return { listEpisodes, getEpisode }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npm run test:api
```

Expected: PASS — 76 tests.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/api/lib/validate.ts supabase/functions/api/services/episodes.ts supabase/functions/api/tests
git commit -m "feat: list episodes and expand one with the characters present"
```

---

## Task 9: The episodes handler and routes

**Files:**
- Create: `supabase/functions/api/handlers/episodes.ts`
- Modify: `supabase/functions/api/router.ts`
- Modify: `supabase/functions/api/tests/router_test.ts`
- Modify: `supabase/functions/api/index.ts`

- [ ] **Step 1: Write the failing tests**

In `supabase/functions/api/tests/router_test.ts`, add the episode stub to the `services` helper, immediately after the `locations` block:

```ts
    episodes: {
      listEpisodes: async () => ({ payload: emptyList, stale: false }),
      getEpisode: async (id: number) => ({
        payload: {
          episode: {
            id,
            name: 'Pilot',
            airDate: 'December 2, 2013',
            episode: 'S01E01',
            characterCount: 0,
          },
          characters: [],
        },
        stale: false,
      }),
    },
```

Then append to the same file:

```ts
Deno.test('routes episode list requests to the service', async () => {
  const router = createRouter(services())

  const response = await router(new Request('https://x.test/api/episodes?episode=S03'))

  assertEquals(response.status, 200)
})

Deno.test('routes an episode detail request by id', async () => {
  const router = createRouter(services())

  const response = await router(new Request('https://x.test/api/episodes/5'))
  const body = await response.json()

  assertEquals(response.status, 200)
  assertEquals(body.episode.id, 5)
})

Deno.test('does not treat a nested path as a detail request', async () => {
  const router = createRouter(services())

  const response = await router(new Request('https://x.test/api/episodes/5/cast'))

  assertEquals(response.status, 404)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm run test:api
```

Expected: FAIL — the episode routes answer 404.

- [ ] **Step 3: Write the handler**

Create `supabase/functions/api/handlers/episodes.ts`:

```ts
import { parseEpisodeQuery, parseId } from '../lib/validate.ts'
import type { Resolved } from '../lib/cache.ts'
import type {
  Episode,
  EpisodeDetail,
  EpisodeQuery,
  ListResponse,
} from '../types.ts'

export type EpisodeService = {
  listEpisodes(query: EpisodeQuery): Promise<Resolved<ListResponse<Episode>>>
  getEpisode(id: number): Promise<Resolved<EpisodeDetail>>
}

export async function handleListEpisodes(
  url: URL,
  service: EpisodeService,
): Promise<{ body: ListResponse<Episode>; stale: boolean }> {
  const query = parseEpisodeQuery(url.searchParams)
  const result = await service.listEpisodes(query)
  return { body: result.payload, stale: result.stale }
}

export async function handleGetEpisode(
  rawId: string,
  service: EpisodeService,
): Promise<{ body: EpisodeDetail; stale: boolean }> {
  const result = await service.getEpisode(parseId(rawId))
  return { body: result.payload, stale: result.stale }
}
```

- [ ] **Step 4: Add the routes**

In `supabase/functions/api/router.ts`, extend the import block:

```ts
import {
  handleGetEpisode,
  handleListEpisodes,
  type EpisodeService,
} from './handlers/episodes.ts'
```

extend the bundle type:

```ts
export type Services = {
  characters: CharacterService
  locations: LocationService
  episodes: EpisodeService
}
```

add the list route after the locations list route:

```ts
      if (path === '/episodes') {
        const { body, stale } = await handleListEpisodes(url, services.episodes)
        return json(body, 200, staleHeaders(stale))
      }
```

and replace the detail match block with its final form:

```ts
      // The id segment is matched loosely so that a malformed id reaches the
      // validator and answers 400, rather than falling through to a 404.
      const detail = path.match(/^\/(characters|locations|episodes)\/([^/]+)$/)
      if (detail) {
        const [, section, rawId] = detail

        if (section === 'characters') {
          const { body, stale } = await handleGetCharacter(rawId, services.characters)
          return json(body, 200, staleHeaders(stale))
        }

        if (section === 'locations') {
          const { body, stale } = await handleGetLocation(rawId, services.locations)
          return json(body, 200, staleHeaders(stale))
        }

        const { body, stale } = await handleGetEpisode(rawId, services.episodes)
        return json(body, 200, staleHeaders(stale))
      }
```

- [ ] **Step 5: Wire the service in the entry point**

In `supabase/functions/api/index.ts`, add the import:

```ts
import { createEpisodeService } from './services/episodes.ts'
```

and complete the bundle:

```ts
const route = createRouter({
  characters: createCharacterService(client, cache),
  locations: createLocationService(client, cache),
  episodes: createEpisodeService(client, cache),
})
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
npm run test:api
```

Expected: PASS — 79 tests.

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/api
git commit -m "feat: route episode list and detail requests"
```

---

## Task 10: Deploy the function and verify the new endpoints

Spec §13.1: deploy as soon as a slice works, never in a batch at the end.

- [ ] **Step 1: Run the whole backend suite**

```bash
npm run test:api
```

Expected: PASS — 79 tests.

- [ ] **Step 2: Deploy**

```bash
npx supabase functions deploy api --no-verify-jwt
```

- [ ] **Step 3: Verify each new endpoint against the deployment**

```bash
BASE=https://coeupddmmjnjotarlnwg.supabase.co/functions/v1/api

curl -s "$BASE/characters/1" | head -c 400; echo
curl -s "$BASE/locations?page=1" | head -c 400; echo
curl -s "$BASE/locations/1" | head -c 400; echo
curl -s "$BASE/episodes?episode=S01" | head -c 400; echo
curl -s "$BASE/episodes/1" | head -c 400; echo
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/characters/99999"
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/characters/rick"
```

Expected: the five payloads carry real data; `99999` answers `404`; `rick` answers `400`.

- [ ] **Step 4: Confirm the second call is served from the cache**

```bash
time curl -s -o /dev/null "$BASE/locations/1"
time curl -s -o /dev/null "$BASE/locations/1"
```

Expected: the second call is markedly faster, since the first populated `cache_entries`.

- [ ] **Step 5: Commit and push**

```bash
git push
```

---

## Task 11: The frontend contracts and API functions

**Files:**
- Modify: `src/shared/api/types.ts`
- Modify: `src/shared/api/client.ts`
- Modify: `src/shared/api/client.test.ts`
- Modify: `src/test/msw.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/shared/api/client.test.ts`:

```ts
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
```

Extend the import at the top of that file:

```ts
import {
  ApiError,
  fetchCharacter,
  fetchCharacters,
  fetchEpisode,
  fetchEpisodes,
  fetchLocation,
  fetchLocations,
} from './client'
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test
```

Expected: FAIL — `fetchCharacter is not exported`.

- [ ] **Step 3: Mirror the backend contracts**

Append to `src/shared/api/types.ts`:

```ts
export type RelationRef = {
  id: number | null
  name: string
  resolved: boolean
}

export type EpisodeSummary = {
  id: number
  name: string
  episode: string
}

export type CharacterSummary = {
  id: number
  name: string
  status: string
  image: string
}

export type CharacterDetail = {
  character: Character
  origin: RelationRef
  location: RelationRef
  episodes: EpisodeSummary[]
}

export type Location = {
  id: number
  name: string
  type: string
  dimension: string
  residentCount: number
}

export type LocationDetail = {
  location: Location
  residents: CharacterSummary[]
}

export type LocationFilters = {
  page?: number
  name?: string
  type?: string
  dimension?: string
}

export type Episode = {
  id: number
  name: string
  airDate: string
  episode: string
  characterCount: number
}

export type EpisodeDetail = {
  episode: Episode
  characters: CharacterSummary[]
}

export type EpisodeFilters = {
  page?: number
  name?: string
  episode?: string
}
```

- [ ] **Step 4: Extend the client**

Replace everything below the `get` function in `src/shared/api/client.ts` with:

```ts
function toQuery(filters: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  return params.toString()
}

export function fetchCharacters(
  filters: CharacterFilters,
): Promise<ListResponse<Character>> {
  const search = toQuery({
    page: filters.page ?? 1,
    name: filters.name,
    status: filters.status,
    species: filters.species,
    gender: filters.gender,
  })
  return get<ListResponse<Character>>(`/characters?${search}`)
}

export function fetchCharacter(id: number): Promise<CharacterDetail> {
  return get<CharacterDetail>(`/characters/${id}`)
}

export function fetchLocations(
  filters: LocationFilters,
): Promise<ListResponse<Location>> {
  const search = toQuery({
    page: filters.page ?? 1,
    name: filters.name,
    type: filters.type,
    dimension: filters.dimension,
  })
  return get<ListResponse<Location>>(`/locations?${search}`)
}

export function fetchLocation(id: number): Promise<LocationDetail> {
  return get<LocationDetail>(`/locations/${id}`)
}

export function fetchEpisodes(
  filters: EpisodeFilters,
): Promise<ListResponse<Episode>> {
  const search = toQuery({
    page: filters.page ?? 1,
    name: filters.name,
    episode: filters.episode,
  })
  return get<ListResponse<Episode>>(`/episodes?${search}`)
}

export function fetchEpisode(id: number): Promise<EpisodeDetail> {
  return get<EpisodeDetail>(`/episodes/${id}`)
}
```

and replace the type import at the top of the same file:

```ts
import type {
  Character,
  CharacterDetail,
  CharacterFilters,
  Episode,
  EpisodeDetail,
  EpisodeFilters,
  ListResponse,
  Location,
  LocationDetail,
  LocationFilters,
} from './types'
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS — 67 tests. The five original client tests pass unchanged.

- [ ] **Step 6: Extend the mock server for the page tests that follow**

Replace the contents of `src/test/msw.ts`:

```ts
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const BASE = 'https://api.test/api'

function character(id: number, name: string, status = 'Alive') {
  return {
    id,
    name,
    status,
    species: 'Human',
    type: '',
    gender: 'Male',
    image: `https://example.test/${id}.jpeg`,
    origin: { name: 'Earth (C-137)', id: 1 },
    location: { name: 'Citadel of Ricks', id: 3 },
    episodeCount: 51,
  }
}

function summary(id: number, name: string) {
  return { id, name, status: 'Alive', image: `https://example.test/${id}.jpeg` }
}

export const handlers = [
  http.get(`${BASE}/characters`, ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? '1')
    const status = url.searchParams.get('status')

    if (status === 'dead') {
      return HttpResponse.json({
        items: [],
        pagination: { page: 1, pageCount: 0, total: 0, pageSize: 20 },
      })
    }

    return HttpResponse.json({
      items: [character(page, `Character Page ${page}`)],
      pagination: { page, pageCount: 42, total: 826, pageSize: 20 },
    })
  }),

  http.get(`${BASE}/characters/:id`, ({ params }) => {
    const id = Number(params.id)

    if (id === 99999) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'No such character' } },
        { status: 404 },
      )
    }

    return HttpResponse.json({
      character: character(id, 'Rick Sanchez'),
      origin: { id: 1, name: 'Earth (C-137)', resolved: true },
      location: { id: 3, name: 'Citadel of Ricks', resolved: true },
      episodes: [{ id: 1, name: 'Pilot', episode: 'S01E01' }],
    })
  }),

  http.get(`${BASE}/locations`, ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? '1')

    if (url.searchParams.get('dimension') === 'nowhere') {
      return HttpResponse.json({
        items: [],
        pagination: { page: 1, pageCount: 0, total: 0, pageSize: 20 },
      })
    }

    return HttpResponse.json({
      items: [
        {
          id: page,
          name: `Location Page ${page}`,
          type: 'Planet',
          dimension: 'Dimension C-137',
          residentCount: 27,
        },
      ],
      pagination: { page, pageCount: 7, total: 126, pageSize: 20 },
    })
  }),

  http.get(`${BASE}/locations/:id`, ({ params }) =>
    HttpResponse.json({
      location: {
        id: Number(params.id),
        name: 'Earth (C-137)',
        type: 'Planet',
        dimension: 'Dimension C-137',
        residentCount: 2,
      },
      residents: [summary(38, 'Beth Smith'), summary(45, 'Bruce Chutback')],
    }),
  ),

  http.get(`${BASE}/episodes`, ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? '1')

    return HttpResponse.json({
      items: [
        {
          id: page,
          name: `Episode Page ${page}`,
          airDate: 'December 2, 2013',
          episode: 'S01E01',
          characterCount: 19,
        },
      ],
      pagination: { page, pageCount: 3, total: 51, pageSize: 20 },
    })
  }),

  http.get(`${BASE}/episodes/:id`, ({ params }) =>
    HttpResponse.json({
      episode: {
        id: Number(params.id),
        name: 'Pilot',
        airDate: 'December 2, 2013',
        episode: 'S01E01',
        characterCount: 2,
      },
      characters: [summary(1, 'Rick Sanchez'), summary(2, 'Morty Smith')],
    }),
  ),
]

export const server = setupServer(...handlers)
```

- [ ] **Step 7: Run the tests again to confirm nothing regressed**

```bash
npm test
```

Expected: PASS — 67 tests.

- [ ] **Step 8: Commit**

```bash
git add src/shared/api src/test/msw.ts
git commit -m "feat: add frontend contracts and fetches for locations, episodes, and details"
```

---

## Task 12: Generalize the URL filter hook over a key set

`useUrlFilters` currently hardcodes the four character filter keys. Locations and episodes filter on different keys, so the hook takes the key set as an argument.

**Files:**
- Modify: `src/shared/hooks/useUrlFilters.ts`
- Modify: `src/shared/hooks/useUrlFilters.test.tsx`
- Modify: `src/features/characters/CharacterFilters.tsx`
- Modify: `src/pages/CharactersPage.tsx`

- [ ] **Step 1: Write the failing test**

Replace the contents of `src/shared/hooks/useUrlFilters.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useUrlFilters } from './useUrlFilters'

const CHARACTER_KEYS = ['name', 'status', 'species', 'gender'] as const
const EPISODE_KEYS = ['name', 'episode'] as const

function Probe() {
  const { filters, setFilter, clearFilters } = useUrlFilters(CHARACTER_KEYS)
  const location = useLocation()

  return (
    <div>
      <span data-testid="page">{filters.page ?? 1}</span>
      <span data-testid="status">{filters.status ?? ''}</span>
      <span data-testid="search">{location.search}</span>
      <button onClick={() => setFilter('status', 'dead')}>set status</button>
      <button onClick={() => setFilter('page', '3')}>set page</button>
      <button onClick={() => clearFilters()}>clear</button>
    </div>
  )
}

function EpisodeProbe() {
  const { filters } = useUrlFilters(EPISODE_KEYS)
  return <span data-testid="episode">{filters.episode ?? ''}</span>
}

function renderAt(path: string, element = <Probe />) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/characters" element={element} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('useUrlFilters', () => {
  it('reads filters out of the query string', () => {
    renderAt('/characters?page=4&status=alive')
    expect(screen.getByTestId('page')).toHaveTextContent('4')
    expect(screen.getByTestId('status')).toHaveTextContent('alive')
  })

  it('defaults page to 1 when absent', () => {
    renderAt('/characters')
    expect(screen.getByTestId('page')).toHaveTextContent('1')
  })

  it('writes a changed filter into the URL', async () => {
    renderAt('/characters')
    await userEvent.click(screen.getByText('set status'))
    expect(screen.getByTestId('search')).toHaveTextContent('status=dead')
  })

  it('resets page to 1 when a non-page filter changes', async () => {
    renderAt('/characters?page=5')
    await userEvent.click(screen.getByText('set status'))
    expect(screen.getByTestId('page')).toHaveTextContent('1')
  })

  it('preserves the page when the page itself changes', async () => {
    renderAt('/characters?status=alive')
    await userEvent.click(screen.getByText('set page'))
    expect(screen.getByTestId('page')).toHaveTextContent('3')
    expect(screen.getByTestId('status')).toHaveTextContent('alive')
  })

  it('removes every filter on clear', async () => {
    renderAt('/characters?page=5&status=alive&name=rick')
    await userEvent.click(screen.getByText('clear'))
    expect(screen.getByTestId('search')).toHaveTextContent('')
    expect(screen.getByTestId('page')).toHaveTextContent('1')
  })

  it('reads a key set belonging to a different entity', () => {
    renderAt('/characters?episode=S03', <EpisodeProbe />)
    expect(screen.getByTestId('episode')).toHaveTextContent('S03')
  })

  it('ignores query parameters outside the declared key set', () => {
    renderAt('/characters?status=alive', <EpisodeProbe />)
    expect(screen.getByTestId('episode')).toHaveTextContent('')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL — `useUrlFilters` takes no arguments, so the episode probe reads nothing.

- [ ] **Step 3: Rewrite the hook**

Replace the contents of `src/shared/hooks/useUrlFilters.ts`:

```ts
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

export type UrlFilters<K extends string> = { page: number } & {
  [P in K]?: string
}

export type FilterSetter<K extends string> = (
  key: K | 'page',
  value: string | undefined,
) => void

/**
 * Reads and writes a declared set of filter keys in the query string.
 *
 * Pass a module-level constant as `keys`. A fresh array on every render would
 * change the memo identity each time and defeat the memoization.
 */
export function useUrlFilters<K extends string>(keys: readonly K[]) {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = useMemo<UrlFilters<K>>(() => {
    const rawPage = searchParams.get('page')
    const result = { page: rawPage ? Number(rawPage) : 1 } as UrlFilters<K>

    for (const key of keys) {
      result[key] = (searchParams.get(key) ?? undefined) as UrlFilters<K>[K]
    }

    return result
  }, [searchParams, keys])

  const setFilter = useCallback<FilterSetter<K>>(
    (key, value) => {
      const next = new URLSearchParams(searchParams)

      if (value === undefined || value === '') {
        next.delete(key)
      } else {
        next.set(key, value)
      }

      // Changing what is being filtered invalidates the current page —
      // page 5 of the old result set is meaningless in the new one.
      if (key !== 'page') next.delete('page')

      setSearchParams(next)
    },
    [searchParams, setSearchParams],
  )

  const clearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams())
  }, [setSearchParams])

  return { filters, setFilter, clearFilters }
}
```

- [ ] **Step 4: Update the character filter bar to the new setter type**

In `src/features/characters/CharacterFilters.tsx`, replace the type import:

```ts
import type { FilterKey } from '../../shared/hooks/useUrlFilters'
```

with:

```ts
import type { FilterSetter } from '../../shared/hooks/useUrlFilters'

export const CHARACTER_FILTER_KEYS = ['name', 'status', 'species', 'gender'] as const
export type CharacterFilterKey = (typeof CHARACTER_FILTER_KEYS)[number]
```

and replace the `onChange` line in `CharacterFiltersProps`:

```ts
  onChange: (key: FilterKey, value: string | undefined) => void
```

with:

```ts
  onChange: FilterSetter<CharacterFilterKey>
```

- [ ] **Step 5: Pass the key set from the page**

In `src/pages/CharactersPage.tsx`, replace the import line for the filter bar:

```tsx
import { CharacterFilters } from '../features/characters/CharacterFilters'
```

with:

```tsx
import {
  CharacterFilters,
  CHARACTER_FILTER_KEYS,
} from '../features/characters/CharacterFilters'
```

and replace the hook call:

```tsx
  const { filters, setFilter, clearFilters } = useUrlFilters()
```

with:

```tsx
  const { filters, setFilter, clearFilters } = useUrlFilters(CHARACTER_FILTER_KEYS)
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS — 69 tests.

- [ ] **Step 7: Verify the types and the lint**

```bash
npm run lint && npm run build
```

Expected: both exit 0.

- [ ] **Step 8: Commit**

```bash
git add src/shared/hooks src/features/characters/CharacterFilters.tsx src/pages/CharactersPage.tsx
git commit -m "refactor: let the URL filter hook serve any entity key set"
```

---

## Task 13: Shared detail primitives

Four pieces are needed by every detail page, and two of them already exist inline inside plan 1 components. Extract before duplicating.

**Files:**
- Create: `src/shared/ui/RedactionBar.tsx`
- Create: `src/shared/ui/Stamp.tsx`
- Create: `src/shared/ui/DimensionNotFound.tsx`
- Create: `src/shared/ui/DetailSkeleton.tsx`
- Create: `src/features/characters/RosterGrid.tsx`
- Create: `src/shared/ui/detail.test.tsx`
- Modify: `src/features/characters/CharacterCard.tsx`
- Modify: `src/pages/NotFoundPage.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/shared/ui/detail.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { RedactionBar } from './RedactionBar'
import { Stamp } from './Stamp'
import { DimensionNotFound } from './DimensionNotFound'
import { DetailSkeleton } from './DetailSkeleton'
import { RosterGrid } from '../../features/characters/RosterGrid'

describe('RedactionBar', () => {
  it('carries an accessible label instead of silent emptiness', () => {
    render(<RedactionBar label="Origin redacted" />)
    expect(screen.getByLabelText('Origin redacted')).toBeInTheDocument()
  })

  it('accepts a caller-supplied test id', () => {
    render(<RedactionBar label="Origin redacted" testId="redacted-origin" />)
    expect(screen.getByTestId('redacted-origin')).toBeInTheDocument()
  })
})

describe('Stamp', () => {
  it('renders its text', () => {
    render(<Stamp>TERMINATED</Stamp>)
    expect(screen.getByText('TERMINATED')).toBeInTheDocument()
  })

  it('marks the terminated tone for styling', () => {
    const { container } = render(<Stamp tone="dead">TERMINATED</Stamp>)
    expect(container.querySelector('[data-tone="dead"]')).toBeInTheDocument()
  })
})

describe('DimensionNotFound', () => {
  it('shows the 404 line in the archive voice', () => {
    render(
      <MemoryRouter>
        <DimensionNotFound />
      </MemoryRouter>,
    )
    expect(screen.getByText("This dimension doesn't exist.")).toBeInTheDocument()
  })

  it('offers a way back to the archive', () => {
    render(
      <MemoryRouter>
        <DimensionNotFound />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link')).toHaveAttribute('href', '/characters')
  })
})

describe('DetailSkeleton', () => {
  it('renders loading placeholders', () => {
    render(<DetailSkeleton />)
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0)
  })
})

describe('RosterGrid', () => {
  const people = [
    { id: 1, name: 'Rick Sanchez', status: 'Alive', image: 'https://example.test/1.jpeg' },
    { id: 2, name: 'Morty Smith', status: 'Dead', image: 'https://example.test/2.jpeg' },
  ]

  it('lists everyone under the supplied heading', () => {
    render(
      <MemoryRouter>
        <RosterGrid title="PERSONNEL PRESENT" people={people} />
      </MemoryRouter>,
    )
    expect(screen.getByText('PERSONNEL PRESENT')).toBeInTheDocument()
    expect(screen.getByText('Rick Sanchez')).toBeInTheDocument()
    expect(screen.getByText('Morty Smith')).toBeInTheDocument()
  })

  it('links each entry to its character page', () => {
    render(
      <MemoryRouter>
        <RosterGrid title="PERSONNEL PRESENT" people={people} />
      </MemoryRouter>,
    )
    expect(screen.getAllByRole('link')[0]).toHaveAttribute('href', '/characters/1')
  })

  it('says so plainly when the roster is empty', () => {
    render(
      <MemoryRouter>
        <RosterGrid title="REGISTERED RESIDENTS" people={[]} />
      </MemoryRouter>,
    )
    expect(screen.getByText('NO ONE ON RECORD')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test
```

Expected: FAIL — cannot resolve `./RedactionBar`.

- [ ] **Step 3: Write the primitives**

Create `src/shared/ui/RedactionBar.tsx`:

```tsx
type RedactionBarProps = {
  label: string
  testId?: string
  className?: string
}

/**
 * Half of all origins in the archive are unknown, so this is a routine field
 * state rather than a flourish. It carries a label because a bare bar tells a
 * screen reader nothing.
 */
export function RedactionBar({ label, testId, className = 'w-20' }: RedactionBarProps) {
  return (
    <span
      data-testid={testId}
      aria-label={label}
      className={`inline-block h-3 bg-fg align-middle ${className}`}
    />
  )
}
```

Create `src/shared/ui/Stamp.tsx`:

```tsx
import type { ReactNode } from 'react'

type StampProps = {
  children: ReactNode
  tone?: 'muted' | 'dead'
  className?: string
}

const TONE: Record<'muted' | 'dead', string> = {
  muted: 'border-line text-muted',
  dead: 'border-dead text-dead -rotate-12',
}

export function Stamp({ children, tone = 'muted', className = '' }: StampProps) {
  return (
    <span
      data-tone={tone}
      className={`inline-block border px-3 py-1 font-mono text-xs tracking-widest ${TONE[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
```

Create `src/shared/ui/DimensionNotFound.tsx`:

```tsx
import { Link } from 'react-router-dom'

export function DimensionNotFound() {
  return (
    <div className="px-6 py-24 text-center">
      <p className="font-mono text-xs text-muted">ERROR // DIMENSION NOT FOUND</p>
      <h1 className="text-fg mt-4 text-3xl font-bold">
        This dimension doesn&apos;t exist.
      </h1>
      <p className="mt-2 text-muted">Try one where you&apos;re less of an idiot.</p>
      <Link
        to="/characters"
        className="mt-8 inline-block border border-line px-4 py-2 font-mono text-xs text-fg transition-colors hover:border-accent hover:text-accent"
      >
        RETURN TO ARCHIVE
      </Link>
    </div>
  )
}
```

Create `src/shared/ui/DetailSkeleton.tsx`:

```tsx
import { Skeleton } from './Skeleton'

/**
 * Mirrors the dossier geometry — a square portrait beside a stack of fields,
 * with a roster underneath — so nothing shifts when the data lands.
 */
export function DetailSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-[300px_1fr]">
        <Skeleton className="aspect-square w-full rounded-none" />
        <div className="space-y-3">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
    </div>
  )
}
```

Create `src/features/characters/RosterGrid.tsx`. It lives with the characters
feature rather than in `shared/ui` because it renders characters and links to
their routes, and `shared/` is required to know nothing about specific entity
types (spec §7.3). The location and episode dossiers import it across features,
which is the lesser coupling.

```tsx
import { Link } from 'react-router-dom'
import { StatusIndicator } from './StatusIndicator'
import type { CharacterSummary } from '../../shared/api/types'

type RosterGridProps = {
  title: string
  people: CharacterSummary[]
}

export function RosterGrid({ title, people }: RosterGridProps) {
  return (
    <section className="space-y-3">
      <h2 className="font-mono text-xs tracking-widest text-muted">{title}</h2>

      {people.length === 0 ? (
        <p className="border border-line bg-surface px-4 py-8 text-center font-mono text-xs text-muted">
          NO ONE ON RECORD
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {people.map((person) => (
            <li key={person.id}>
              <Link
                to={`/characters/${person.id}`}
                className="flex items-center gap-3 border border-line bg-surface p-2 transition-colors hover:border-accent"
              >
                <img
                  src={person.image}
                  alt={person.name}
                  width={48}
                  height={48}
                  loading="lazy"
                  className="h-12 w-12 object-cover"
                />
                <span className="min-w-0">
                  <span className="text-fg block truncate text-sm">{person.name}</span>
                  <StatusIndicator status={person.status} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
```

- [ ] **Step 4: Use the extracted bar in the character card**

In `src/features/characters/CharacterCard.tsx`, add the import:

```tsx
import { RedactionBar } from '../../shared/ui/RedactionBar'
```

and replace the inline redaction span:

```tsx
                <span
                  data-testid="redacted-origin"
                  aria-label="Origin redacted"
                  className="inline-block h-3 w-20 bg-fg align-middle"
                />
```

with:

```tsx
                <RedactionBar label="Origin redacted" testId="redacted-origin" />
```

- [ ] **Step 5: Use the extracted 404 body in the page**

Replace the contents of `src/pages/NotFoundPage.tsx`:

```tsx
import { DimensionNotFound } from '../shared/ui/DimensionNotFound'

export function NotFoundPage() {
  return (
    <main className="mx-auto max-w-[1280px]">
      <DimensionNotFound />
    </main>
  )
}
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS — 79 tests. The existing card and 404 tests still pass, which proves the extraction changed nothing visible.

- [ ] **Step 7: Commit**

```bash
git add src/shared/ui src/features/characters src/pages/NotFoundPage.tsx
git commit -m "feat: extract the detail primitives shared by every dossier"
```

---

## Task 14: The character dossier

**Files:**
- Create: `src/features/characters/useCharacter.ts`
- Create: `src/features/characters/CharacterDossier.tsx`
- Create: `src/pages/CharacterDetailPage.tsx`
- Create: `src/pages/CharacterDetailPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/pages/CharacterDetailPage.test.tsx`:

```tsx
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server } from '../test/msw'
import { CharacterDetailPage } from './CharacterDetailPage'

beforeAll(() => {
  vi.stubEnv('VITE_API_BASE', 'https://api.test/api')
  server.listen({ onUnhandledRequest: 'error' })
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function renderAt(path: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/characters/:id" element={<CharacterDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CharacterDetailPage', () => {
  it('renders the dossier header stamp', async () => {
    renderAt('/characters/1')
    expect(
      await screen.findByText('DOSSIER C-137 // CLEARANCE: UNRESTRICTED'),
    ).toBeInTheDocument()
  })

  it('renders the character name and portrait', async () => {
    renderAt('/characters/1')
    expect(await screen.findByRole('heading', { name: 'Rick Sanchez' })).toBeInTheDocument()
    expect(screen.getByAltText('Rick Sanchez')).toBeInTheDocument()
  })

  it('links a resolved origin to its location page', async () => {
    renderAt('/characters/1')
    expect(
      await screen.findByRole('link', { name: 'Earth (C-137)' }),
    ).toHaveAttribute('href', '/locations/1')
  })

  it('lists the episodes the character appears in', async () => {
    renderAt('/characters/1')
    expect(await screen.findByText('S01E01')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Pilot/ })).toHaveAttribute(
      'href',
      '/episodes/1',
    )
  })

  it('shows skeletons while the dossier loads', () => {
    renderAt('/characters/1')
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0)
  })

  it('shows the 404 body for a character that does not exist', async () => {
    renderAt('/characters/99999')
    expect(
      await screen.findByText("This dimension doesn't exist."),
    ).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL — cannot resolve `./CharacterDetailPage`.

- [ ] **Step 3: Write the query hook**

Create `src/features/characters/useCharacter.ts`:

```ts
import { useQuery } from '@tanstack/react-query'
import { ApiError, fetchCharacter } from '../../shared/api/client'

export function useCharacter(id: number) {
  return useQuery({
    queryKey: ['character', id],
    queryFn: () => fetchCharacter(id),
    // A missing record will still be missing on the third attempt; retrying
    // only delays the 404 page.
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.code === 'NOT_FOUND') &&
      failureCount < 2,
    staleTime: 5 * 60 * 1000,
  })
}
```

- [ ] **Step 4: Write the dossier body**

Create `src/features/characters/CharacterDossier.tsx`:

```tsx
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { StatusIndicator } from './StatusIndicator'
import { RedactionBar } from '../../shared/ui/RedactionBar'
import { Stamp } from '../../shared/ui/Stamp'
import type { CharacterDetail, RelationRef } from '../../shared/api/types'

type CharacterDossierProps = {
  detail: CharacterDetail
}

function Relation({ relation }: { relation: RelationRef }) {
  if (!relation.resolved) {
    return <RedactionBar label={`${relation.name} — redacted`} className="w-28" />
  }

  return (
    <Link
      to={`/locations/${relation.id}`}
      className="text-link underline-offset-4 hover:underline"
    >
      {relation.name}
    </Link>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line py-2">
      <dt className="font-mono text-xs text-muted">{label}</dt>
      <dd className="text-fg text-right text-sm">{children}</dd>
    </div>
  )
}

export function CharacterDossier({ detail }: CharacterDossierProps) {
  const { character, origin, location, episodes } = detail
  const deceased = character.status.toLowerCase() === 'dead'

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-[300px_1fr]">
        <div className="relative">
          <img
            src={character.image}
            alt={character.name}
            width={300}
            height={300}
            className="aspect-square w-full border border-line object-cover"
          />
          {deceased && (
            <Stamp tone="dead" className="absolute bottom-6 left-4 bg-bg">
              TERMINATED
            </Stamp>
          )}
        </div>

        <div className="space-y-4">
          <p className="font-mono text-xs text-muted">
            REGISTRY #{String(character.id).padStart(3, '0')}
          </p>
          <h1 className="text-fg text-3xl font-bold leading-tight">
            {character.name}
          </h1>
          <StatusIndicator status={character.status} />

          <dl>
            <Field label="SPECIES">{character.species}</Field>
            <Field label="TYPE">{character.type || '—'}</Field>
            <Field label="GENDER">{character.gender}</Field>
            <Field label="ORIGIN">
              <Relation relation={origin} />
            </Field>
            <Field label="LAST KNOWN LOCATION">
              <Relation relation={location} />
            </Field>
          </dl>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="font-mono text-xs tracking-widest text-muted">
          EPISODES ON RECORD
        </h2>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {episodes.map((episode) => (
            <li key={episode.id}>
              <Link
                to={`/episodes/${episode.id}`}
                className="flex items-center justify-between gap-3 border border-line bg-surface px-3 py-2 transition-colors hover:border-accent"
              >
                <span className="text-fg truncate text-sm">{episode.name}</span>
                <span className="font-mono text-xs text-muted">{episode.episode}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
```

- [ ] **Step 5: Write the page**

Create `src/pages/CharacterDetailPage.tsx`:

```tsx
import { useParams } from 'react-router-dom'
import { useCharacter } from '../features/characters/useCharacter'
import { CharacterDossier } from '../features/characters/CharacterDossier'
import { ApiError } from '../shared/api/client'
import { DetailSkeleton } from '../shared/ui/DetailSkeleton'
import { DimensionNotFound } from '../shared/ui/DimensionNotFound'
import { ErrorState } from '../shared/ui/ErrorState'

export function CharacterDetailPage() {
  const { id } = useParams()
  const { data, isPending, isError, error, refetch } = useCharacter(Number(id))

  return (
    <main className="mx-auto max-w-[1280px] space-y-6 px-6 py-10">
      <p className="font-mono text-xs text-muted">
        DOSSIER C-137 // CLEARANCE: UNRESTRICTED
      </p>

      {isPending && <DetailSkeleton />}

      {isError &&
        (error instanceof ApiError && error.code === 'NOT_FOUND' ? (
          <DimensionNotFound />
        ) : (
          <ErrorState onRetry={() => refetch()} />
        ))}

      {data && <CharacterDossier detail={data} />}
    </main>
  )
}
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS — 85 tests.

- [ ] **Step 7: Commit**

```bash
git add src/features/characters src/pages/CharacterDetailPage.tsx src/pages/CharacterDetailPage.test.tsx
git commit -m "feat: add the character dossier page with linked relations"
```

---

## Task 15: The locations feature

**Files:**
- Create: `src/features/locations/LocationCard.tsx`
- Create: `src/features/locations/LocationGrid.tsx`
- Create: `src/features/locations/LocationFilters.tsx`
- Create: `src/features/locations/useLocations.ts`
- Create: `src/features/locations/useLocation.ts`
- Create: `src/features/locations/locations.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/features/locations/locations.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { LocationCard } from './LocationCard'
import { LocationGrid } from './LocationGrid'
import { LocationFilters } from './LocationFilters'
import type { Location } from '../../shared/api/types'

function location(overrides: Partial<Location> = {}): Location {
  return {
    id: 1,
    name: 'Earth (C-137)',
    type: 'Planet',
    dimension: 'Dimension C-137',
    residentCount: 27,
    ...overrides,
  }
}

function renderCard(data: Location) {
  return render(
    <MemoryRouter>
      <LocationCard location={data} />
    </MemoryRouter>,
  )
}

describe('LocationCard', () => {
  it('shows the name, type, and resident count', () => {
    renderCard(location())
    expect(screen.getByText('Earth (C-137)')).toBeInTheDocument()
    expect(screen.getByText('Planet')).toBeInTheDocument()
    expect(screen.getByText('27')).toBeInTheDocument()
  })

  it('renders the registry id in archive format', () => {
    renderCard(location({ id: 9 }))
    expect(screen.getByText('REGISTRY #009')).toBeInTheDocument()
  })

  it('links to the location detail route', () => {
    renderCard(location({ id: 12 }))
    expect(screen.getByRole('link')).toHaveAttribute('href', '/locations/12')
  })

  it('redacts an unknown dimension', () => {
    renderCard(location({ dimension: 'unknown' }))
    expect(screen.getByTestId('redacted-dimension')).toBeInTheDocument()
  })

  it('shows a known dimension as text', () => {
    renderCard(location())
    expect(screen.getByText('Dimension C-137')).toBeInTheDocument()
    expect(screen.queryByTestId('redacted-dimension')).not.toBeInTheDocument()
  })
})

function renderGrid(props: Partial<Parameters<typeof LocationGrid>[0]> = {}) {
  return render(
    <MemoryRouter>
      <LocationGrid
        locations={[]}
        isPending={false}
        isError={false}
        onRetry={() => {}}
        {...props}
      />
    </MemoryRouter>,
  )
}

describe('LocationGrid', () => {
  it('renders skeletons while pending', () => {
    renderGrid({ isPending: true })
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0)
  })

  it('renders the error state on failure', () => {
    renderGrid({ isError: true })
    expect(screen.getByText('REGISTRY UNREACHABLE')).toBeInTheDocument()
  })

  it('renders the empty state when nothing matched', () => {
    renderGrid({ locations: [] })
    expect(screen.getByText('NO RECORDS FOUND')).toBeInTheDocument()
  })

  it('renders a card per location', () => {
    renderGrid({ locations: [location(), location({ id: 2, name: 'Abadango' })] })
    expect(screen.getByText('Earth (C-137)')).toBeInTheDocument()
    expect(screen.getByText('Abadango')).toBeInTheDocument()
  })
})

function setupFilters(overrides = {}) {
  const onChange = vi.fn()
  const onClear = vi.fn()
  render(
    <LocationFilters
      filters={{ page: 1 }}
      onChange={onChange}
      onClear={onClear}
      {...overrides}
    />,
  )
  return { onChange, onClear }
}

describe('LocationFilters', () => {
  it('shows the current dimension value', () => {
    setupFilters({ filters: { page: 1, dimension: 'C-137' } })
    expect(screen.getByLabelText('Dimension')).toHaveValue('C-137')
  })

  it('hides the clear control when no filter is active', () => {
    setupFilters()
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()
  })

  it('emits a clear request', async () => {
    const { onClear } = setupFilters({ filters: { page: 1, type: 'Planet' } })
    await userEvent.click(screen.getByRole('button', { name: /clear/i }))
    expect(onClear).toHaveBeenCalledOnce()
  })

  it('does not treat page alone as an active filter', () => {
    setupFilters({ filters: { page: 4 } })
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test
```

Expected: FAIL — cannot resolve `./LocationCard`.

- [ ] **Step 3: Write the card**

Create `src/features/locations/LocationCard.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { RedactionBar } from '../../shared/ui/RedactionBar'
import type { Location } from '../../shared/api/types'

type LocationCardProps = {
  location: Location
}

export function LocationCard({ location }: LocationCardProps) {
  const dimensionUnknown = location.dimension.toLowerCase() === 'unknown'

  return (
    <Link
      to={`/locations/${location.id}`}
      className="block border border-line bg-surface p-4 transition-colors hover:border-accent"
    >
      <p className="font-mono text-xs text-muted">
        REGISTRY #{String(location.id).padStart(3, '0')}
      </p>

      <h3 className="text-fg mt-2 font-medium leading-tight">{location.name}</h3>

      <dl className="mt-4 space-y-1 font-mono text-xs">
        <div className="flex justify-between gap-2">
          <dt className="text-muted">TYPE</dt>
          <dd className="text-fg truncate">{location.type}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted">DIMENSION</dt>
          <dd className="text-fg truncate">
            {dimensionUnknown ? (
              <RedactionBar label="Dimension redacted" testId="redacted-dimension" />
            ) : (
              location.dimension
            )}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted">RESIDENTS</dt>
          <dd className="text-fg">{location.residentCount}</dd>
        </div>
      </dl>
    </Link>
  )
}
```

- [ ] **Step 4: Write the grid**

Create `src/features/locations/LocationGrid.tsx`:

```tsx
import { LocationCard } from './LocationCard'
import { Skeleton } from '../../shared/ui/Skeleton'
import { EmptyState } from '../../shared/ui/EmptyState'
import { ErrorState } from '../../shared/ui/ErrorState'
import type { Location } from '../../shared/api/types'

type LocationGridProps = {
  locations: Location[]
  isPending: boolean
  isError: boolean
  onRetry: () => void
}

const GRID = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'
const SKELETON_COUNT = 20

export function LocationGrid({
  locations,
  isPending,
  isError,
  onRetry,
}: LocationGridProps) {
  if (isError) return <ErrorState onRetry={onRetry} />

  if (isPending) {
    return (
      <div className={GRID}>
        {Array.from({ length: SKELETON_COUNT }, (_, index) => (
          // Same geometry as the card: an id line, a title, three field rows.
          <div key={index} className="space-y-2 border border-line bg-surface p-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    )
  }

  if (locations.length === 0) return <EmptyState />

  return (
    <div className={GRID}>
      {locations.map((location) => (
        <LocationCard key={location.id} location={location} />
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Extract TextFilter so all three filter bars share it**

`TextFilter` currently lives inside `src/features/characters/CharacterFilters.tsx`, where it holds the debounced draft that stops the URL round trip from eating keystrokes. All three entities need it.

Create `src/shared/ui/TextFilter.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react'

// Long enough that a burst of typing produces one navigation, short enough
// that the grid still feels like it reacts to the keyboard.
export const FILTER_DEBOUNCE_MS = 300

const FIELD =
  'border border-line bg-surface px-3 py-2 font-mono text-xs text-fg ' +
  'outline-none focus:border-accent'

const LABEL = 'font-mono text-xs text-muted'

type TextFilterProps = {
  id: string
  label: string
  placeholder: string
  value: string | undefined
  width: string
  onCommit: (value: string | undefined) => void
}

/**
 * A text filter keeps its own draft and pushes it upward on a debounce.
 *
 * Binding the input straight to the URL loses keystrokes: the round trip
 * through the router is asynchronous, so React restores the stale value into
 * the DOM while the next character is already being typed.
 */
export function TextFilter({
  id,
  label,
  placeholder,
  value,
  width,
  onCommit,
}: TextFilterProps) {
  const external = value ?? ''
  const [draft, setDraft] = useState(external)
  const committed = useRef(external)

  useEffect(() => {
    // Ignore the echo of our own commit; adopt anything else — the clear
    // button, the back button, a pasted URL.
    if (external === committed.current) return
    committed.current = external
    setDraft(external)
  }, [external])

  useEffect(() => {
    if (draft === committed.current) return

    const timer = setTimeout(() => {
      committed.current = draft
      onCommit(draft || undefined)
    }, FILTER_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [draft, onCommit])

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={draft}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        className={`${FIELD} ${width}`}
      />
    </div>
  )
}
```

Then in `src/features/characters/CharacterFilters.tsx`: delete the local `TextFilter` component, the `FILTER_DEBOUNCE_MS` constant, the `TextFilterProps` type, and the now-unused `useEffect`, `useRef`, `useState` imports; and add:

```tsx
import { TextFilter } from '../../shared/ui/TextFilter'
```

The `FIELD` and `LABEL` constants stay in `CharacterFilters.tsx` — the two `select` elements still use them.

- [ ] **Step 6: Write the filter bar**

Create `src/features/locations/LocationFilters.tsx`:

```tsx
import { useCallback } from 'react'
import { TextFilter } from '../../shared/ui/TextFilter'
import type { LocationFilters as Filters } from '../../shared/api/types'
import type { FilterSetter } from '../../shared/hooks/useUrlFilters'

export const LOCATION_FILTER_KEYS = ['name', 'type', 'dimension'] as const
export type LocationFilterKey = (typeof LOCATION_FILTER_KEYS)[number]

type LocationFiltersProps = {
  filters: Filters
  onChange: FilterSetter<LocationFilterKey>
  onClear: () => void
}

export function LocationFilters({
  filters,
  onChange,
  onClear,
}: LocationFiltersProps) {
  const hasActiveFilter = Boolean(filters.name || filters.type || filters.dimension)

  const commitName = useCallback(
    (value: string | undefined) => onChange('name', value),
    [onChange],
  )
  const commitType = useCallback(
    (value: string | undefined) => onChange('type', value),
    [onChange],
  )
  const commitDimension = useCallback(
    (value: string | undefined) => onChange('dimension', value),
    [onChange],
  )

  return (
    <div className="flex flex-wrap items-end gap-4 border border-line bg-surface p-4">
      <TextFilter
        id="filter-location-name"
        label="Search by name"
        placeholder="ENTER DESIGNATION"
        value={filters.name}
        width="w-56"
        onCommit={commitName}
      />
      <TextFilter
        id="filter-location-type"
        label="Type"
        placeholder="ANY"
        value={filters.type}
        width="w-40"
        onCommit={commitType}
      />
      <TextFilter
        id="filter-location-dimension"
        label="Dimension"
        placeholder="ANY"
        value={filters.dimension}
        width="w-48"
        onCommit={commitDimension}
      />

      {hasActiveFilter && (
        <button
          type="button"
          onClick={onClear}
          className="border border-line px-3 py-2 font-mono text-xs text-muted transition-colors hover:border-accent hover:text-accent"
        >
          CLEAR
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 7: Write the query hooks**

Create `src/features/locations/useLocations.ts`:

```ts
import { useQuery } from '@tanstack/react-query'
import { fetchLocations } from '../../shared/api/client'
import type { LocationFilters } from '../../shared/api/types'

export function useLocations(filters: LocationFilters) {
  return useQuery({
    queryKey: ['locations', filters],
    queryFn: () => fetchLocations(filters),
    placeholderData: (previous) => previous,
    staleTime: 5 * 60 * 1000,
  })
}
```

Create `src/features/locations/useLocation.ts`:

```ts
import { useQuery } from '@tanstack/react-query'
import { ApiError, fetchLocation } from '../../shared/api/client'

export function useLocation(id: number) {
  return useQuery({
    queryKey: ['location', id],
    queryFn: () => fetchLocation(id),
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.code === 'NOT_FOUND') &&
      failureCount < 2,
    staleTime: 5 * 60 * 1000,
  })
}
```

- [ ] **Step 8: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS — 98 tests. The character filter tests still pass against the extracted `TextFilter`.

- [ ] **Step 9: Commit**

```bash
git add src/features/locations src/shared/ui/TextFilter.tsx src/features/characters/CharacterFilters.tsx
git commit -m "feat: add the locations feature and share the debounced text filter"
```

---

## Task 16: The locations pages

**Files:**
- Create: `src/features/locations/LocationDossier.tsx`
- Create: `src/pages/LocationsPage.tsx`
- Create: `src/pages/LocationDetailPage.tsx`
- Create: `src/pages/LocationsPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/pages/LocationsPage.test.tsx`:

```tsx
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server } from '../test/msw'
import { LocationsPage } from './LocationsPage'
import { LocationDetailPage } from './LocationDetailPage'

beforeAll(() => {
  vi.stubEnv('VITE_API_BASE', 'https://api.test/api')
  server.listen({ onUnhandledRequest: 'error' })
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function renderAt(path: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/locations" element={<LocationsPage />} />
          <Route path="/locations/:id" element={<LocationDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('LocationsPage', () => {
  it('loads and renders locations from the backend', async () => {
    renderAt('/locations')
    expect(await screen.findByText('Location Page 1')).toBeInTheDocument()
  })

  it('reports the position from the backend pagination block', async () => {
    renderAt('/locations')
    expect(await screen.findByText('DIMENSION 1 / 7')).toBeInTheDocument()
  })

  it('honours a page supplied in the URL', async () => {
    renderAt('/locations?page=4')
    expect(await screen.findByText('Location Page 4')).toBeInTheDocument()
  })

  it('advances the page when the next control is used', async () => {
    renderAt('/locations')
    await screen.findByText('Location Page 1')
    await userEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(await screen.findByText('Location Page 2')).toBeInTheDocument()
  })
})

describe('LocationDetailPage', () => {
  it('renders the location name and fields', async () => {
    renderAt('/locations/1')
    expect(await screen.findByRole('heading', { name: 'Earth (C-137)' })).toBeInTheDocument()
    expect(screen.getByText('Planet')).toBeInTheDocument()
  })

  it('lists the registered residents', async () => {
    renderAt('/locations/1')
    expect(await screen.findByText('REGISTERED RESIDENTS')).toBeInTheDocument()
    expect(screen.getByText('Beth Smith')).toBeInTheDocument()
  })

  it('links a resident to their own dossier', async () => {
    renderAt('/locations/1')
    await screen.findByText('Beth Smith')
    expect(screen.getByRole('link', { name: /Beth Smith/ })).toHaveAttribute(
      'href',
      '/characters/38',
    )
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL — cannot resolve `./LocationsPage`.

- [ ] **Step 3: Write the dossier body**

Create `src/features/locations/LocationDossier.tsx`:

```tsx
import { RedactionBar } from '../../shared/ui/RedactionBar'
import { RosterGrid } from '../characters/RosterGrid'
import type { LocationDetail } from '../../shared/api/types'

type LocationDossierProps = {
  detail: LocationDetail
}

export function LocationDossier({ detail }: LocationDossierProps) {
  const { location, residents } = detail
  const dimensionUnknown = location.dimension.toLowerCase() === 'unknown'

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <p className="font-mono text-xs text-muted">
          REGISTRY #{String(location.id).padStart(3, '0')}
        </p>
        <h1 className="text-fg text-3xl font-bold leading-tight">{location.name}</h1>

        <dl className="max-w-md">
          <div className="flex justify-between gap-4 border-b border-line py-2">
            <dt className="font-mono text-xs text-muted">TYPE</dt>
            <dd className="text-fg text-sm">{location.type}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-line py-2">
            <dt className="font-mono text-xs text-muted">DIMENSION</dt>
            <dd className="text-fg text-sm">
              {dimensionUnknown ? (
                <RedactionBar label="Dimension redacted" className="w-28" />
              ) : (
                location.dimension
              )}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-line py-2">
            <dt className="font-mono text-xs text-muted">RESIDENTS</dt>
            <dd className="text-fg text-sm">{location.residentCount}</dd>
          </div>
        </dl>
      </div>

      <RosterGrid title="REGISTERED RESIDENTS" people={residents} />
    </div>
  )
}
```

- [ ] **Step 4: Write the list page**

Create `src/pages/LocationsPage.tsx`:

```tsx
import { useUrlFilters } from '../shared/hooks/useUrlFilters'
import { useLocations } from '../features/locations/useLocations'
import {
  LocationFilters,
  LOCATION_FILTER_KEYS,
} from '../features/locations/LocationFilters'
import { LocationGrid } from '../features/locations/LocationGrid'
import { Pagination } from '../shared/ui/Pagination'

export function LocationsPage() {
  const { filters, setFilter, clearFilters } = useUrlFilters(LOCATION_FILTER_KEYS)
  const { data, isPending, isError, refetch } = useLocations(filters)

  return (
    <main className="mx-auto max-w-[1280px] space-y-6 px-6 py-10">
      <header className="space-y-1">
        <p className="font-mono text-xs text-muted">
          DOSSIER C-137 // CLEARANCE: UNRESTRICTED
        </p>
        <h1 className="text-fg text-3xl font-bold">Locations</h1>
      </header>

      <LocationFilters
        filters={filters}
        onChange={setFilter}
        onClear={clearFilters}
      />

      <LocationGrid
        locations={data?.items ?? []}
        isPending={isPending}
        isError={isError}
        onRetry={() => refetch()}
      />

      <Pagination
        page={data?.pagination.page ?? 1}
        pageCount={data?.pagination.pageCount ?? 0}
        onChange={(page) => setFilter('page', String(page))}
      />
    </main>
  )
}
```

- [ ] **Step 5: Write the detail page**

Create `src/pages/LocationDetailPage.tsx`:

```tsx
import { useParams } from 'react-router-dom'
import { useLocation } from '../features/locations/useLocation'
import { LocationDossier } from '../features/locations/LocationDossier'
import { ApiError } from '../shared/api/client'
import { DetailSkeleton } from '../shared/ui/DetailSkeleton'
import { DimensionNotFound } from '../shared/ui/DimensionNotFound'
import { ErrorState } from '../shared/ui/ErrorState'

export function LocationDetailPage() {
  const { id } = useParams()
  const { data, isPending, isError, error, refetch } = useLocation(Number(id))

  return (
    <main className="mx-auto max-w-[1280px] space-y-6 px-6 py-10">
      <p className="font-mono text-xs text-muted">
        DOSSIER C-137 // CLEARANCE: UNRESTRICTED
      </p>

      {isPending && <DetailSkeleton />}

      {isError &&
        (error instanceof ApiError && error.code === 'NOT_FOUND' ? (
          <DimensionNotFound />
        ) : (
          <ErrorState onRetry={() => refetch()} />
        ))}

      {data && <LocationDossier detail={data} />}
    </main>
  )
}
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS — 105 tests.

- [ ] **Step 7: Commit**

```bash
git add src/features/locations src/pages/LocationsPage.tsx src/pages/LocationDetailPage.tsx src/pages/LocationsPage.test.tsx
git commit -m "feat: add the locations list and dossier pages"
```

---

## Task 17: The episodes feature

**Files:**
- Create: `src/features/episodes/EpisodeCard.tsx`
- Create: `src/features/episodes/EpisodeGrid.tsx`
- Create: `src/features/episodes/EpisodeFilters.tsx`
- Create: `src/features/episodes/useEpisodes.ts`
- Create: `src/features/episodes/useEpisode.ts`
- Create: `src/features/episodes/episodes.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/features/episodes/episodes.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { EpisodeCard } from './EpisodeCard'
import { EpisodeGrid } from './EpisodeGrid'
import { EpisodeFilters } from './EpisodeFilters'
import type { Episode } from '../../shared/api/types'

function episode(overrides: Partial<Episode> = {}): Episode {
  return {
    id: 1,
    name: 'Pilot',
    airDate: 'December 2, 2013',
    episode: 'S01E01',
    characterCount: 19,
    ...overrides,
  }
}

function renderCard(data: Episode) {
  return render(
    <MemoryRouter>
      <EpisodeCard episode={data} />
    </MemoryRouter>,
  )
}

describe('EpisodeCard', () => {
  it('shows the episode code, name, and air date', () => {
    renderCard(episode())
    expect(screen.getByText('S01E01')).toBeInTheDocument()
    expect(screen.getByText('Pilot')).toBeInTheDocument()
    expect(screen.getByText('December 2, 2013')).toBeInTheDocument()
  })

  it('shows how many characters appear', () => {
    renderCard(episode())
    expect(screen.getByText('19')).toBeInTheDocument()
  })

  it('links to the episode detail route', () => {
    renderCard(episode({ id: 28 }))
    expect(screen.getByRole('link')).toHaveAttribute('href', '/episodes/28')
  })
})

function renderGrid(props: Partial<Parameters<typeof EpisodeGrid>[0]> = {}) {
  return render(
    <MemoryRouter>
      <EpisodeGrid
        episodes={[]}
        isPending={false}
        isError={false}
        onRetry={() => {}}
        {...props}
      />
    </MemoryRouter>,
  )
}

describe('EpisodeGrid', () => {
  it('renders skeletons while pending', () => {
    renderGrid({ isPending: true })
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0)
  })

  it('renders the error state on failure', () => {
    renderGrid({ isError: true })
    expect(screen.getByText('REGISTRY UNREACHABLE')).toBeInTheDocument()
  })

  it('renders the empty state when nothing matched', () => {
    renderGrid({ episodes: [] })
    expect(screen.getByText('NO RECORDS FOUND')).toBeInTheDocument()
  })

  it('renders a card per episode', () => {
    renderGrid({ episodes: [episode(), episode({ id: 2, name: 'Lawnmower Dog' })] })
    expect(screen.getByText('Pilot')).toBeInTheDocument()
    expect(screen.getByText('Lawnmower Dog')).toBeInTheDocument()
  })
})

function setupFilters(overrides = {}) {
  const onChange = vi.fn()
  const onClear = vi.fn()
  render(
    <EpisodeFilters
      filters={{ page: 1 }}
      onChange={onChange}
      onClear={onClear}
      {...overrides}
    />,
  )
  return { onChange, onClear }
}

describe('EpisodeFilters', () => {
  it('shows the current episode code', () => {
    setupFilters({ filters: { page: 1, episode: 'S03' } })
    expect(screen.getByLabelText('Season or episode code')).toHaveValue('S03')
  })

  it('hides the clear control when no filter is active', () => {
    setupFilters()
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()
  })

  it('emits a clear request', async () => {
    const { onClear } = setupFilters({ filters: { page: 1, episode: 'S03' } })
    await userEvent.click(screen.getByRole('button', { name: /clear/i }))
    expect(onClear).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test
```

Expected: FAIL — cannot resolve `./EpisodeCard`.

- [ ] **Step 3: Write the card**

Create `src/features/episodes/EpisodeCard.tsx`:

```tsx
import { Link } from 'react-router-dom'
import type { Episode } from '../../shared/api/types'

type EpisodeCardProps = {
  episode: Episode
}

export function EpisodeCard({ episode }: EpisodeCardProps) {
  return (
    <Link
      to={`/episodes/${episode.id}`}
      className="block border border-line bg-surface p-4 transition-colors hover:border-accent"
    >
      <span className="inline-block border border-line px-2 py-1 font-mono text-xs text-accent">
        {episode.episode}
      </span>

      <h3 className="text-fg mt-3 font-medium leading-tight">{episode.name}</h3>

      <dl className="mt-4 space-y-1 font-mono text-xs">
        <div className="flex justify-between gap-2">
          <dt className="text-muted">AIRED</dt>
          <dd className="text-fg truncate">{episode.airDate}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted">PERSONNEL</dt>
          <dd className="text-fg">{episode.characterCount}</dd>
        </div>
      </dl>
    </Link>
  )
}
```

- [ ] **Step 4: Write the grid**

Create `src/features/episodes/EpisodeGrid.tsx`:

```tsx
import { EpisodeCard } from './EpisodeCard'
import { Skeleton } from '../../shared/ui/Skeleton'
import { EmptyState } from '../../shared/ui/EmptyState'
import { ErrorState } from '../../shared/ui/ErrorState'
import type { Episode } from '../../shared/api/types'

type EpisodeGridProps = {
  episodes: Episode[]
  isPending: boolean
  isError: boolean
  onRetry: () => void
}

const GRID = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'
const SKELETON_COUNT = 20

export function EpisodeGrid({
  episodes,
  isPending,
  isError,
  onRetry,
}: EpisodeGridProps) {
  if (isError) return <ErrorState onRetry={onRetry} />

  if (isPending) {
    return (
      <div className={GRID}>
        {Array.from({ length: SKELETON_COUNT }, (_, index) => (
          // Same geometry as the card: a code chip, a title, two field rows.
          <div key={index} className="space-y-2 border border-line bg-surface p-4">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    )
  }

  if (episodes.length === 0) return <EmptyState />

  return (
    <div className={GRID}>
      {episodes.map((episode) => (
        <EpisodeCard key={episode.id} episode={episode} />
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Write the filter bar**

Create `src/features/episodes/EpisodeFilters.tsx`:

```tsx
import { useCallback } from 'react'
import { TextFilter } from '../../shared/ui/TextFilter'
import type { EpisodeFilters as Filters } from '../../shared/api/types'
import type { FilterSetter } from '../../shared/hooks/useUrlFilters'

export const EPISODE_FILTER_KEYS = ['name', 'episode'] as const
export type EpisodeFilterKey = (typeof EPISODE_FILTER_KEYS)[number]

type EpisodeFiltersProps = {
  filters: Filters
  onChange: FilterSetter<EpisodeFilterKey>
  onClear: () => void
}

export function EpisodeFilters({
  filters,
  onChange,
  onClear,
}: EpisodeFiltersProps) {
  const hasActiveFilter = Boolean(filters.name || filters.episode)

  const commitName = useCallback(
    (value: string | undefined) => onChange('name', value),
    [onChange],
  )
  const commitEpisode = useCallback(
    (value: string | undefined) => onChange('episode', value),
    [onChange],
  )

  return (
    <div className="flex flex-wrap items-end gap-4 border border-line bg-surface p-4">
      <TextFilter
        id="filter-episode-name"
        label="Search by name"
        placeholder="ENTER TITLE"
        value={filters.name}
        width="w-56"
        onCommit={commitName}
      />
      <TextFilter
        id="filter-episode-code"
        label="Season or episode code"
        placeholder="S01 OR S01E01"
        value={filters.episode}
        width="w-40"
        onCommit={commitEpisode}
      />

      {hasActiveFilter && (
        <button
          type="button"
          onClick={onClear}
          className="border border-line px-3 py-2 font-mono text-xs text-muted transition-colors hover:border-accent hover:text-accent"
        >
          CLEAR
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Write the query hooks**

Create `src/features/episodes/useEpisodes.ts`:

```ts
import { useQuery } from '@tanstack/react-query'
import { fetchEpisodes } from '../../shared/api/client'
import type { EpisodeFilters } from '../../shared/api/types'

export function useEpisodes(filters: EpisodeFilters) {
  return useQuery({
    queryKey: ['episodes', filters],
    queryFn: () => fetchEpisodes(filters),
    placeholderData: (previous) => previous,
    staleTime: 5 * 60 * 1000,
  })
}
```

Create `src/features/episodes/useEpisode.ts`:

```ts
import { useQuery } from '@tanstack/react-query'
import { ApiError, fetchEpisode } from '../../shared/api/client'

export function useEpisode(id: number) {
  return useQuery({
    queryKey: ['episode', id],
    queryFn: () => fetchEpisode(id),
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.code === 'NOT_FOUND') &&
      failureCount < 2,
    staleTime: 5 * 60 * 1000,
  })
}
```

- [ ] **Step 7: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS — 115 tests.

- [ ] **Step 8: Commit**

```bash
git add src/features/episodes
git commit -m "feat: add the episodes feature"
```

---

## Task 18: The episodes pages

**Files:**
- Create: `src/features/episodes/EpisodeDossier.tsx`
- Create: `src/pages/EpisodesPage.tsx`
- Create: `src/pages/EpisodeDetailPage.tsx`
- Create: `src/pages/EpisodesPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/pages/EpisodesPage.test.tsx`:

```tsx
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server } from '../test/msw'
import { EpisodesPage } from './EpisodesPage'
import { EpisodeDetailPage } from './EpisodeDetailPage'

beforeAll(() => {
  vi.stubEnv('VITE_API_BASE', 'https://api.test/api')
  server.listen({ onUnhandledRequest: 'error' })
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function renderAt(path: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/episodes" element={<EpisodesPage />} />
          <Route path="/episodes/:id" element={<EpisodeDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('EpisodesPage', () => {
  it('loads and renders episodes from the backend', async () => {
    renderAt('/episodes')
    expect(await screen.findByText('Episode Page 1')).toBeInTheDocument()
  })

  it('reports the position from the backend pagination block', async () => {
    renderAt('/episodes')
    expect(await screen.findByText('DIMENSION 1 / 3')).toBeInTheDocument()
  })

  it('advances the page when the next control is used', async () => {
    renderAt('/episodes')
    await screen.findByText('Episode Page 1')
    await userEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(await screen.findByText('Episode Page 2')).toBeInTheDocument()
  })
})

describe('EpisodeDetailPage', () => {
  it('renders the episode title and code', async () => {
    renderAt('/episodes/1')
    expect(await screen.findByRole('heading', { name: 'Pilot' })).toBeInTheDocument()
    expect(screen.getByText('S01E01')).toBeInTheDocument()
  })

  it('lists the personnel present', async () => {
    renderAt('/episodes/1')
    expect(await screen.findByText('PERSONNEL PRESENT')).toBeInTheDocument()
    expect(screen.getByText('Rick Sanchez')).toBeInTheDocument()
  })

  it('links a cast member to their own dossier', async () => {
    renderAt('/episodes/1')
    await screen.findByText('Rick Sanchez')
    expect(screen.getByRole('link', { name: /Rick Sanchez/ })).toHaveAttribute(
      'href',
      '/characters/1',
    )
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL — cannot resolve `./EpisodesPage`.

- [ ] **Step 3: Write the dossier body**

Create `src/features/episodes/EpisodeDossier.tsx`:

```tsx
import { RosterGrid } from '../characters/RosterGrid'
import type { EpisodeDetail } from '../../shared/api/types'

type EpisodeDossierProps = {
  detail: EpisodeDetail
}

export function EpisodeDossier({ detail }: EpisodeDossierProps) {
  const { episode, characters } = detail

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <span className="inline-block border border-line px-2 py-1 font-mono text-xs text-accent">
          {episode.episode}
        </span>
        <h1 className="text-fg text-3xl font-bold leading-tight">{episode.name}</h1>

        <dl className="max-w-md">
          <div className="flex justify-between gap-4 border-b border-line py-2">
            <dt className="font-mono text-xs text-muted">AIRED</dt>
            <dd className="text-fg text-sm">{episode.airDate}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-line py-2">
            <dt className="font-mono text-xs text-muted">PERSONNEL</dt>
            <dd className="text-fg text-sm">{episode.characterCount}</dd>
          </div>
        </dl>
      </div>

      <RosterGrid title="PERSONNEL PRESENT" people={characters} />
    </div>
  )
}
```

- [ ] **Step 4: Write the list page**

Create `src/pages/EpisodesPage.tsx`:

```tsx
import { useUrlFilters } from '../shared/hooks/useUrlFilters'
import { useEpisodes } from '../features/episodes/useEpisodes'
import {
  EpisodeFilters,
  EPISODE_FILTER_KEYS,
} from '../features/episodes/EpisodeFilters'
import { EpisodeGrid } from '../features/episodes/EpisodeGrid'
import { Pagination } from '../shared/ui/Pagination'

export function EpisodesPage() {
  const { filters, setFilter, clearFilters } = useUrlFilters(EPISODE_FILTER_KEYS)
  const { data, isPending, isError, refetch } = useEpisodes(filters)

  return (
    <main className="mx-auto max-w-[1280px] space-y-6 px-6 py-10">
      <header className="space-y-1">
        <p className="font-mono text-xs text-muted">
          DOSSIER C-137 // CLEARANCE: UNRESTRICTED
        </p>
        <h1 className="text-fg text-3xl font-bold">Episodes</h1>
      </header>

      <EpisodeFilters
        filters={filters}
        onChange={setFilter}
        onClear={clearFilters}
      />

      <EpisodeGrid
        episodes={data?.items ?? []}
        isPending={isPending}
        isError={isError}
        onRetry={() => refetch()}
      />

      <Pagination
        page={data?.pagination.page ?? 1}
        pageCount={data?.pagination.pageCount ?? 0}
        onChange={(page) => setFilter('page', String(page))}
      />
    </main>
  )
}
```

- [ ] **Step 5: Write the detail page**

Create `src/pages/EpisodeDetailPage.tsx`:

```tsx
import { useParams } from 'react-router-dom'
import { useEpisode } from '../features/episodes/useEpisode'
import { EpisodeDossier } from '../features/episodes/EpisodeDossier'
import { ApiError } from '../shared/api/client'
import { DetailSkeleton } from '../shared/ui/DetailSkeleton'
import { DimensionNotFound } from '../shared/ui/DimensionNotFound'
import { ErrorState } from '../shared/ui/ErrorState'

export function EpisodeDetailPage() {
  const { id } = useParams()
  const { data, isPending, isError, error, refetch } = useEpisode(Number(id))

  return (
    <main className="mx-auto max-w-[1280px] space-y-6 px-6 py-10">
      <p className="font-mono text-xs text-muted">
        DOSSIER C-137 // CLEARANCE: UNRESTRICTED
      </p>

      {isPending && <DetailSkeleton />}

      {isError &&
        (error instanceof ApiError && error.code === 'NOT_FOUND' ? (
          <DimensionNotFound />
        ) : (
          <ErrorState onRetry={() => refetch()} />
        ))}

      {data && <EpisodeDossier detail={data} />}
    </main>
  )
}
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS — 121 tests.

- [ ] **Step 7: Commit**

```bash
git add src/features/episodes src/pages/EpisodesPage.tsx src/pages/EpisodeDetailPage.tsx src/pages/EpisodesPage.test.tsx
git commit -m "feat: add the episodes list and dossier pages"
```

---

## Task 19: The nav shell and the routes

Six new pages exist and none of them is reachable. The hub arrives in plan 3; until then a plain nav bar makes the sections navigable.

**Files:**
- Create: `src/app/AppLayout.tsx`
- Create: `src/app/AppLayout.test.tsx`
- Modify: `src/app/routes.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/app/AppLayout.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from './AppLayout'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/characters" element={<p>characters outlet</p>} />
          <Route path="/locations" element={<p>locations outlet</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('AppLayout', () => {
  it('offers a link to each section', () => {
    renderAt('/characters')
    expect(screen.getByRole('link', { name: 'CHARACTERS' })).toHaveAttribute(
      'href',
      '/characters',
    )
    expect(screen.getByRole('link', { name: 'LOCATIONS' })).toHaveAttribute(
      'href',
      '/locations',
    )
    expect(screen.getByRole('link', { name: 'EPISODES' })).toHaveAttribute(
      'href',
      '/episodes',
    )
  })

  it('marks the active section', () => {
    renderAt('/locations')
    expect(screen.getByRole('link', { name: 'LOCATIONS' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: 'CHARACTERS' })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('renders the routed page inside the shell', () => {
    renderAt('/characters')
    expect(screen.getByText('characters outlet')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL — cannot resolve `./AppLayout`.

- [ ] **Step 3: Write the layout**

Create `src/app/AppLayout.tsx`:

```tsx
import { NavLink, Outlet } from 'react-router-dom'

const SECTIONS = [
  { to: '/characters', label: 'CHARACTERS' },
  { to: '/locations', label: 'LOCATIONS' },
  { to: '/episodes', label: 'EPISODES' },
]

// A plain bar for now. Plan 3 replaces it with the header that carries the
// mini portal gun and the settings panel.
export function AppLayout() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-surface">
        <nav
          aria-label="Sections"
          className="mx-auto flex max-w-[1280px] items-center gap-6 px-6 py-4"
        >
          <span className="font-mono text-xs tracking-widest text-accent">
            DOSSIER C-137
          </span>

          <ul className="flex items-center gap-4">
            {SECTIONS.map((section) => (
              <li key={section.to}>
                <NavLink
                  to={section.to}
                  className={({ isActive }) =>
                    `font-mono text-xs transition-colors hover:text-accent ${
                      isActive ? 'text-accent' : 'text-muted'
                    }`
                  }
                >
                  {section.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <Outlet />
    </div>
  )
}
```

`NavLink` sets `aria-current="page"` on the active link by itself, which is what the second test asserts.

- [ ] **Step 4: Wire every route behind the layout**

Replace the contents of `src/app/routes.tsx`:

```tsx
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from './AppLayout'
import { CharactersPage } from '../pages/CharactersPage'
import { CharacterDetailPage } from '../pages/CharacterDetailPage'
import { LocationsPage } from '../pages/LocationsPage'
import { LocationDetailPage } from '../pages/LocationDetailPage'
import { EpisodesPage } from '../pages/EpisodesPage'
import { EpisodeDetailPage } from '../pages/EpisodeDetailPage'
import { NotFoundPage } from '../pages/NotFoundPage'

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <Navigate to="/characters" replace /> },
      { path: '/characters', element: <CharactersPage /> },
      { path: '/characters/:id', element: <CharacterDetailPage /> },
      { path: '/locations', element: <LocationsPage /> },
      { path: '/locations/:id', element: <LocationDetailPage /> },
      { path: '/episodes', element: <EpisodesPage /> },
      { path: '/episodes/:id', element: <EpisodeDetailPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS — 124 tests.

- [ ] **Step 6: Verify the lint and the build**

```bash
npm run lint && npm run build
```

Expected: both exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/app
git commit -m "feat: make every section reachable behind a nav shell"
```

---

## Task 20: Deploy and verify the entity slice

- [ ] **Step 1: Run every suite**

```bash
npm test && npm run test:api && npm run lint && npm run build
```

Expected: 124 frontend tests, 79 backend tests, lint and build clean.

- [ ] **Step 2: Confirm the boundary still holds in the shipped bundle**

```bash
grep -r "rickandmortyapi" dist/ || echo "CLEAN: no direct external API reference in the bundle"
```

Expected: `CLEAN`.

- [ ] **Step 3: Push, which deploys the frontend**

```bash
git push
```

Vercel rebuilds on every push to `main`. The Edge Function was already deployed in task 10; if any backend file changed after that, redeploy it:

```bash
npx supabase functions deploy api --no-verify-jwt
```

- [ ] **Step 4: Verify against the live deployment**

Open the production URL and confirm each item:

- The nav bar links to all three sections, and the current one is highlighted
- The locations list loads with real names, types, and resident counts
- The episodes list loads with codes, titles, and air dates
- Filtering locations by dimension narrows the results and updates the URL
- Filtering episodes by `S03` returns that season only
- A character card opens a dossier with a portrait, fields, and episode list
- A dead character's dossier carries the `TERMINATED` stamp
- A character with an unknown origin shows a redaction bar instead of a link
- Clicking a resolved origin opens that location's page
- A location page lists `REGISTERED RESIDENTS`, and clicking one opens their dossier
- An episode page lists `PERSONNEL PRESENT`, and clicking one opens their dossier
- `/characters/99999` shows the dimension-not-found body rather than an error state
- `/characters/rick` shows the same, since the backend answers 400 and the page treats any non-404 failure as an error state with retry — confirm which one appears and that it is not a blank screen
- Copying any detail URL into a new tab renders the same page

- [ ] **Step 5: Tag the milestone**

```bash
git tag plan-2-entities
git push origin plan-2-entities
```

- [ ] **Step 6: Update the handoff note**

In `START-HERE.md`, update the "Current state" and "Immediate next step" sections to describe plan 2 as complete and point at plan 3, and add any deviation discovered during execution to the deviations list.

```bash
git add START-HERE.md
git commit -m "docs: bring the handoff note up to date through plan 2"
git push
```

---

## Verification against the spec

| Spec requirement | Task |
|---|---|
| §6.2 `/api/characters/:id` with expanded relations | 4, 5 |
| §6.2 episode expansion via the batch endpoint | 3, 4 |
| §6.2 `resolved: false` for a relation with no id | 1, 4, 14 |
| §6.2 `/api/locations` and `/api/locations/:id` with the resident roster | 6, 7 |
| §6.2 `/api/episodes` and `/api/episodes/:id` with the participating characters | 8, 9 |
| §6.2 empty result sets normalized rather than treated as errors | 3 |
| §6.3 cache keys with sorted parameters, 24 h TTL | 4, 6, 8 |
| §6.6 unknown id answers 404, malformed parameter answers 400 | 3, 5, 7, 9 |
| §7.1 routes for both list and detail of all three entities | 19 |
| §7.2 URL → Query → client → function data flow | 11, 12 |
| §7.3 pages compose, features query, shared stays generic | 13–19 |
| §7.5 pagination and page reset on filter change on every list | 12, 16, 18 |
| §11.3 the `TERMINATED` stamp, redaction bars, `PERSONNEL PRESENT`, `REGISTERED RESIDENTS` | 13, 14, 16, 18 |
| §11.4 skeletons mirroring the real geometry on lists and detail pages | 13, 15, 17 |
| §12.1 status never conveyed by colour alone, alt text on every image | 13, 14 |
| §12.2 lazy images with explicit dimensions | 13 |
| §12.3 tests at unit, component, and integration level | 1–19 |
| §12.4 the boundary rule still holds in the shipped bundle | 20 |
| §13.1 deploy as soon as a slice works | 10, 20 |

Deferred to later plans by design: §6.2 search, stats, ask, dossier, speak; §6.4 AI storage; §6.5 spend controls; §8 portal transitions; §9 dimensions; §10 AI features; §11.5 settings panel; §15 README. Microcopy centralization in `src/shared/lore/copy.ts` (§7.3) stays with plan 5, which owns the detail and microcopy layer.
