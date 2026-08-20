# Dossier C-137 — Portal, Dimensions, and Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the archive a front door and a personality — a hub page carrying live statistics and three destinations, a portal transition whose duration is the request rather than a fixed animation, three switchable dimensions that survive a reload without a flash, and a portal gun settings panel that governs all of it.

**Architecture:** Three independent layers, each landing before the next depends on it. Settings sit at the top of the React tree and write a `data-dimension` attribute plus one `localStorage` object. The portal is a state machine hook wrapped in a provider, with a canvas overlay; navigation goes through it via a `PortalLink` that degrades to an ordinary link when the portal is off or absent. The hub is a plain page over one new cached endpoint. The backend gains exactly one endpoint, `/api/stats`, following the layering plans 1 and 2 established: `router → handler → service → client/cache`.

**Tech Stack:** Unchanged from plans 1 and 2 — React 19, Vite, TypeScript, React Router v7, TanStack Query, Tailwind v4, Vitest, React Testing Library, MSW, Supabase Edge Functions (Deno), Supabase Postgres. **No new dependencies.** See "Two deviations from the spec, decided up front" below for why Framer Motion is not among them.

**Source spec:** `docs/superpowers/specs/2026-08-19-dossier-c137-design.md`
**Predecessors:** `docs/superpowers/plans/2026-08-20-dossier-c137-foundation.md` and `docs/superpowers/plans/2026-08-20-dossier-c137-entities.md`, both complete and tagged

**Baseline this plan assumes:** 124 frontend tests, 79 backend tests, lint and build clean, on `main` at tag `plan-2-entities`.

---

## Scope

This is plan 3 of 5. It covers spec §8 in full, §9 in full, §11.5 in full, §11.4's background refresh bar, §12.2's code splitting, and the `/` route from §7.1.

| In scope | Out of scope, and where it lands |
|---|---|
| `/api/stats` — entity counts, page counts, Ricks and Mortys | `/api/search`, `/api/ask`, `/api/dossier`, `/api/speak` — plans 4 and 5 |
| The hub at `/`: the gun, three destinations with live counts, the statistics strip | The coordinate input on the hub — it is the search field, and search is plan 4 |
| The portal transition system: state machine, canvas vortex, overlay, navigation | — |
| Dimensions: the provider, the attribute, pre-paint application, the recolor wave | — |
| The portal gun settings panel, in the header and on the hub | — |
| The background refresh bar and route code splitting | — |
| Replacing the placeholder `AppLayout` with the real header | The Konami easter egg (`useKonami`), the microcopy move to `shared/lore/copy.ts` — plan 5 |

**`/api/stats` moved into this plan.** Plan 2's scope table listed it under "plans 4 and 5". That was a grouping convenience — plan 2 was about entity CRUD — and it is wrong for the work: the hub cannot show a single live number without it, and `/api/stats` is a plain cached aggregate with no AI, no secrets, and no new infrastructure. It belongs with the page that consumes it.

**Copy still stays inline.** Spec §7.3 wants every string in `src/shared/lore/copy.ts`; plan 5 owns that move. Write new copy inline, in the same voice. The one exception is `shared/lore/quotes.ts`, which this plan creates — the portal needs it, and it is a data file rather than a microcopy registry.

---

## Two deviations from the spec, decided up front

**Framer Motion is not used; CSS keyframes are.** Spec §5 and §8.5 name Framer Motion for the wrapper and the timings. Two things changed since that was written. First, the portal's timings are not decorative — the state machine owns all four durations, because the traversal length is the request length, so an animation library would only be replaying numbers it was handed. Second, the visual itself is a `<canvas>`, not a tree of animated DOM nodes, so the wrapper is one scaling div. That leaves keyframes on a `data-phase` attribute doing the entire job, with no 50 kB dependency, no `AnimatePresence` exit-animation interaction with fake timers in jsdom, and an assertion (`data-phase`) that is far easier to test than a transform. The dimension recolor wave is a `clip-path` animation, which §9.3 already specifies as CSS.

**The hub reports locations, not distinct dimensions.** The design brief asks for "entities indexed, dimensions, episodes" on the statistics strip. No upstream endpoint aggregates distinct dimension strings — deriving it would mean walking all seven location pages — and §6.2 forbids hardcoding a number. The strip therefore reports entities indexed, locations on file, episodes logged, Ricks on file, and Mortys on file, all five derived from `info.count` values.

---

## Three things that will bite

**jsdom has neither `matchMedia` nor a canvas 2D context.** `window.matchMedia` is simply absent, and every render that touches settings asks for the system reduced-motion preference — so a stub goes into `src/test/setup.ts` in task 5, before anything depends on it. `canvas.getContext('2d')` returns `null` because the optional `canvas` package is not installed, so `PortalCanvas` must bail out cleanly on a null context, and its test stubs `getContext` with a proxy that accepts any method call. That stub also constrains the drawing code: it may call methods and set properties, but must never chain off a returned value, which rules out `createRadialGradient`. That is no loss — §8.5 forbids a smooth gradient anyway.

**The quote timer and the ceiling timer are measured from the shot, not from the phase.** An effect keyed on `phase` restarts both every time the phase advances, which would push the 1.5 s quote out past `firing`'s 400 ms and reset the 8 s ceiling mid-traversal. Both hang off a run counter that only `open()` increments, and both check the current phase through a ref before acting, so a timer that outlives its run does nothing.

**Component tests render cards with no providers at all.** `CharacterCard`, `LocationCard`, `EpisodeCard`, and `RosterGrid` are rendered in their tests inside nothing but a `MemoryRouter`. Task 20 swaps their `Link` for `PortalLink`, which reaches for both the settings context and the portal context. Both must degrade rather than throw: `useSettings` returns the defaults outside a provider, and `usePortalNavigation` navigates plainly when the portal context is absent. This is why task 15's fallback tests exist, and it is the reason those four test files need no provider boilerplate added to them.

---

## File structure

### Backend

```
supabase/functions/api/
  types.ts                          + Stats
  services/stats.ts                 NEW  five upstream counts behind one cache key
  handlers/stats.ts                 NEW
  router.ts                         + the /stats route, + stats on the bundle
  index.ts                          + the stats service
  tests/
    stats_test.ts                   NEW
    router_test.ts                  + a stats stub on the services helper
```

### Frontend

```
src/
  app/
    App.tsx                         + SettingsProvider
    AppLayout.tsx                   rewritten: the real header, the gun, the panel
    AppLayout.test.tsx              rewritten
    routes.tsx                      + the hub at /, every route lazy
  pages/
    HubPage.tsx                     NEW
    HubPage.test.tsx                NEW
  features/
    stats/useStats.ts               NEW
  shared/
    api/types.ts                    + Stats
    api/client.ts                   + fetchStats
    lore/quotes.ts                  NEW  loading lines and pickQuote
    settings/
      settings.ts                   NEW  contract, defaults, tolerant parsing
      SettingsContext.ts            NEW  context only, so the provider file stays a component file
      SettingsProvider.tsx          NEW
      useSettings.ts                NEW
      useReducedMotion.ts           NEW  useReducedMotion and usePortalEnabled
      SettingsPanel.tsx             NEW
      DimensionWave.tsx             NEW
      settings.test.ts              NEW
      settingsProvider.test.tsx     NEW
      motion.test.tsx               NEW
      SettingsPanel.test.tsx        NEW
      DimensionWave.test.tsx        NEW
    portal/
      portalTimings.ts              NEW  the four durations, the floor, the ceiling
      usePortalMachine.ts           NEW  the state machine
      drawPortal.ts                 NEW  the vortex, five properties from the reference
      PortalCanvas.tsx              NEW  the frame loop and its visibility guard
      PortalContext.ts              NEW
      PortalProvider.tsx            NEW  machine + arrival + overlay
      PortalOverlay.tsx             NEW
      PortalGun.tsx                 NEW  the hub hero
      PortalLink.tsx                NEW
      usePortalNavigation.ts        NEW
      portalSound.ts                NEW
      usePortalMachine.test.tsx     NEW
      PortalCanvas.test.tsx         NEW
      PortalProvider.test.tsx       NEW
      portalSound.test.ts           NEW
      portalNavigation.test.tsx     NEW
    ui/
      RefreshBar.tsx                NEW
      RefreshBar.test.tsx           NEW
  index.css                         + the keyframes
  test/setup.ts                     + the matchMedia stub
index.html                          + the pre-paint dimension script
```

**Why the context objects get their own files.** `SettingsContext.ts` and `PortalContext.ts` hold nothing but a `createContext` call. Keeping them out of the provider files means every `.tsx` file exports components and only components, which is what `eslint-plugin-react-refresh` wants. Plan 2 accepted three warnings of that kind; this plan does not add a fourth.

---

## Task 1: The stats service

**Files:**
- Modify: `supabase/functions/api/types.ts`
- Create: `supabase/functions/api/services/stats.ts`
- Create: `supabase/functions/api/tests/stats_test.ts`

- [ ] **Step 1: Write the failing tests**

Create `supabase/functions/api/tests/stats_test.ts`:

```ts
import { assertEquals } from 'jsr:@std/assert'
import { createStatsService } from '../services/stats.ts'
import type { CharacterQuery } from '../types.ts'

const passthroughCache = {
  resolve: async <T>(_key: string, _ttl: number, load: () => Promise<T>) => ({
    payload: await load(),
    stale: false,
  }),
}

function listResponse(count: number, pages: number) {
  return { info: { count, pages }, results: [] }
}

function stubClient() {
  const characterQueries: CharacterQuery[] = []
  return {
    characterQueries,
    client: {
      listCharacters: async (query: CharacterQuery) => {
        characterQueries.push(query)
        if (query.name === 'rick') return listResponse(112, 6)
        if (query.name === 'morty') return listResponse(53, 3)
        return listResponse(826, 42)
      },
      listLocations: async () => listResponse(126, 7),
      listEpisodes: async () => listResponse(51, 3),
    },
  }
}

Deno.test('reports a total and a page count for every entity type', async () => {
  const { client } = stubClient()
  const service = createStatsService(client, passthroughCache)

  const result = await service.getStats()

  assertEquals(result.payload.characters, { total: 826, pages: 42 })
  assertEquals(result.payload.locations, { total: 126, pages: 7 })
  assertEquals(result.payload.episodes, { total: 51, pages: 3 })
})

Deno.test('counts the Ricks and the Mortys by name', async () => {
  const { client } = stubClient()
  const service = createStatsService(client, passthroughCache)

  const result = await service.getStats()

  assertEquals(result.payload.ricks, 112)
  assertEquals(result.payload.mortys, 53)
})

Deno.test('derives every number from an upstream response', async () => {
  const { client, characterQueries } = stubClient()
  const service = createStatsService(client, passthroughCache)

  await service.getStats()

  // Three character queries: the whole roster, the Ricks, and the Mortys.
  assertEquals(characterQueries.length, 3)
  assertEquals(characterQueries[0], { page: 1 })
  assertEquals(characterQueries[1], { page: 1, name: 'rick' })
  assertEquals(characterQueries[2], { page: 1, name: 'morty' })
})

Deno.test('caches the whole aggregate under a single key', async () => {
  const keys: string[] = []
  const recordingCache = {
    resolve: async <T>(key: string, _ttl: number, load: () => Promise<T>) => {
      keys.push(key)
      return { payload: await load(), stale: false }
    },
  }
  const { client } = stubClient()
  const service = createStatsService(client, recordingCache)

  await service.getStats()

  assertEquals(keys, ['stats'])
})

Deno.test('caches the aggregate for a full day', async () => {
  let seenTtl = 0
  const recordingCache = {
    resolve: async <T>(_key: string, ttl: number, load: () => Promise<T>) => {
      seenTtl = ttl
      return { payload: await load(), stale: false }
    },
  }
  const { client } = stubClient()
  const service = createStatsService(client, recordingCache)

  await service.getStats()

  assertEquals(seenTtl, 24 * 60 * 60)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm run test:api
```

Expected: FAIL — module `../services/stats.ts` not found.

- [ ] **Step 3: Add the contract**

Append to `supabase/functions/api/types.ts`:

```ts
export type EntityCount = {
  total: number
  pages: number
}

export type Stats = {
  characters: EntityCount
  locations: EntityCount
  episodes: EntityCount
  ricks: number
  mortys: number
}
```

- [ ] **Step 4: Write the service**

Create `supabase/functions/api/services/stats.ts`:

```ts
import { TTL_SECONDS } from './refs.ts'
import type { Resolved } from '../lib/cache.ts'
import type {
  RawCharacter,
  RawEpisode,
  RawLocation,
  RmListResponse,
} from '../clients/rmClient.ts'
import type {
  CharacterQuery,
  EpisodeQuery,
  LocationQuery,
  Stats,
} from '../types.ts'

type StatsClient = {
  listCharacters(query: CharacterQuery): Promise<RmListResponse<RawCharacter>>
  listLocations(query: LocationQuery): Promise<RmListResponse<RawLocation>>
  listEpisodes(query: EpisodeQuery): Promise<RmListResponse<RawEpisode>>
}

type CacheLike = {
  resolve<T>(
    key: string,
    ttlSeconds: number,
    load: () => Promise<T>,
  ): Promise<Resolved<T>>
}

export function createStatsService(client: StatsClient, cache: CacheLike) {
  async function getStats(): Promise<Resolved<Stats>> {
    // The aggregate takes no parameters, so the prefix alone is the key.
    return await cache.resolve('stats', TTL_SECONDS, async () => {
      // Every figure comes from an upstream `info` block. Nothing here is a
      // constant, which is what spec section 6.2 asks for.
      const [characters, locations, episodes, ricks, mortys] = await Promise.all([
        client.listCharacters({ page: 1 }),
        client.listLocations({ page: 1 }),
        client.listEpisodes({ page: 1 }),
        client.listCharacters({ page: 1, name: 'rick' }),
        client.listCharacters({ page: 1, name: 'morty' }),
      ])

      return {
        characters: { total: characters.info.count, pages: characters.info.pages },
        locations: { total: locations.info.count, pages: locations.info.pages },
        episodes: { total: episodes.info.count, pages: episodes.info.pages },
        ricks: ricks.info.count,
        mortys: mortys.info.count,
      }
    })
  }

  return { getStats }
}
```

The `characterQueries` assertion in step 1 expects the three character calls in the order written above. `Promise.all` starts them in array order, and the stub records on entry, so the order is deterministic.

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npm run test:api
```

Expected: PASS — 84 tests (79 existing plus 5 new).

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/api/types.ts supabase/functions/api/services/stats.ts supabase/functions/api/tests/stats_test.ts
git commit -m "feat: aggregate archive statistics behind one cache key"
```

---

## Task 2: The stats handler and route

**Files:**
- Create: `supabase/functions/api/handlers/stats.ts`
- Modify: `supabase/functions/api/router.ts`
- Modify: `supabase/functions/api/tests/router_test.ts`
- Modify: `supabase/functions/api/index.ts`

- [ ] **Step 1: Write the failing test**

In `supabase/functions/api/tests/router_test.ts`, add a stats stub to the `services` helper, immediately after the `episodes` block and before the `...overrides` line:

```ts
    stats: {
      getStats: async () => ({
        payload: {
          characters: { total: 826, pages: 42 },
          locations: { total: 126, pages: 7 },
          episodes: { total: 51, pages: 3 },
          ricks: 112,
          mortys: 53,
        },
        stale: false,
      }),
    },
```

Widening the bundle without widening this helper is what broke six tests mid-plan last time; do it in the same edit.

Then append to the same file:

```ts
Deno.test('routes stats requests to the service', async () => {
  const router = createRouter(services())

  const response = await router(new Request('https://x.test/api/stats'))
  const body = await response.json()

  assertEquals(response.status, 200)
  assertEquals(body.characters.total, 826)
  assertEquals(body.ricks, 112)
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm run test:api
```

Expected: FAIL — the stats route answers 404, and `stats` is not a known field on the bundle.

- [ ] **Step 3: Write the handler**

Create `supabase/functions/api/handlers/stats.ts`:

```ts
import type { Resolved } from '../lib/cache.ts'
import type { Stats } from '../types.ts'

export type StatsService = {
  getStats(): Promise<Resolved<Stats>>
}

export async function handleGetStats(
  service: StatsService,
): Promise<{ body: Stats; stale: boolean }> {
  const result = await service.getStats()
  return { body: result.payload, stale: result.stale }
}
```

- [ ] **Step 4: Add the route**

In `supabase/functions/api/router.ts`, add to the import block, immediately after the episodes handler import:

```ts
import { handleGetStats, type StatsService } from './handlers/stats.ts'
```

extend the bundle type:

```ts
export type Services = {
  characters: CharacterService
  locations: LocationService
  episodes: EpisodeService
  stats: StatsService
}
```

and add the route immediately after the `/episodes` list route:

```ts
      if (path === '/stats') {
        const { body, stale } = await handleGetStats(services.stats)
        return json(body, 200, staleHeaders(stale))
      }
```

- [ ] **Step 5: Wire the service in the entry point**

In `supabase/functions/api/index.ts`, add the import:

```ts
import { createStatsService } from './services/stats.ts'
```

and complete the bundle:

```ts
const route = createRouter({
  characters: createCharacterService(client, cache),
  locations: createLocationService(client, cache),
  episodes: createEpisodeService(client, cache),
  stats: createStatsService(client, cache),
})
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
npm run test:api
```

Expected: PASS — 85 tests.

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/api
git commit -m "feat: route archive statistics requests"
```

---

## Task 3: Deploy the stats endpoint

Spec §13.1: deploy as soon as a slice works, never in a batch at the end. The backend half of this plan is one endpoint, and it is finished — deploy it now rather than at task 22.

- [ ] **Step 1: Run the whole backend suite**

```bash
npm run test:api
```

Expected: PASS — 85 tests.

- [ ] **Step 2: Deploy**

```bash
npx supabase functions deploy api --no-verify-jwt
```

- [ ] **Step 3: Verify against the deployment**

```bash
BASE=https://coeupddmmjnjotarlnwg.supabase.co/functions/v1/api

curl -s "$BASE/stats"; echo
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/characters?page=1"
```

Expected: the stats payload carries five real figures — around 826 characters, 126 locations, 51 episodes, and non-zero Rick and Morty counts. The character list still answers `200`, which confirms the router change broke nothing that already worked.

- [ ] **Step 4: Confirm the second call is served from the cache**

```bash
time curl -s -o /dev/null "$BASE/stats"
time curl -s -o /dev/null "$BASE/stats"
```

Expected: the second call is markedly faster. The first made five upstream requests; the second made none.

- [ ] **Step 5: Push**

```bash
git push
```

---

## Task 4: The settings contract and its storage

**Files:**
- Create: `src/shared/settings/settings.ts`
- Create: `src/shared/settings/settings.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/shared/settings/settings.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  parseSettings,
  serializeSettings,
} from './settings'

describe('parseSettings', () => {
  it('falls back to the defaults when nothing is stored', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS)
  })

  it('falls back to the defaults on unparseable JSON', () => {
    expect(parseSettings('{not json')).toEqual(DEFAULT_SETTINGS)
  })

  it('falls back to the defaults when the payload is not an object', () => {
    expect(parseSettings('42')).toEqual(DEFAULT_SETTINGS)
  })

  it('reads a complete stored object', () => {
    const stored = {
      dimension: 'citadel',
      portalSfx: true,
      portalTransitions: false,
      reducedMotion: 'on',
    }

    expect(parseSettings(JSON.stringify(stored))).toEqual(stored)
  })

  it('replaces an unknown dimension without discarding the rest', () => {
    const stored = {
      dimension: 'froopyland',
      portalSfx: true,
      portalTransitions: false,
      reducedMotion: 'off',
    }

    expect(parseSettings(JSON.stringify(stored))).toEqual({
      dimension: 'c-137',
      portalSfx: true,
      portalTransitions: false,
      reducedMotion: 'off',
    })
  })

  it('round-trips through serializeSettings', () => {
    const settings = {
      dimension: 'cronenberg' as const,
      portalSfx: true,
      portalTransitions: true,
      reducedMotion: 'auto' as const,
    }

    expect(parseSettings(serializeSettings(settings))).toEqual(settings)
  })
})

describe('SETTINGS_KEY', () => {
  it('is the key the pre-paint script in index.html reads', () => {
    expect(SETTINGS_KEY).toBe('citadel-settings')
  })
})
```

That is seven tests, not six — the key is asserted on its own because an inline script in `index.html` depends on its exact value and cannot import it.

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test
```

Expected: FAIL — cannot resolve `./settings`.

- [ ] **Step 3: Write the contract**

Create `src/shared/settings/settings.ts`:

```ts
export type Dimension = 'c-137' | 'citadel' | 'cronenberg'
export type MotionPreference = 'auto' | 'on' | 'off'

export type Settings = {
  dimension: Dimension
  portalSfx: boolean
  portalTransitions: boolean
  reducedMotion: MotionPreference
}

/**
 * The key predates the rename from Citadel Archive. Spec section 9.2 names it
 * explicitly and the pre-paint script in index.html hardcodes it; changing it
 * would strand every existing visitor's saved dimension for no gain.
 */
export const SETTINGS_KEY = 'citadel-settings'

export const DIMENSIONS: Dimension[] = ['c-137', 'citadel', 'cronenberg']

export const DIMENSION_LABELS: Record<Dimension, string> = {
  'c-137': 'C-137',
  citadel: 'Citadel',
  cronenberg: 'Cronenberg-1',
}

export const MOTION_PREFERENCES: MotionPreference[] = ['auto', 'on', 'off']

export const DEFAULT_SETTINGS: Settings = {
  dimension: 'c-137',
  portalSfx: false,
  portalTransitions: true,
  reducedMotion: 'auto',
}

function isDimension(value: unknown): value is Dimension {
  return typeof value === 'string' && (DIMENSIONS as string[]).includes(value)
}

function isMotionPreference(value: unknown): value is MotionPreference {
  return (
    typeof value === 'string' && (MOTION_PREFERENCES as string[]).includes(value)
  )
}

function booleanOr(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

/**
 * Settings arrive from localStorage, which any visitor can edit by hand and
 * which any earlier version of this app may have written. Each field falls
 * back on its own, so one bad value never costs the user the other three.
 */
export function parseSettings(raw: string | null): Settings {
  if (!raw) return DEFAULT_SETTINGS

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return DEFAULT_SETTINGS
  }

  if (typeof parsed !== 'object' || parsed === null) return DEFAULT_SETTINGS
  const value = parsed as Record<string, unknown>

  return {
    dimension: isDimension(value.dimension)
      ? value.dimension
      : DEFAULT_SETTINGS.dimension,
    portalSfx: booleanOr(value.portalSfx, DEFAULT_SETTINGS.portalSfx),
    portalTransitions: booleanOr(
      value.portalTransitions,
      DEFAULT_SETTINGS.portalTransitions,
    ),
    reducedMotion: isMotionPreference(value.reducedMotion)
      ? value.reducedMotion
      : DEFAULT_SETTINGS.reducedMotion,
  }
}

export function serializeSettings(settings: Settings): string {
  return JSON.stringify(settings)
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS — 131 tests (124 existing plus 7 new).

- [ ] **Step 5: Commit**

```bash
git add src/shared/settings
git commit -m "feat: define the settings contract and parse it defensively"
```

---

## Task 5: The settings provider

**Files:**
- Create: `src/shared/settings/SettingsContext.ts`
- Create: `src/shared/settings/SettingsProvider.tsx`
- Create: `src/shared/settings/useSettings.ts`
- Create: `src/shared/settings/settingsProvider.test.tsx`
- Modify: `src/test/setup.ts`
- Modify: `src/app/App.tsx`

- [ ] **Step 1: Add the matchMedia stub**

jsdom does not implement `window.matchMedia`, and from task 6 onward almost every render asks for it. Replace the contents of `src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'

/**
 * jsdom ships no matchMedia. The settings layer asks it for the system
 * reduced-motion preference on nearly every render, so a quiet default lives
 * here rather than in each test. A test that needs `reduce` stubs it itself.
 */
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
}
```

- [ ] **Step 2: Write the failing tests**

Create `src/shared/settings/settingsProvider.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsProvider } from './SettingsProvider'
import { useSettings } from './useSettings'
import { DEFAULT_SETTINGS, SETTINGS_KEY } from './settings'

function Probe() {
  const { settings, setSetting } = useSettings()

  return (
    <div>
      <span data-testid="dimension">{settings.dimension}</span>
      <span data-testid="sfx">{String(settings.portalSfx)}</span>
      <button onClick={() => setSetting('dimension', 'citadel')}>go citadel</button>
      <button onClick={() => setSetting('portalSfx', true)}>sfx on</button>
    </div>
  )
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-dimension')
})

describe('SettingsProvider', () => {
  it('starts from the defaults when nothing is stored', () => {
    render(
      <SettingsProvider>
        <Probe />
      </SettingsProvider>,
    )

    expect(screen.getByTestId('dimension')).toHaveTextContent(
      DEFAULT_SETTINGS.dimension,
    )
    expect(screen.getByTestId('sfx')).toHaveTextContent('false')
  })

  it('reads settings already in localStorage', () => {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ ...DEFAULT_SETTINGS, dimension: 'cronenberg' }),
    )

    render(
      <SettingsProvider>
        <Probe />
      </SettingsProvider>,
    )

    expect(screen.getByTestId('dimension')).toHaveTextContent('cronenberg')
  })

  it('updates a single setting without touching the others', async () => {
    render(
      <SettingsProvider>
        <Probe />
      </SettingsProvider>,
    )

    await userEvent.click(screen.getByText('sfx on'))

    expect(screen.getByTestId('sfx')).toHaveTextContent('true')
    expect(screen.getByTestId('dimension')).toHaveTextContent('c-137')
  })

  it('persists every change under the settings key', async () => {
    render(
      <SettingsProvider>
        <Probe />
      </SettingsProvider>,
    )

    await userEvent.click(screen.getByText('go citadel'))

    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}')
    expect(stored.dimension).toBe('citadel')
  })

  it('writes the dimension onto the document element', async () => {
    render(
      <SettingsProvider>
        <Probe />
      </SettingsProvider>,
    )

    expect(document.documentElement.getAttribute('data-dimension')).toBe('c-137')

    await userEvent.click(screen.getByText('go citadel'))

    expect(document.documentElement.getAttribute('data-dimension')).toBe('citadel')
  })

  it('falls back to inert defaults outside a provider', async () => {
    render(<Probe />)

    expect(screen.getByTestId('dimension')).toHaveTextContent('c-137')

    await userEvent.click(screen.getByText('go citadel'))

    // No provider, nothing to update — and no crash, which is what lets the
    // entity cards be rendered bare in their own tests.
    expect(screen.getByTestId('dimension')).toHaveTextContent('c-137')
  })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

```bash
npm test
```

Expected: FAIL — cannot resolve `./SettingsProvider`.

- [ ] **Step 4: Write the context**

Create `src/shared/settings/SettingsContext.ts`:

```ts
import { createContext } from 'react'
import type { Settings } from './settings'

export type SettingsContextValue = {
  settings: Settings
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
}

export const SettingsContext = createContext<SettingsContextValue | null>(null)
```

- [ ] **Step 5: Write the provider**

Create `src/shared/settings/SettingsProvider.tsx`:

```tsx
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { SettingsContext } from './SettingsContext'
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  parseSettings,
  serializeSettings,
} from './settings'
import type { Settings } from './settings'

function readStoredSettings(): Settings {
  try {
    return parseSettings(localStorage.getItem(SETTINGS_KEY))
  } catch {
    // Private-mode browsers throw on access rather than returning null.
    return DEFAULT_SETTINGS
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(readStoredSettings)

  const setSetting = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) => {
      setSettings((current) => ({ ...current, [key]: value }))
    },
    [],
  )

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, serializeSettings(settings))
    } catch {
      // A blocked or full store costs persistence, not the session.
    }
  }, [settings])

  useEffect(() => {
    // The same attribute the pre-paint script sets, so the two never disagree.
    document.documentElement.setAttribute('data-dimension', settings.dimension)
  }, [settings.dimension])

  const value = useMemo(() => ({ settings, setSetting }), [settings, setSetting])

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  )
}
```

- [ ] **Step 6: Write the hook**

Create `src/shared/settings/useSettings.ts`:

```ts
import { useContext } from 'react'
import { SettingsContext } from './SettingsContext'
import { DEFAULT_SETTINGS } from './settings'
import type { SettingsContextValue } from './SettingsContext'

/**
 * Outside a provider this returns the defaults with an inert setter rather
 * than throwing. Entity cards reach the settings layer through PortalLink and
 * are rendered bare in their own tests; a throwing hook would mean wrapping
 * four test files in provider boilerplate just to assert an href.
 */
const FALLBACK: SettingsContextValue = {
  settings: DEFAULT_SETTINGS,
  setSetting: () => {},
}

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext) ?? FALLBACK
}
```

- [ ] **Step 7: Mount the provider in the app**

In `src/app/App.tsx`, add the import:

```tsx
import { SettingsProvider } from '../shared/settings/SettingsProvider'
```

and wrap the router:

```tsx
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <RouterProvider router={router} />
      </SettingsProvider>
    </QueryClientProvider>
  )
}
```

- [ ] **Step 8: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS — 137 tests.

- [ ] **Step 9: Commit**

```bash
git add src/shared/settings src/test/setup.ts src/app/App.tsx
git commit -m "feat: hold settings in one provider and one storage key"
```

---

## Task 6: Reduced motion and the portal switch

**Files:**
- Create: `src/shared/settings/useReducedMotion.ts`
- Create: `src/shared/settings/motion.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/shared/settings/motion.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SettingsProvider } from './SettingsProvider'
import { useReducedMotion, usePortalEnabled } from './useReducedMotion'
import { DEFAULT_SETTINGS, SETTINGS_KEY } from './settings'
import type { Settings } from './settings'

function stubSystemPreference(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }))
}

function Probe() {
  const reduced = useReducedMotion()
  const portalEnabled = usePortalEnabled()

  return (
    <div>
      <span data-testid="reduced">{String(reduced)}</span>
      <span data-testid="portal">{String(portalEnabled)}</span>
    </div>
  )
}

function renderWith(settings: Partial<Settings>) {
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ ...DEFAULT_SETTINGS, ...settings }),
  )

  return render(
    <SettingsProvider>
      <Probe />
    </SettingsProvider>,
  )
}

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

describe('useReducedMotion', () => {
  it('follows the system when set to auto and the system is quiet', () => {
    stubSystemPreference(false)
    renderWith({ reducedMotion: 'auto' })
    expect(screen.getByTestId('reduced')).toHaveTextContent('false')
  })

  it('follows the system when set to auto and the system asks to reduce', () => {
    stubSystemPreference(true)
    renderWith({ reducedMotion: 'auto' })
    expect(screen.getByTestId('reduced')).toHaveTextContent('true')
  })

  it('overrides a quiet system when set to on', () => {
    stubSystemPreference(false)
    renderWith({ reducedMotion: 'on' })
    expect(screen.getByTestId('reduced')).toHaveTextContent('true')
  })

  it('overrides a reducing system when set to off', () => {
    stubSystemPreference(true)
    renderWith({ reducedMotion: 'off' })
    expect(screen.getByTestId('reduced')).toHaveTextContent('false')
  })
})

describe('usePortalEnabled', () => {
  it('is on when transitions are on and motion is not reduced', () => {
    stubSystemPreference(false)
    renderWith({ portalTransitions: true, reducedMotion: 'auto' })
    expect(screen.getByTestId('portal')).toHaveTextContent('true')
  })

  it('is off when the transitions toggle is off', () => {
    stubSystemPreference(false)
    renderWith({ portalTransitions: false, reducedMotion: 'auto' })
    expect(screen.getByTestId('portal')).toHaveTextContent('false')
  })

  it('is off when motion is reduced, whatever the toggle says', () => {
    stubSystemPreference(true)
    renderWith({ portalTransitions: true, reducedMotion: 'auto' })
    expect(screen.getByTestId('portal')).toHaveTextContent('false')
  })
})
```

That is seven tests.

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test
```

Expected: FAIL — cannot resolve `./useReducedMotion`.

- [ ] **Step 3: Write the hooks**

Create `src/shared/settings/useReducedMotion.ts`:

```ts
import { useEffect, useState } from 'react'
import { useSettings } from './useSettings'

const REDUCE_QUERY = '(prefers-reduced-motion: reduce)'

function systemPrefersReduce(): boolean {
  if (typeof matchMedia !== 'function') return false
  return matchMedia(REDUCE_QUERY).matches
}

/**
 * AUTO reads the system preference; ON and OFF are a deliberate override in
 * either direction, which is what spec section 11.5 asks the three-state
 * control to mean.
 */
export function useReducedMotion(): boolean {
  const { settings } = useSettings()
  const [systemReduce, setSystemReduce] = useState(systemPrefersReduce)

  useEffect(() => {
    if (typeof matchMedia !== 'function') return

    const media = matchMedia(REDUCE_QUERY)
    const update = () => setSystemReduce(media.matches)

    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  if (settings.reducedMotion === 'on') return true
  if (settings.reducedMotion === 'off') return false
  return systemReduce
}

export function usePortalEnabled(): boolean {
  const { settings } = useSettings()
  const reducedMotion = useReducedMotion()
  return settings.portalTransitions && !reducedMotion
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS — 144 tests.

- [ ] **Step 5: Commit**

```bash
git add src/shared/settings
git commit -m "feat: resolve reduced motion from the system and the override"
```

---

## Task 7: Apply the dimension before first paint

Without this, a visitor on the light dimension gets a dark flash on every load: React mounts, the provider reads storage, and the attribute changes one frame too late.

**Files:**
- Modify: `index.html`
- Create: `src/app/prepaint.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/prepaint.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { SETTINGS_KEY } from '../shared/settings/settings'

const html = readFileSync('index.html', 'utf8')

describe('the pre-paint dimension script', () => {
  it('reads the same storage key the settings module owns', () => {
    expect(html).toContain(SETTINGS_KEY)
  })

  it('runs before the application module', () => {
    const prepaint = html.indexOf(SETTINGS_KEY)
    const entry = html.indexOf('/src/main.tsx')

    expect(prepaint).toBeGreaterThan(-1)
    expect(entry).toBeGreaterThan(-1)
    // A dimension applied after the entry point is a dimension applied after
    // the first paint, which is the flash this script exists to prevent.
    expect(prepaint).toBeLessThan(entry)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL — `index.html` does not contain `citadel-settings`.

- [ ] **Step 3: Add the script**

In `index.html`, insert this immediately before the closing `</head>` tag:

```html
    <script>
      // Applied before first paint. The settings provider sets the same
      // attribute once React mounts; until then this is what stops a
      // light-dimension visitor from seeing a dark flash on every load.
      (function () {
        try {
          var raw = localStorage.getItem('citadel-settings')
          if (!raw) return
          var dimension = JSON.parse(raw).dimension
          if (['c-137', 'citadel', 'cronenberg'].indexOf(dimension) === -1) return
          document.documentElement.setAttribute('data-dimension', dimension)
        } catch (error) {
          // A corrupt entry is not worth a blank page.
        }
      })()
    </script>
```

The key is written out rather than imported: this script runs before any module loads, so it cannot import `SETTINGS_KEY`. The first test in step 1 is what keeps the two copies in agreement.

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm test
```

Expected: PASS — 146 tests.

- [ ] **Step 5: Verify by hand**

```bash
npm run dev
```

The settings panel is not wired into the header yet, so set the dimension from the browser console and reload:

```js
localStorage.setItem('citadel-settings', JSON.stringify({ dimension: 'citadel', portalSfx: false, portalTransitions: true, reducedMotion: 'auto' }))
```

Expected: the page comes back light with no dark flash. Run `localStorage.clear()` afterwards.

- [ ] **Step 6: Commit**

```bash
git add index.html src/app/prepaint.test.ts
git commit -m "feat: apply the stored dimension before first paint"
```

---

## Task 8: The portal gun settings panel

**Files:**
- Create: `src/shared/settings/SettingsPanel.tsx`
- Create: `src/shared/settings/SettingsPanel.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/shared/settings/SettingsPanel.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsProvider } from './SettingsProvider'
import { SettingsPanel } from './SettingsPanel'
import { SETTINGS_KEY } from './settings'

function renderPanel(onClose = () => {}) {
  return render(
    <SettingsProvider>
      <SettingsPanel onClose={onClose} />
    </SettingsProvider>,
  )
}

function stored() {
  return JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}')
}

beforeEach(() => localStorage.clear())

describe('SettingsPanel', () => {
  it('presents the four settings the spec names', () => {
    renderPanel()

    expect(screen.getByText('PORTAL GUN SETTINGS')).toBeInTheDocument()
    expect(screen.getByText('DIMENSION')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'PORTAL SFX' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'PORTAL TRANSITIONS' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'REDUCED MOTION' }),
    ).toBeInTheDocument()
  })

  it('marks the active dimension and only that one', () => {
    renderPanel()

    expect(screen.getByRole('radio', { name: 'C-137' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Citadel' })).not.toBeChecked()
  })

  it('switches dimension on selection', async () => {
    renderPanel()

    await userEvent.click(screen.getByRole('radio', { name: 'Cronenberg-1' }))

    expect(screen.getByRole('radio', { name: 'Cronenberg-1' })).toBeChecked()
    expect(stored().dimension).toBe('cronenberg')
  })

  it('turns portal sound on, which is off by default', async () => {
    renderPanel()
    const toggle = screen.getByRole('button', { name: 'PORTAL SFX' })

    expect(toggle).toHaveTextContent('OFF')

    await userEvent.click(toggle)

    expect(toggle).toHaveTextContent('ON')
    expect(stored().portalSfx).toBe(true)
  })

  it('turns portal transitions off, which are on by default', async () => {
    renderPanel()
    const toggle = screen.getByRole('button', { name: 'PORTAL TRANSITIONS' })

    expect(toggle).toHaveTextContent('ON')

    await userEvent.click(toggle)

    expect(toggle).toHaveTextContent('OFF')
    expect(stored().portalTransitions).toBe(false)
  })

  it('cycles reduced motion through its three states', async () => {
    renderPanel()
    const toggle = screen.getByRole('button', { name: 'REDUCED MOTION' })

    expect(toggle).toHaveTextContent('AUTO')

    await userEvent.click(toggle)
    expect(toggle).toHaveTextContent('ON')

    await userEvent.click(toggle)
    expect(toggle).toHaveTextContent('OFF')

    await userEvent.click(toggle)
    expect(toggle).toHaveTextContent('AUTO')
  })

  it('closes on Escape', async () => {
    const onClose = vi.fn()
    renderPanel(onClose)

    await userEvent.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test
```

Expected: FAIL — cannot resolve `./SettingsPanel`.

- [ ] **Step 3: Write the panel**

Create `src/shared/settings/SettingsPanel.tsx`:

```tsx
import { useEffect, useRef } from 'react'
import { useSettings } from './useSettings'
import { DIMENSIONS, DIMENSION_LABELS, MOTION_PREFERENCES } from './settings'
import type { MotionPreference } from './settings'

type SettingsPanelProps = {
  onClose: () => void
}

const MOTION_LABELS: Record<MotionPreference, string> = {
  auto: 'AUTO',
  on: 'ON',
  off: 'OFF',
}

const ROW = 'flex items-center justify-between gap-6 border-b border-line py-3'
const LABEL = 'font-mono text-xs tracking-widest text-muted'
const CONTROL =
  'border border-line px-3 py-1 font-mono text-xs text-fg transition-colors ' +
  'hover:border-accent hover:text-accent'
const ACTIVE = 'border-accent text-accent'

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { settings, setSetting } = useSettings()
  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  useEffect(() => {
    panelRef.current?.focus()
  }, [])

  function cycleMotion() {
    const index = MOTION_PREFERENCES.indexOf(settings.reducedMotion)
    setSetting(
      'reducedMotion',
      MOTION_PREFERENCES[(index + 1) % MOTION_PREFERENCES.length],
    )
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Portal gun settings"
      tabIndex={-1}
      // Styled as the gun's housing: a raised panel with a hard border, which
      // is the single idea taken from design reference 07.
      className="w-80 border border-line bg-raised p-4 shadow-xl outline-none"
    >
      <p className="font-mono text-xs tracking-widest text-accent">
        PORTAL GUN SETTINGS
      </p>

      <div className={ROW}>
        <span className={LABEL} id="settings-dimension">
          DIMENSION
        </span>
        <div
          role="radiogroup"
          aria-labelledby="settings-dimension"
          className="flex gap-2"
        >
          {DIMENSIONS.map((dimension) => (
            <button
              key={dimension}
              type="button"
              role="radio"
              aria-checked={settings.dimension === dimension}
              onClick={() => setSetting('dimension', dimension)}
              className={`${CONTROL} ${settings.dimension === dimension ? ACTIVE : ''}`}
            >
              {DIMENSION_LABELS[dimension]}
            </button>
          ))}
        </div>
      </div>

      <div className={ROW}>
        <span className={LABEL} aria-hidden="true">
          PORTAL SFX
        </span>
        <button
          type="button"
          aria-label="PORTAL SFX"
          aria-pressed={settings.portalSfx}
          onClick={() => setSetting('portalSfx', !settings.portalSfx)}
          className={CONTROL}
        >
          {settings.portalSfx ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className={ROW}>
        <span className={LABEL} aria-hidden="true">
          PORTAL TRANSITIONS
        </span>
        <button
          type="button"
          aria-label="PORTAL TRANSITIONS"
          aria-pressed={settings.portalTransitions}
          onClick={() =>
            setSetting('portalTransitions', !settings.portalTransitions)
          }
          className={CONTROL}
        >
          {settings.portalTransitions ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className="flex items-center justify-between gap-6 py-3">
        <span className={LABEL} aria-hidden="true">
          REDUCED MOTION
        </span>
        <button
          type="button"
          aria-label="REDUCED MOTION"
          onClick={cycleMotion}
          className={CONTROL}
        >
          {MOTION_LABELS[settings.reducedMotion]}
        </button>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="mt-2 w-full border border-line py-2 font-mono text-xs text-muted transition-colors hover:border-accent hover:text-accent"
      >
        CLOSE
      </button>
    </div>
  )
}
```

The three toggle labels are `aria-hidden` and each button carries its own `aria-label`. That is deliberate: a screen reader should announce "PORTAL SFX, pressed" rather than reading a label and the bare word "ON" as two unrelated things. `DIMENSION` stays visible to assistive technology because it labels the radio group.

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS — 153 tests.

- [ ] **Step 5: Commit**

```bash
git add src/shared/settings
git commit -m "feat: add the portal gun settings panel"
```

---

## Task 9: The dimension recolor wave

**Files:**
- Create: `src/shared/settings/DimensionWave.tsx`
- Create: `src/shared/settings/DimensionWave.test.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: Write the failing tests**

Create `src/shared/settings/DimensionWave.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsProvider } from './SettingsProvider'
import { DimensionWave } from './DimensionWave'
import { useSettings } from './useSettings'
import { DEFAULT_SETTINGS, SETTINGS_KEY } from './settings'

function Switcher() {
  const { setSetting } = useSettings()
  return <button onClick={() => setSetting('dimension', 'citadel')}>switch</button>
}

function renderWave(reducedMotion: 'auto' | 'on' = 'auto') {
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ ...DEFAULT_SETTINGS, reducedMotion }),
  )

  return render(
    <SettingsProvider>
      <Switcher />
      <DimensionWave />
    </SettingsProvider>,
  )
}

beforeEach(() => localStorage.clear())

describe('DimensionWave', () => {
  it('renders nothing until a dimension actually changes', () => {
    renderWave()
    expect(screen.queryByTestId('dimension-wave')).not.toBeInTheDocument()
  })

  it('plays when the dimension changes', async () => {
    renderWave()

    await userEvent.click(screen.getByText('switch'))

    expect(screen.getByTestId('dimension-wave')).toBeInTheDocument()
  })

  it('stays silent under reduced motion', async () => {
    renderWave('on')

    await userEvent.click(screen.getByText('switch'))

    expect(screen.queryByTestId('dimension-wave')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test
```

Expected: FAIL — cannot resolve `./DimensionWave`.

- [ ] **Step 3: Write the component**

Create `src/shared/settings/DimensionWave.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react'
import { useSettings } from './useSettings'
import { useReducedMotion } from './useReducedMotion'

const WAVE_MS = 250

/**
 * Switching dimensions repaints instantly — every colour is a custom property,
 * so flipping the attribute is the change. This is the decorative half: a
 * tinted disc expanding from the settings panel, so the repaint reads as an
 * event rather than as a glitch.
 */
export function DimensionWave() {
  const { settings } = useSettings()
  const reducedMotion = useReducedMotion()
  const previous = useRef(settings.dimension)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (previous.current === settings.dimension) return
    previous.current = settings.dimension
    if (reducedMotion) return

    setPlaying(true)
    const timer = setTimeout(() => setPlaying(false), WAVE_MS)
    return () => clearTimeout(timer)
  }, [settings.dimension, reducedMotion])

  if (!playing) return null

  return (
    <div
      data-testid="dimension-wave"
      aria-hidden="true"
      className="dimension-wave pointer-events-none fixed inset-0 z-40 bg-accent/20"
    />
  )
}
```

- [ ] **Step 4: Add the keyframes**

Append to `src/index.css`:

```css
/* The wave radiates from the settings panel, which sits at the top right of
   the header in every viewport wide enough to show it. */
:root {
  --wave-x: 88%;
  --wave-y: 6%;
}

@keyframes dimension-wave {
  from {
    clip-path: circle(0% at var(--wave-x) var(--wave-y));
  }
  to {
    clip-path: circle(150% at var(--wave-x) var(--wave-y));
  }
}

.dimension-wave {
  animation: dimension-wave 250ms ease-out both;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS — 156 tests.

- [ ] **Step 6: Commit**

```bash
git add src/shared/settings src/index.css
git commit -m "feat: play a recolor wave when the dimension changes"
```

---

## Task 10: The portal state machine

This is the heart of §8. It is pure timing logic with no DOM, so it is tested with fake timers and nothing else.

**Files:**
- Create: `src/shared/portal/portalTimings.ts`
- Create: `src/shared/portal/usePortalMachine.ts`
- Create: `src/shared/portal/usePortalMachine.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/shared/portal/usePortalMachine.test.tsx`:

```tsx
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
    advance(TRAVERSING_MIN_MS + COLLAPSING_MS)
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
```

That is eleven tests.

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test
```

Expected: FAIL — cannot resolve `./usePortalMachine`.

- [ ] **Step 3: Write the timings**

Create `src/shared/portal/portalTimings.ts`:

```ts
// Every number here comes from spec section 8.2. They live in one file
// because the machine, the keyframes, and the tests all have to agree.
export const FIRING_MS = 400
export const FIRING_SHORT_MS = 250
export const TRAVERSING_MIN_MS = 300
export const COLLAPSING_MS = 350
export const QUOTE_AFTER_MS = 1500
export const CEILING_MS = 8000
```

- [ ] **Step 4: Write the machine**

Create `src/shared/portal/usePortalMachine.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CEILING_MS,
  COLLAPSING_MS,
  FIRING_MS,
  FIRING_SHORT_MS,
  QUOTE_AFTER_MS,
  TRAVERSING_MIN_MS,
} from './portalTimings'

export type PortalPhase = 'idle' | 'firing' | 'traversing' | 'collapsing'
export type PortalVariant = 'full' | 'short'

function inFlight(phase: PortalPhase): boolean {
  return phase === 'firing' || phase === 'traversing'
}

/**
 * The transition is not a fixed animation laid over a wait: `traversing`
 * lasts exactly as long as the request, subject to a floor and a ceiling.
 */
export function usePortalMachine(now: () => number = Date.now) {
  const [phase, setPhase] = useState<PortalPhase>('idle')
  const [variant, setVariant] = useState<PortalVariant>('full')
  const [arrived, setArrived] = useState(false)
  const [showQuote, setShowQuote] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const [run, setRun] = useState(0)

  const traverseStartRef = useRef(0)
  const phaseRef = useRef<PortalPhase>('idle')

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  const open = useCallback((nextVariant: PortalVariant = 'full') => {
    setVariant(nextVariant)
    setArrived(false)
    setShowQuote(false)
    setTimedOut(false)
    setPhase('firing')
    setRun((current) => current + 1)
  }, [])

  const arrive = useCallback(() => setArrived(true), [])

  // firing -> traversing
  useEffect(() => {
    if (phase !== 'firing') return

    const duration = variant === 'short' ? FIRING_SHORT_MS : FIRING_MS
    const timer = setTimeout(() => {
      traverseStartRef.current = now()
      setPhase('traversing')
    }, duration)

    return () => clearTimeout(timer)
  }, [phase, variant, now])

  // traversing -> collapsing, never before the floor
  useEffect(() => {
    if (phase !== 'traversing' || !arrived) return

    const elapsed = now() - traverseStartRef.current
    const remaining = Math.max(0, TRAVERSING_MIN_MS - elapsed)
    const timer = setTimeout(() => setPhase('collapsing'), remaining)

    return () => clearTimeout(timer)
  }, [phase, arrived, now])

  // collapsing -> idle
  useEffect(() => {
    if (phase !== 'collapsing') return

    const timer = setTimeout(() => {
      setPhase('idle')
      setShowQuote(false)
      setArrived(false)
    }, COLLAPSING_MS)

    return () => clearTimeout(timer)
  }, [phase])

  // The quote and the ceiling are both measured from the shot rather than
  // from the current phase, so they hang off the run counter. An effect keyed
  // on the phase would restart both every time the phase advanced.
  useEffect(() => {
    if (run === 0) return

    const quoteTimer = setTimeout(() => {
      if (inFlight(phaseRef.current)) setShowQuote(true)
    }, QUOTE_AFTER_MS)

    const ceilingTimer = setTimeout(() => {
      if (!inFlight(phaseRef.current)) return
      // An endlessly spinning vortex reads as a frozen application.
      setTimedOut(true)
      setPhase('idle')
      setShowQuote(false)
      setArrived(false)
    }, CEILING_MS)

    return () => {
      clearTimeout(quoteTimer)
      clearTimeout(ceilingTimer)
    }
  }, [run])

  return { phase, variant, showQuote, timedOut, open, arrive }
}
```

`timedOut` is returned but no component reads it, and that is deliberate rather than an oversight. The ceiling's real job is closing the portal, which reveals the destination page that is already mounted and already showing its own skeletons or its own error state — the portal has no error surface of its own to raise. The flag is how the ceiling's behaviour is observed in a test; do not delete it as dead code.

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS — 167 tests.

- [ ] **Step 6: Commit**

```bash
git add src/shared/portal
git commit -m "feat: model the portal transition as a timed state machine"
```

---

## Task 11: The loading quotes

**Files:**
- Create: `src/shared/lore/quotes.ts`
- Create: `src/shared/lore/quotes.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/shared/lore/quotes.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { QUOTES, pickQuote } from './quotes'

describe('quotes', () => {
  it('carries several lines, none of them empty', () => {
    expect(QUOTES.length).toBeGreaterThanOrEqual(6)
    for (const quote of QUOTES) {
      expect(quote.trim().length).toBeGreaterThan(0)
    }
  })

  it('picks a line from the list', () => {
    expect(QUOTES).toContain(pickQuote())
  })

  it('is deterministic for a given random source', () => {
    expect(pickQuote(() => 0)).toBe(QUOTES[0])
    expect(pickQuote(() => 0.999999)).toBe(QUOTES[QUOTES.length - 1])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test
```

Expected: FAIL — cannot resolve `./quotes`.

- [ ] **Step 3: Write the lines**

Create `src/shared/lore/quotes.ts`:

```ts
/**
 * Shown beneath the vortex only when a request outlives 1.5 s, so a fast
 * response never flashes text on screen.
 */
export const QUOTES = [
  'Recalibrating. Do not look directly at the fluid.',
  'Crossing dimensions. Statistically, most of them are worse.',
  'Interdimensional customs is slow today.',
  'Hold still. This part is technically illegal in nine realities.',
  "Rerouting around a dimension where this archive doesn't exist.",
  'The Council of Ricks is reviewing your clearance. Ignore them.',
  'Almost. Try not to think about the other you.',
  'Portal fluid is cheap. Your patience is cheaper.',
]

export function pickQuote(random: () => number = Math.random): string {
  return QUOTES[Math.floor(random() * QUOTES.length)]
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS — 170 tests.

- [ ] **Step 5: Commit**

```bash
git add src/shared/lore
git commit -m "feat: add the lines the portal shows on a long wait"
```

---

## Task 12: The vortex on a canvas

**Files:**
- Create: `src/shared/portal/drawPortal.ts`
- Create: `src/shared/portal/PortalCanvas.tsx`
- Create: `src/shared/portal/PortalCanvas.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/shared/portal/PortalCanvas.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PortalCanvas } from './PortalCanvas'

/**
 * jsdom returns null from getContext('2d') — the optional `canvas` package is
 * not installed and does not need to be. This proxy accepts any method call
 * and any property assignment, which is all the drawing code does.
 */
function stubContext() {
  const context = new Proxy(
    {},
    {
      get: () => () => undefined,
      set: () => true,
    },
  ) as unknown as CanvasRenderingContext2D

  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context)
}

let frames: FrameRequestCallback[] = []

beforeEach(() => {
  stubContext()
  frames = []
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.push(callback)
    return frames.length
  })
  vi.stubGlobal('cancelAnimationFrame', () => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    get: () => hidden,
  })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('PortalCanvas', () => {
  it('renders a decorative canvas at the requested size', () => {
    render(<PortalCanvas size={280} />)

    const canvas = screen.getByTestId('portal-canvas')
    expect(canvas).toHaveAttribute('width', '280')
    expect(canvas).toHaveAttribute('aria-hidden', 'true')
  })

  it('starts a frame loop', () => {
    render(<PortalCanvas size={120} />)

    expect(frames.length).toBe(1)
  })

  it('keeps drawing frame after frame', () => {
    render(<PortalCanvas size={120} />)

    frames[0](16)

    expect(frames.length).toBe(2)
  })

  it('halts the loop when the tab goes away', () => {
    render(<PortalCanvas size={120} />)
    frames[0](16)
    const before = frames.length

    setHidden(true)
    frames[before - 1](32)

    // The frame that was already queued runs, but the loop must not queue
    // another one: a hidden tab has nothing to animate.
    expect(frames.length).toBe(before)
    setHidden(false)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test
```

Expected: FAIL — cannot resolve `./PortalCanvas`.

- [ ] **Step 3: Write the drawing**

Create `src/shared/portal/drawPortal.ts`:

```ts
// Sampled from design/references/show/portal-reference.png. Ordered from the
// outermost band inward; the widths are uneven on purpose.
const BAND_COLORS = [
  '#12300F',
  '#1E5A24',
  '#2F7A2C',
  '#4E9A2F',
  '#7FBE3A',
  '#A7CB56',
  '#CBE07A',
]

const CORE_LIGHT = '#E6F0A0'
const CORE_PALE = '#F4F6C8'
const FLECK_COLOR = '#6B4A2A'

/**
 * Deterministic, so sparks and flecks hold their places between frames
 * instead of boiling.
 */
function pseudoRandom(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453
  return value - Math.floor(value)
}

/**
 * An irregular outline. Three low-frequency terms give soft lobes; a clean
 * circle reads as a ring rather than as a tear in space.
 */
function traceLobedCircle(
  context: CanvasRenderingContext2D,
  radius: number,
  time: number,
): void {
  const STEPS = 96

  for (let step = 0; step <= STEPS; step += 1) {
    const angle = (step / STEPS) * Math.PI * 2
    const wobble =
      1 +
      0.06 * Math.sin(angle * 3 + time * 0.9) +
      0.04 * Math.sin(angle * 5 - time * 0.6) +
      0.03 * Math.sin(angle * 7 + time * 1.4)
    const distance = radius * wobble
    const x = Math.cos(angle) * distance
    const y = Math.sin(angle) * distance

    if (step === 0) context.moveTo(x, y)
    else context.lineTo(x, y)
  }

  context.closePath()
}

/**
 * The core turns faster than the bands. That differential rate is what reads
 * as depth; matching the rates flattens the whole thing.
 */
function drawCore(
  context: CanvasRenderingContext2D,
  radius: number,
  time: number,
): void {
  const ARMS = 3

  context.save()
  context.rotate(time * 2.2)
  context.lineCap = 'round'

  for (let arm = 0; arm < ARMS; arm += 1) {
    context.strokeStyle = arm % 2 === 0 ? CORE_LIGHT : CORE_PALE
    context.lineWidth = radius * 0.28
    context.beginPath()

    const offset = (arm / ARMS) * Math.PI * 2
    for (let step = 0; step <= 40; step += 1) {
      const progress = step / 40
      const angle = offset + progress * Math.PI * 1.6
      const distance = radius * (0.15 + progress * 0.85)
      const x = Math.cos(angle) * distance
      const y = Math.sin(angle) * distance

      if (step === 0) context.moveTo(x, y)
      else context.lineTo(x, y)
    }

    context.stroke()
  }

  context.restore()
}

/** Rim sparks, flaring and fading on their own clocks. */
function drawSparks(
  context: CanvasRenderingContext2D,
  radius: number,
  time: number,
): void {
  const SPARKS = 9
  context.fillStyle = '#FFFFFF'

  for (let index = 0; index < SPARKS; index += 1) {
    const seed = pseudoRandom(index)
    const flare = Math.max(0, Math.sin(time * (1.4 + seed) + index))
    if (flare <= 0.05) continue

    const angle = seed * Math.PI * 2 + time * 0.12
    const distance = radius * (0.86 + seed * 0.12)

    context.globalAlpha = flare
    context.beginPath()
    context.arc(
      Math.cos(angle) * distance,
      Math.sin(angle) * distance,
      1 + seed * 2.2,
      0,
      Math.PI * 2,
    )
    context.fill()
  }

  context.globalAlpha = 1
}

/** Core grit: the hand-painted quality survives only if the centre is dirty. */
function drawFlecks(
  context: CanvasRenderingContext2D,
  radius: number,
  time: number,
): void {
  context.fillStyle = FLECK_COLOR

  for (let index = 0; index < 24; index += 1) {
    const seed = pseudoRandom(index + 40)
    const angle = seed * Math.PI * 2 + time * 0.4
    const distance = radius * (0.2 + pseudoRandom(index + 80) * 0.9)

    context.beginPath()
    context.arc(
      Math.cos(angle) * distance,
      Math.sin(angle) * distance,
      0.6 + seed,
      0,
      Math.PI * 2,
    )
    context.fill()
  }
}

/**
 * Concentric bands of uneven width rather than a gradient. A smooth radial
 * gradient yields a neon doughnut, which spec section 8.5 rules out — and it
 * would also mean calling createRadialGradient and chaining off the result,
 * which the test's context stub cannot represent.
 */
export function drawPortal(
  context: CanvasRenderingContext2D,
  size: number,
  time: number,
): void {
  const half = size / 2
  const base = half * 0.86

  context.clearRect(0, 0, size, size)
  context.save()
  context.translate(half, half)

  for (let index = 0; index < BAND_COLORS.length; index += 1) {
    const scale = 1 - index * 0.11 - (index % 2 === 0 ? 0.02 : 0)
    context.fillStyle = BAND_COLORS[index]
    context.beginPath()
    traceLobedCircle(context, base * scale, time + index * 0.35)
    context.fill()
  }

  drawCore(context, base * 0.32, time)
  drawSparks(context, base, time)
  drawFlecks(context, base * 0.3, time)

  context.restore()
}
```

- [ ] **Step 4: Write the canvas component**

Create `src/shared/portal/PortalCanvas.tsx`:

```tsx
import { useEffect, useRef } from 'react'
import { drawPortal } from './drawPortal'

type PortalCanvasProps = {
  size?: number
}

export function PortalCanvas({ size = 320 }: PortalCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Held in a const so the null check narrows inside the nested render
    // function; a captured `let` would widen straight back to null.
    const context = canvas.getContext('2d')
    if (!context) return

    let frame = 0
    let origin = 0

    function render(timestamp: number) {
      // Spec section 12.2: no frames at all while the tab is hidden.
      if (document.hidden) {
        frame = 0
        return
      }
      if (origin === 0) origin = timestamp
      // The edge churns continuously, in every phase.
      drawPortal(context, size, (timestamp - origin) / 1000)
      frame = requestAnimationFrame(render)
    }

    function play() {
      frame = requestAnimationFrame(render)
    }

    function pause() {
      cancelAnimationFrame(frame)
      frame = 0
    }

    function onVisibilityChange() {
      // Spec section 12.2: the loop stops outright on a hidden tab rather
      // than trusting the browser's throttle.
      if (document.hidden) {
        pause()
        return
      }
      if (frame === 0) {
        origin = 0
        play()
      }
    }

    play()
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      pause()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [size])

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      aria-hidden="true"
      data-testid="portal-canvas"
      className="block"
    />
  )
}
```

The guard sits in two places on purpose. `onVisibilityChange` cancels the frame that is already queued, and `render` refuses to queue another one — so a callback that was scheduled a moment before the tab hid runs, sees `document.hidden`, and ends the loop rather than extending it. That second guard is what the fourth test observes.

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS — 174 tests.

- [ ] **Step 6: Commit**

```bash
git add src/shared/portal
git commit -m "feat: draw the portal vortex on a canvas"
```

---

## Task 13: The portal provider and its overlay

**Files:**
- Create: `src/shared/portal/PortalContext.ts`
- Create: `src/shared/portal/PortalOverlay.tsx`
- Create: `src/shared/portal/PortalProvider.tsx`
- Create: `src/shared/portal/PortalProvider.test.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: Write the failing tests**

Create `src/shared/portal/PortalProvider.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { useContext } from 'react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { PortalProvider } from './PortalProvider'
import { PortalContext } from './PortalContext'
import {
  COLLAPSING_MS,
  FIRING_MS,
  QUOTE_AFTER_MS,
  TRAVERSING_MIN_MS,
} from './portalTimings'

function Trigger() {
  const portal = useContext(PortalContext)

  return (
    <div>
      <button onClick={() => portal?.open()}>fire</button>
      <button onClick={() => portal?.open('short')}>jump</button>
    </div>
  )
}

/** A destination whose data never lands, which keeps useIsFetching above zero. */
function Pending() {
  useQuery({ queryKey: ['pending'], queryFn: () => new Promise<string>(() => {}) })
  return null
}

function renderProvider(pending: ReactNode = null) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={client}>
      <PortalProvider>
        <Trigger />
        {pending}
      </PortalProvider>
    </QueryClientProvider>,
  )
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

function fire(label = 'fire') {
  act(() => {
    screen.getByText(label).click()
  })
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('PortalProvider', () => {
  it('shows no overlay while idle', () => {
    renderProvider()
    expect(screen.queryByTestId('portal-overlay')).not.toBeInTheDocument()
  })

  it('opens the overlay and reports its phase', () => {
    renderProvider()

    fire()

    expect(screen.getByTestId('portal-overlay')).toHaveAttribute(
      'data-phase',
      'firing',
    )
  })

  it('marks a shortened jump so the keyframes can match it', () => {
    renderProvider()

    fire('jump')

    expect(screen.getByTestId('portal-overlay')).toHaveAttribute(
      'data-variant',
      'short',
    )
  })

  it('closes once nothing is fetching and the floor has passed', () => {
    renderProvider()

    fire()
    // Nothing is in flight in this test, which is the cache-hit case: the
    // floor alone carries the shot.
    advance(FIRING_MS + TRAVERSING_MIN_MS + COLLAPSING_MS)

    expect(screen.queryByTestId('portal-overlay')).not.toBeInTheDocument()
  })

  it('holds the portal open while a request is still in flight', () => {
    renderProvider(<Pending />)

    fire()
    advance(FIRING_MS + TRAVERSING_MIN_MS + COLLAPSING_MS + 100)

    // The query never settles, so nothing has arrived and the portal must
    // not close on the floor alone.
    expect(screen.getByTestId('portal-overlay')).toHaveAttribute(
      'data-phase',
      'traversing',
    )
  })

  it('raises a quote once that wait passes the threshold', () => {
    renderProvider(<Pending />)

    fire()
    advance(QUOTE_AFTER_MS + 1)

    expect(screen.getByTestId('portal-quote')).toBeInTheDocument()
  })
})
```

Six tests. The last two use a query that never resolves, which is the only way to hold `traversing` open long enough to observe either behaviour — with nothing fetching, the provider arrives at once and collapses at 1050 ms, well before the quote threshold.

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test
```

Expected: FAIL — cannot resolve `./PortalProvider`.

- [ ] **Step 3: Write the context**

Create `src/shared/portal/PortalContext.ts`:

```ts
import { createContext } from 'react'
import type { PortalVariant } from './usePortalMachine'

export type PortalContextValue = {
  open: (variant?: PortalVariant) => void
}

export const PortalContext = createContext<PortalContextValue | null>(null)
```

- [ ] **Step 4: Write the overlay**

Create `src/shared/portal/PortalOverlay.tsx`:

```tsx
import { PortalCanvas } from './PortalCanvas'
import type { PortalPhase, PortalVariant } from './usePortalMachine'

type PortalOverlayProps = {
  phase: PortalPhase
  variant: PortalVariant
  quote: string | null
}

export function PortalOverlay({ phase, variant, quote }: PortalOverlayProps) {
  if (phase === 'idle') return null

  return (
    <div
      data-testid="portal-overlay"
      data-phase={phase}
      data-variant={variant}
      aria-hidden="true"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg/90"
    >
      <div className="portal-vortex">
        <PortalCanvas size={320} />
      </div>

      {quote && (
        <p
          data-testid="portal-quote"
          className="portal-quote mt-8 max-w-md px-6 text-center font-mono text-xs text-muted"
        >
          {quote}
        </p>
      )}
    </div>
  )
}
```

The overlay is `aria-hidden` and carries no focusable content. It is decoration over a navigation that has already happened; a screen reader should be reading the destination page, not a vortex.

- [ ] **Step 5: Write the provider**

Create `src/shared/portal/PortalProvider.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useIsFetching } from '@tanstack/react-query'
import { PortalContext } from './PortalContext'
import { PortalOverlay } from './PortalOverlay'
import { usePortalMachine } from './usePortalMachine'
import { pickQuote } from '../lore/quotes'

export function PortalProvider({ children }: { children: ReactNode }) {
  const { phase, variant, showQuote, open, arrive } = usePortalMachine()
  const fetching = useIsFetching()
  const [quote, setQuote] = useState<string | null>(null)

  /**
   * The request is whatever the destination page starts. When nothing is in
   * flight any more, the traversal is over — including the cache-hit case,
   * where nothing was ever in flight and the 300 ms floor carries the shot
   * on its own.
   */
  useEffect(() => {
    if (phase !== 'traversing') return
    if (fetching > 0) return
    arrive()
  }, [phase, fetching, arrive])

  useEffect(() => {
    setQuote(showQuote ? pickQuote() : null)
  }, [showQuote])

  const value = useMemo(() => ({ open }), [open])

  return (
    <PortalContext.Provider value={value}>
      {children}
      <PortalOverlay phase={phase} variant={variant} quote={quote} />
    </PortalContext.Provider>
  )
}
```

- [ ] **Step 6: Add the keyframes**

Append to `src/index.css`:

```css
@keyframes portal-open {
  0% {
    transform: scale(0.05);
    opacity: 0;
  }
  70% {
    transform: scale(1.08);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes portal-close {
  from {
    transform: scale(1);
    opacity: 1;
  }
  to {
    transform: scale(0.05);
    opacity: 0;
  }
}

@keyframes portal-quote-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.portal-vortex {
  will-change: transform;
}

/* The durations mirror portalTimings.ts. The portal does not change shape as
   it opens — it scales up with a slight overshoot and nothing else. */
[data-phase='firing'] .portal-vortex {
  animation: portal-open 400ms cubic-bezier(0.2, 0.9, 0.3, 1.2) both;
}

[data-phase='firing'][data-variant='short'] .portal-vortex {
  animation-duration: 250ms;
}

[data-phase='collapsing'] .portal-vortex {
  animation: portal-close 350ms ease-in both;
}

.portal-quote {
  animation: portal-quote-in 250ms ease-out both;
}
```

- [ ] **Step 7: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS — 180 tests.

- [ ] **Step 8: Commit**

```bash
git add src/shared/portal src/index.css
git commit -m "feat: drive the portal overlay from the request in flight"
```

---

## Task 14: The portal sound

`PORTAL SFX` has been persisting since task 8 without doing anything. It controls interface sound only — never dossier narration, which plan 4 adds and which is user-initiated per press.

**Files:**
- Create: `src/shared/portal/portalSound.ts`
- Create: `src/shared/portal/portalSound.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/shared/portal/portalSound.test.ts`:

```ts
import { describe, it, expect, afterEach, vi } from 'vitest'
import { playPortalSound } from './portalSound'

function stubAudio() {
  const oscillator = {
    type: '',
    frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }
  const gain = {
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
  }
  const constructor = vi.fn(() => ({
    currentTime: 0,
    destination: {},
    createOscillator: () => oscillator,
    createGain: () => gain,
  }))

  vi.stubGlobal('AudioContext', constructor)
  return { constructor, oscillator }
}

afterEach(() => vi.unstubAllGlobals())

describe('playPortalSound', () => {
  it('stays silent when the setting is off', () => {
    const { constructor } = stubAudio()

    expect(playPortalSound(false)).toBe(false)
    expect(constructor).not.toHaveBeenCalled()
  })

  it('makes a noise when the setting is on', () => {
    const { constructor, oscillator } = stubAudio()

    expect(playPortalSound(true)).toBe(true)
    expect(constructor).toHaveBeenCalledOnce()
    expect(oscillator.start).toHaveBeenCalledOnce()
  })

  it('gives up quietly where there is no audio API', () => {
    vi.stubGlobal('AudioContext', undefined)
    vi.stubGlobal('webkitAudioContext', undefined)

    expect(playPortalSound(true)).toBe(false)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test
```

Expected: FAIL — cannot resolve `./portalSound`.

- [ ] **Step 3: Write the sound**

Create `src/shared/portal/portalSound.ts`:

```ts
type AudioContextConstructor = new () => AudioContext

function resolveAudioContext(): AudioContextConstructor | null {
  const scope = window as unknown as {
    AudioContext?: AudioContextConstructor
    webkitAudioContext?: AudioContextConstructor
  }
  return scope.AudioContext ?? scope.webkitAudioContext ?? null
}

/**
 * A short falling whoosh, synthesized rather than shipped: one more network
 * asset for two hundred milliseconds of sound is a poor trade. Returns
 * whether anything was actually played, which is what makes it testable.
 */
export function playPortalSound(enabled: boolean): boolean {
  if (!enabled) return false

  const Constructor = resolveAudioContext()
  if (!Constructor) return false

  try {
    const context = new Constructor()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const start = context.currentTime
    const end = start + 0.35

    oscillator.type = 'sawtooth'
    oscillator.frequency.setValueAtTime(680, start)
    oscillator.frequency.exponentialRampToValueAtTime(90, end)

    gain.gain.setValueAtTime(0.08, start)
    gain.gain.exponentialRampToValueAtTime(0.0001, end)

    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    oscillator.stop(end)

    return true
  } catch {
    // An autoplay policy or a missing output device is not worth an error.
    return false
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS — 183 tests.

- [ ] **Step 5: Commit**

```bash
git add src/shared/portal
git commit -m "feat: synthesize the portal sound behind its setting"
```

---

## Task 15: Navigating through the portal

**Files:**
- Create: `src/shared/portal/usePortalNavigation.ts`
- Create: `src/shared/portal/PortalLink.tsx`
- Create: `src/shared/portal/portalNavigation.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/shared/portal/portalNavigation.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PortalProvider } from './PortalProvider'
import { PortalLink } from './PortalLink'
import { SettingsProvider } from '../settings/SettingsProvider'
import { DEFAULT_SETTINGS, SETTINGS_KEY } from '../settings/settings'

function renderLink(options: { portal: boolean; transitions?: boolean }) {
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({
      ...DEFAULT_SETTINGS,
      portalTransitions: options.transitions ?? true,
    }),
  )

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  const tree = (
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route
          path="/"
          element={<PortalLink to="/characters">CHARACTERS</PortalLink>}
        />
        <Route path="/characters" element={<p>character list</p>} />
      </Routes>
    </MemoryRouter>
  )

  return render(
    <QueryClientProvider client={client}>
      <SettingsProvider>
        {options.portal ? <PortalProvider>{tree}</PortalProvider> : tree}
      </SettingsProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => localStorage.clear())
afterEach(() => vi.useRealTimers())

describe('PortalLink', () => {
  it('is a real link, so it can be opened in a new tab', () => {
    renderLink({ portal: true })

    expect(screen.getByRole('link', { name: 'CHARACTERS' })).toHaveAttribute(
      'href',
      '/characters',
    )
  })

  it('opens the portal before the destination appears', async () => {
    renderLink({ portal: true })

    await userEvent.click(screen.getByRole('link', { name: 'CHARACTERS' }))

    expect(screen.getByTestId('portal-overlay')).toBeInTheDocument()
    expect(screen.getByText('character list')).toBeInTheDocument()
  })

  it('navigates without a portal when transitions are off', async () => {
    renderLink({ portal: true, transitions: false })

    await userEvent.click(screen.getByRole('link', { name: 'CHARACTERS' }))

    expect(screen.queryByTestId('portal-overlay')).not.toBeInTheDocument()
    expect(screen.getByText('character list')).toBeInTheDocument()
  })

  it('navigates with no portal provider at all', async () => {
    renderLink({ portal: false })

    await userEvent.click(screen.getByRole('link', { name: 'CHARACTERS' }))

    expect(screen.getByText('character list')).toBeInTheDocument()
  })

  it('leaves a modified click to the browser', async () => {
    renderLink({ portal: true })

    await userEvent.keyboard('{Meta>}')
    await userEvent.click(screen.getByRole('link', { name: 'CHARACTERS' }))
    await userEvent.keyboard('{/Meta}')

    // A command-click opens a tab; the portal has nothing to say about that.
    expect(screen.queryByTestId('portal-overlay')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test
```

Expected: FAIL — cannot resolve `./PortalLink`.

- [ ] **Step 3: Write the navigation hook**

Create `src/shared/portal/usePortalNavigation.ts`:

```ts
import { useCallback, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { PortalContext } from './PortalContext'
import { playPortalSound } from './portalSound'
import { usePortalEnabled } from '../settings/useReducedMotion'
import { useSettings } from '../settings/useSettings'
import type { PortalVariant } from './usePortalMachine'

/**
 * Navigation happens immediately in every case; the portal is an overlay on
 * top of it, not a gate in front of it. That is also why browser back never
 * plays one — it never comes through here.
 */
export function usePortalNavigation() {
  const navigate = useNavigate()
  const portal = useContext(PortalContext)
  const enabled = usePortalEnabled()
  const { settings } = useSettings()

  return useCallback(
    (to: string, variant: PortalVariant = 'full') => {
      if (portal && enabled) {
        portal.open(variant)
        playPortalSound(settings.portalSfx)
      }
      navigate(to)
    },
    [navigate, portal, enabled, settings.portalSfx],
  )
}
```

- [ ] **Step 4: Write the link**

Create `src/shared/portal/PortalLink.tsx`:

```tsx
import { Link } from 'react-router-dom'
import type { ComponentProps, MouseEvent } from 'react'
import { usePortalNavigation } from './usePortalNavigation'
import type { PortalVariant } from './usePortalMachine'

type PortalLinkProps = Omit<ComponentProps<typeof Link>, 'to'> & {
  to: string
  variant?: PortalVariant
}

export function PortalLink({
  to,
  variant = 'full',
  onClick,
  children,
  ...rest
}: PortalLinkProps) {
  const navigateThroughPortal = usePortalNavigation()

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event)

    // Modified clicks open tabs and windows. Leave them to the browser.
    if (event.defaultPrevented || event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

    event.preventDefault()
    navigateThroughPortal(to, variant)
  }

  return (
    <Link to={to} onClick={handleClick} {...rest}>
      {children}
    </Link>
  )
}
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS — 188 tests.

- [ ] **Step 6: Commit**

```bash
git add src/shared/portal
git commit -m "feat: route navigation through the portal when it is enabled"
```

---

## Task 16: The statistics contract on the frontend

**Files:**
- Modify: `src/shared/api/types.ts`
- Modify: `src/shared/api/client.ts`
- Modify: `src/shared/api/client.test.ts`
- Modify: `src/test/msw.ts`
- Create: `src/features/stats/useStats.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/shared/api/client.test.ts`:

```ts
describe('fetchStats', () => {
  it('requests the statistics endpoint with no query string', async () => {
    const spy = vi.fn(async () =>
      jsonResponse({
        characters: { total: 826, pages: 42 },
        locations: { total: 126, pages: 7 },
        episodes: { total: 51, pages: 3 },
        ricks: 112,
        mortys: 53,
      }),
    )
    vi.stubGlobal('fetch', spy)

    const stats = await fetchStats()

    expect(spy).toHaveBeenCalledWith(`${BASE}/stats`)
    expect(stats.ricks).toBe(112)
  })

  it('raises ApiError when the archive will not answer', async () => {
    vi.stubGlobal('fetch', async () =>
      jsonResponse(
        { error: { code: 'UPSTREAM_UNAVAILABLE', message: 'no' } },
        503,
      ),
    )

    await expect(fetchStats()).rejects.toBeInstanceOf(ApiError)
  })
})
```

Extend the import at the top of that file to include `fetchStats`:

```ts
import {
  ApiError,
  fetchCharacter,
  fetchCharacters,
  fetchEpisode,
  fetchEpisodes,
  fetchLocation,
  fetchLocations,
  fetchStats,
} from './client'
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test
```

Expected: FAIL — `fetchStats is not exported`.

- [ ] **Step 3: Mirror the contract**

Append to `src/shared/api/types.ts`:

```ts
export type EntityCount = {
  total: number
  pages: number
}

export type Stats = {
  characters: EntityCount
  locations: EntityCount
  episodes: EntityCount
  ricks: number
  mortys: number
}
```

- [ ] **Step 4: Add the fetch**

In `src/shared/api/client.ts`, extend the type import with `Stats`:

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
  Stats,
} from './types'
```

and append to the same file:

```ts
export function fetchStats(): Promise<Stats> {
  return get<Stats>('/stats')
}
```

- [ ] **Step 5: Add the mock handler**

In `src/test/msw.ts`, add to the `handlers` array, after the episodes detail handler:

```ts
  http.get(`${BASE}/stats`, () =>
    HttpResponse.json({
      characters: { total: 826, pages: 42 },
      locations: { total: 126, pages: 7 },
      episodes: { total: 51, pages: 3 },
      ricks: 112,
      mortys: 53,
    }),
  ),
```

- [ ] **Step 6: Add the query hook**

Create `src/features/stats/useStats.ts`:

```ts
import { useQuery } from '@tanstack/react-query'
import { fetchStats } from '../../shared/api/client'

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: fetchStats,
    // The backend caches this for a day; asking again within the hour is
    // pure noise.
    staleTime: 60 * 60 * 1000,
  })
}
```

- [ ] **Step 7: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS — 190 tests.

- [ ] **Step 8: Commit**

```bash
git add src/shared/api src/test/msw.ts src/features/stats
git commit -m "feat: fetch archive statistics from the frontend"
```

---

## Task 17: The hub

**Files:**
- Create: `src/shared/portal/PortalGun.tsx`
- Create: `src/pages/HubPage.tsx`
- Create: `src/pages/HubPage.test.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: Write the failing tests**

Create `src/pages/HubPage.test.tsx`:

```tsx
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '../test/msw'
import { SettingsProvider } from '../shared/settings/SettingsProvider'
import { HubPage } from './HubPage'

beforeAll(() => {
  vi.stubEnv('VITE_API_BASE', 'https://api.test/api')
  server.listen({ onUnhandledRequest: 'error' })
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function renderHub() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={client}>
      <SettingsProvider>
        <MemoryRouter>
          <HubPage />
        </MemoryRouter>
      </SettingsProvider>
    </QueryClientProvider>,
  )
}

describe('HubPage', () => {
  it('names the archive', async () => {
    renderHub()
    expect(
      await screen.findByRole('heading', { name: 'DOSSIER C-137' }),
    ).toBeInTheDocument()
  })

  it('offers all three destinations with their live counts', async () => {
    renderHub()

    expect(await screen.findByText('826')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /CHARACTERS/ })).toHaveAttribute(
      'href',
      '/characters',
    )
    expect(screen.getByRole('link', { name: /LOCATIONS/ })).toHaveAttribute(
      'href',
      '/locations',
    )
    expect(screen.getByRole('link', { name: /EPISODES/ })).toHaveAttribute(
      'href',
      '/episodes',
    )
  })

  it('counts the Ricks and the Mortys on file', async () => {
    renderHub()

    expect(await screen.findByText('RICKS ON FILE')).toBeInTheDocument()
    expect(screen.getByText('112')).toBeInTheDocument()
    expect(screen.getByText('MORTYS ON FILE')).toBeInTheDocument()
    expect(screen.getByText('53')).toBeInTheDocument()
  })

  it('adds up everything indexed', async () => {
    renderHub()

    // 826 characters plus 126 locations plus 51 episodes.
    expect(await screen.findByText('1003')).toBeInTheDocument()
  })

  it('shows skeletons before the figures land', () => {
    renderHub()
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0)
  })

  it('offers the error state when the archive will not answer', async () => {
    server.use(
      http.get('https://api.test/api/stats', () =>
        HttpResponse.json(
          { error: { code: 'UPSTREAM_UNAVAILABLE', message: 'no' } },
          { status: 503 },
        ),
      ),
    )

    renderHub()

    expect(await screen.findByText('REGISTRY UNREACHABLE')).toBeInTheDocument()
  })

  it('opens the settings panel from the gun', async () => {
    renderHub()

    await userEvent.click(
      screen.getByRole('button', { name: 'PORTAL GUN SETTINGS' }),
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
```

Seven tests.

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test
```

Expected: FAIL — cannot resolve `./HubPage`.

- [ ] **Step 3: Write the gun**

Create `src/shared/portal/PortalGun.tsx`:

```tsx
import { PortalCanvas } from './PortalCanvas'

type PortalGunProps = {
  onOpenSettings: () => void
}

/**
 * The hub's central object. It draws the same vortex the transition overlay
 * uses, at rest — the archive's one permitted piece of visual drama.
 */
export function PortalGun({ onOpenSettings }: PortalGunProps) {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="portal-idle">
        <PortalCanvas size={280} />
      </div>

      <button
        type="button"
        onClick={onOpenSettings}
        className="border border-line px-4 py-2 font-mono text-xs tracking-widest text-fg transition-colors hover:border-accent hover:text-accent"
      >
        PORTAL GUN SETTINGS
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Write the page**

Create `src/pages/HubPage.tsx`:

```tsx
import { useState } from 'react'
import { useStats } from '../features/stats/useStats'
import { PortalGun } from '../shared/portal/PortalGun'
import { PortalLink } from '../shared/portal/PortalLink'
import { SettingsPanel } from '../shared/settings/SettingsPanel'
import { Skeleton } from '../shared/ui/Skeleton'
import { ErrorState } from '../shared/ui/ErrorState'
import type { Stats } from '../shared/api/types'

const DESTINATIONS = [
  { to: '/characters', label: 'CHARACTERS', key: 'characters' },
  { to: '/locations', label: 'LOCATIONS', key: 'locations' },
  { to: '/episodes', label: 'EPISODES', key: 'episodes' },
] as const

type FigureProps = {
  label: string
  value: number | undefined
}

function Figure({ label, value }: FigureProps) {
  return (
    <div className="text-center">
      <dt className="font-mono text-xs tracking-widest text-muted">{label}</dt>
      <dd className="text-fg mt-2 text-2xl font-bold">
        {value === undefined ? (
          <Skeleton className="mx-auto h-7 w-16" />
        ) : (
          value
        )}
      </dd>
    </div>
  )
}

function indexedTotal(stats: Stats | undefined): number | undefined {
  if (!stats) return undefined
  return stats.characters.total + stats.locations.total + stats.episodes.total
}

export function HubPage() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { data, isError, refetch } = useStats()

  return (
    <main className="mx-auto max-w-[1280px] space-y-12 px-6 py-16">
      <header className="space-y-3 text-center">
        <p className="font-mono text-xs text-muted">
          DOSSIER C-137 // CLEARANCE: UNRESTRICTED
        </p>
        <h1 className="text-fg text-4xl font-bold tracking-tight">
          DOSSIER C-137
        </h1>
        <p className="text-muted">
          The Citadel&apos;s archive. Everything on file, nothing you&apos;re
          cleared to question.
        </p>
      </header>

      <PortalGun onOpenSettings={() => setSettingsOpen(true)} />

      {settingsOpen && (
        <div className="flex justify-center">
          <SettingsPanel onClose={() => setSettingsOpen(false)} />
        </div>
      )}

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {DESTINATIONS.map((destination) => (
              <li key={destination.to}>
                <PortalLink
                  to={destination.to}
                  className="block border border-line bg-surface p-6 text-center transition-colors hover:border-accent"
                >
                  <span className="block font-mono text-xs tracking-widest text-muted">
                    {destination.label}
                  </span>
                  <span className="text-fg mt-3 block text-3xl font-bold">
                    {data ? (
                      data[destination.key].total
                    ) : (
                      <Skeleton className="mx-auto h-8 w-20" />
                    )}
                  </span>
                </PortalLink>
              </li>
            ))}
          </ul>

          <dl className="grid grid-cols-2 gap-6 border border-line bg-surface p-6 sm:grid-cols-5">
            <Figure label="ENTITIES INDEXED" value={indexedTotal(data)} />
            <Figure label="LOCATIONS ON FILE" value={data?.locations.total} />
            <Figure label="EPISODES LOGGED" value={data?.episodes.total} />
            <Figure label="RICKS ON FILE" value={data?.ricks} />
            <Figure label="MORTYS ON FILE" value={data?.mortys} />
          </dl>
        </>
      )}
    </main>
  )
}
```

The destination counts and the figures both key off `data` rather than `isPending`, so a background refetch never blanks a number that is already on screen.

- [ ] **Step 5: Let the resting vortex breathe**

Append to `src/index.css`:

```css
@keyframes portal-idle {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
}

.portal-idle {
  animation: portal-idle 6s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .portal-idle,
  .portal-vortex,
  .dimension-wave {
    animation: none;
  }
}
```

The media query is a second line of defence. The settings layer already refuses to open a portal under reduced motion, but the resting gun on the hub is not routed through it, and a page that animates in defiance of the system preference is an accessibility failure regardless of which component drew it.

- [ ] **Step 6: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS — 197 tests.

- [ ] **Step 7: Commit**

```bash
git add src/pages/HubPage.tsx src/pages/HubPage.test.tsx src/shared/portal/PortalGun.tsx src/index.css
git commit -m "feat: build the hub around the gun and the live archive counts"
```

---

## Task 18: The background refresh bar

**Files:**
- Create: `src/shared/ui/RefreshBar.tsx`
- Create: `src/shared/ui/RefreshBar.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/shared/ui/RefreshBar.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { RefreshBar } from './RefreshBar'

function Consumer({ resolve }: { resolve: Promise<string> }) {
  useQuery({ queryKey: ['thing'], queryFn: () => resolve })
  return <p>content</p>
}

function renderWith(children: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={client}>
      <RefreshBar />
      {children}
    </QueryClientProvider>,
  )
}

describe('RefreshBar', () => {
  it('stays out of the way when nothing is happening', () => {
    renderWith(null)
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('stays out of the way on a first load', () => {
    // The first load is represented by skeletons. A bar on top of them is
    // two loading indicators for one wait.
    renderWith(<Consumer resolve={new Promise(() => {})} />)
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('appears once there is content to refresh behind it', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    client.setQueryData(['thing'], 'already here')

    render(
      <QueryClientProvider client={client}>
        <RefreshBar />
        <Consumer resolve={new Promise(() => {})} />
      </QueryClientProvider>,
    )

    await waitFor(() =>
      expect(screen.getByRole('progressbar')).toBeInTheDocument(),
    )
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test
```

Expected: FAIL — cannot resolve `./RefreshBar`.

- [ ] **Step 3: Write the bar**

Create `src/shared/ui/RefreshBar.tsx`:

```tsx
import { useIsFetching, useQueryClient } from '@tanstack/react-query'

/**
 * Spec section 11.4: a background refresh must not replace content that is
 * already on screen. `useIsFetching` alone cannot tell a refresh from a first
 * load, so the cache is asked whether anything has data yet.
 */
export function RefreshBar() {
  const fetching = useIsFetching()
  const client = useQueryClient()

  if (fetching === 0) return null

  const hasContent = client
    .getQueryCache()
    .getAll()
    .some((query) => query.state.data !== undefined)

  if (!hasContent) return null

  return (
    <div
      role="progressbar"
      aria-label="Refreshing"
      aria-busy="true"
      className="fixed inset-x-0 top-0 z-50 h-0.5 animate-pulse bg-accent"
    />
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS — 200 tests.

- [ ] **Step 5: Commit**

```bash
git add src/shared/ui/RefreshBar.tsx src/shared/ui/RefreshBar.test.tsx
git commit -m "feat: mark a background refresh without replacing content"
```

---

## Task 19: The real header

The placeholder from plan 2 goes; the header that carries the mini gun and the settings panel replaces it.

**Files:**
- Modify: `src/app/AppLayout.tsx`
- Modify: `src/app/AppLayout.test.tsx`

- [ ] **Step 1: Rewrite the test**

Replace the contents of `src/app/AppLayout.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SettingsProvider } from '../shared/settings/SettingsProvider'
import { AppLayout } from './AppLayout'

function renderAt(path: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={client}>
      <SettingsProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/characters" element={<p>characters outlet</p>} />
              <Route path="/locations" element={<p>locations outlet</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </SettingsProvider>
    </QueryClientProvider>,
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

  it('sends the wordmark back to the hub', () => {
    renderAt('/characters')

    expect(screen.getByRole('link', { name: 'DOSSIER C-137' })).toHaveAttribute(
      'href',
      '/',
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

  it('opens the settings panel from the mini gun', async () => {
    renderAt('/characters')

    await userEvent.click(screen.getByRole('button', { name: 'Portal gun' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('closes the panel on Escape and gives focus back to the gun', async () => {
    renderAt('/characters')
    const gun = screen.getByRole('button', { name: 'Portal gun' })

    await userEvent.click(gun)
    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    // Focus that vanishes into the body strands a keyboard user where the
    // panel used to be.
    expect(gun).toHaveFocus()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test
```

Expected: FAIL — there is no wordmark link and no settings button.

- [ ] **Step 3: Write the layout**

Replace the contents of `src/app/AppLayout.tsx`:

```tsx
import { useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { PortalProvider } from '../shared/portal/PortalProvider'
import { PortalLink } from '../shared/portal/PortalLink'
import { SettingsPanel } from '../shared/settings/SettingsPanel'
import { DimensionWave } from '../shared/settings/DimensionWave'
import { RefreshBar } from '../shared/ui/RefreshBar'

const SECTIONS = [
  { to: '/characters', label: 'CHARACTERS' },
  { to: '/locations', label: 'LOCATIONS' },
  { to: '/episodes', label: 'EPISODES' },
]

export function AppLayout() {
  const { pathname } = useLocation()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const gunRef = useRef<HTMLButtonElement | null>(null)

  function closeSettings() {
    setSettingsOpen(false)
    gunRef.current?.focus()
  }

  return (
    <PortalProvider>
      <div className="min-h-screen">
        <RefreshBar />

        <header className="border-b border-line bg-surface">
          <nav
            aria-label="Sections"
            className="mx-auto flex max-w-[1280px] items-center gap-6 px-6 py-4"
          >
            <PortalLink
              to="/"
              className="font-mono text-xs tracking-widest text-accent"
            >
              DOSSIER C-137
            </PortalLink>

            <ul className="flex items-center gap-4">
              {SECTIONS.map((section) => {
                const active = pathname.startsWith(section.to)

                return (
                  <li key={section.to}>
                    <PortalLink
                      to={section.to}
                      aria-current={active ? 'page' : undefined}
                      className={`font-mono text-xs transition-colors hover:text-accent ${
                        active ? 'text-accent' : 'text-muted'
                      }`}
                    >
                      {section.label}
                    </PortalLink>
                  </li>
                )
              })}
            </ul>

            <button
              ref={gunRef}
              type="button"
              aria-label="Portal gun"
              aria-expanded={settingsOpen}
              onClick={() => setSettingsOpen((open) => !open)}
              className="ml-auto border border-line px-3 py-1 font-mono text-xs text-muted transition-colors hover:border-accent hover:text-accent"
            >
              &#9678; GUN
            </button>
          </nav>

          {settingsOpen && (
            <div className="mx-auto flex max-w-[1280px] justify-end px-6 pb-4">
              <SettingsPanel onClose={closeSettings} />
            </div>
          )}
        </header>

        <Outlet />
        <DimensionWave />
      </div>
    </PortalProvider>
  )
}
```

`NavLink` is gone. It set `aria-current` for us in plan 2, but it cannot intercept a click for the portal; computing `active` from `useLocation` costs one line and keeps a single link component across the whole app.

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS — 203 tests. The old layout test file held three tests and the new one holds six, so the suite grows by three rather than by six.

- [ ] **Step 5: Commit**

```bash
git add src/app/AppLayout.tsx src/app/AppLayout.test.tsx
git commit -m "feat: give the header the mini gun and the settings panel"
```

---

## Task 20: Send every internal link through the portal

Spec §8.3 gives list-to-detail and relation-following a shortened portal. Six components still use a bare `Link`.

**Files:**
- Modify: `src/features/characters/CharacterCard.tsx`
- Modify: `src/features/characters/RosterGrid.tsx`
- Modify: `src/features/characters/CharacterDossier.tsx`
- Modify: `src/features/locations/LocationCard.tsx`
- Modify: `src/features/episodes/EpisodeCard.tsx`

- [ ] **Step 1: Confirm the suite is green before touching anything**

```bash
npm test
```

Expected: PASS — 203 tests. These five components are covered by existing tests that assert `href`; those tests are the safety net for this swap and the count must be identical afterwards.

- [ ] **Step 2: Swap the import and the element in each file**

In each of the five files, replace the react-router import:

```tsx
import { Link } from 'react-router-dom'
```

with the portal link, adjusting the relative depth — `../../shared/portal/PortalLink` from a feature folder:

```tsx
import { PortalLink } from '../../shared/portal/PortalLink'
```

Then replace every `<Link` with `<PortalLink` and every `</Link>` with `</PortalLink>` in that file, and add `variant="short"`:

- `CharacterCard.tsx` — the card's outer link, list to detail
- `LocationCard.tsx` — the same
- `EpisodeCard.tsx` — the same
- `RosterGrid.tsx` — each roster entry, a relation jump
- `CharacterDossier.tsx` — two of them: the `Relation` component's location link and each episode row

For example, in `CharacterCard.tsx`:

```tsx
    <PortalLink
      to={`/characters/${character.id}`}
      variant="short"
      className="block border border-line bg-surface p-4 transition-colors hover:border-accent"
    >
```

`CharacterDossier.tsx` imports `Link` for both uses, so one import swap covers the file.

- [ ] **Step 3: Confirm nothing else still imports Link**

```bash
grep -rn "react-router-dom" src/features src/pages | grep -i "link"
```

Expected: no matches under `src/features`. `src/shared/ui/DimensionNotFound.tsx` keeps its plain `Link` — it is an error page returning to safety, and a portal on the way out of a dead end is theatre.

- [ ] **Step 4: Run the tests**

```bash
npm test
```

Expected: PASS — 203 tests, exactly as in step 1. If a card test now fails on a missing provider, the fallback in `useSettings` or `usePortalNavigation` is not doing its job; fix the fallback rather than the test.

- [ ] **Step 5: Commit**

```bash
git add src/features
git commit -m "refactor: send list and relation links through the portal"
```

---

## Task 21: Route the hub and split the bundle

**Files:**
- Modify: `src/app/routes.tsx`

- [ ] **Step 1: Rewrite the routes**

Replace the contents of `src/app/routes.tsx`:

```tsx
import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from './AppLayout'
import { DetailSkeleton } from '../shared/ui/DetailSkeleton'

// Spec section 12.2: routes are code-split. The hub carries a canvas and the
// detail pages carry their own dossier bodies; there is no reason for a
// visitor who only reads the character list to download any of it.
const HubPage = lazy(() =>
  import('../pages/HubPage').then((module) => ({ default: module.HubPage })),
)
const CharactersPage = lazy(() =>
  import('../pages/CharactersPage').then((module) => ({
    default: module.CharactersPage,
  })),
)
const CharacterDetailPage = lazy(() =>
  import('../pages/CharacterDetailPage').then((module) => ({
    default: module.CharacterDetailPage,
  })),
)
const LocationsPage = lazy(() =>
  import('../pages/LocationsPage').then((module) => ({
    default: module.LocationsPage,
  })),
)
const LocationDetailPage = lazy(() =>
  import('../pages/LocationDetailPage').then((module) => ({
    default: module.LocationDetailPage,
  })),
)
const EpisodesPage = lazy(() =>
  import('../pages/EpisodesPage').then((module) => ({
    default: module.EpisodesPage,
  })),
)
const EpisodeDetailPage = lazy(() =>
  import('../pages/EpisodeDetailPage').then((module) => ({
    default: module.EpisodeDetailPage,
  })),
)
const NotFoundPage = lazy(() =>
  import('../pages/NotFoundPage').then((module) => ({
    default: module.NotFoundPage,
  })),
)

// A chunk that is still downloading is a load like any other, so it gets the
// same skeleton geometry rather than a spinner.
function lazyRoute(element: React.ReactNode) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-[1280px] px-6 py-10">
          <DetailSkeleton />
        </main>
      }
    >
      {element}
    </Suspense>
  )
}

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: lazyRoute(<HubPage />) },
      { path: '/characters', element: lazyRoute(<CharactersPage />) },
      { path: '/characters/:id', element: lazyRoute(<CharacterDetailPage />) },
      { path: '/locations', element: lazyRoute(<LocationsPage />) },
      { path: '/locations/:id', element: lazyRoute(<LocationDetailPage />) },
      { path: '/episodes', element: lazyRoute(<EpisodesPage />) },
      { path: '/episodes/:id', element: lazyRoute(<EpisodeDetailPage />) },
      { path: '*', element: lazyRoute(<NotFoundPage />) },
    ],
  },
])
```

The `Navigate` redirect from `/` to `/characters` is gone: the hub is the root now.

- [ ] **Step 2: Run the tests and the build**

```bash
npm test && npm run lint && npm run build
```

Expected: 203 tests pass, lint exits 0, and the build emits several JavaScript chunks rather than the single `index-*.js` of plan 2. Confirm:

```bash
ls dist/assets/
```

Expected: one entry chunk plus a separate chunk per page.

- [ ] **Step 3: Run the app and click through it**

```bash
npm run dev
```

Confirm by hand:

- `/` shows the hub with a turning vortex and five real figures
- clicking a destination plays a portal and lands on the list
- the header gun opens the settings panel; switching to Citadel repaints light with a wave
- reloading on Citadel produces no dark flash
- turning `PORTAL TRANSITIONS` off makes navigation immediate
- a card click plays the shortened portal

- [ ] **Step 4: Commit**

```bash
git add src/app/routes.tsx
git commit -m "feat: put the hub at the root and split every route"
```

---

## Task 22: Deploy and verify the portal slice

- [ ] **Step 1: Run every suite**

```bash
npm test && npm run test:api && npm run lint && npm run build
```

Expected: 203 frontend tests, 85 backend tests, lint and build clean.

- [ ] **Step 2: Confirm the boundary still holds in the shipped bundle**

```bash
grep -r "rickandmortyapi" dist/ || echo "CLEAN: no direct external API reference in the bundle"
```

Expected: `CLEAN`. The bundle is split now, so this checks every chunk, not just one.

- [ ] **Step 3: Push, which deploys the frontend**

```bash
git push
```

The Edge Function was deployed in task 3 and has not changed since. If any file under `supabase/` was touched after that, redeploy:

```bash
npx supabase functions deploy api --no-verify-jwt
```

- [ ] **Step 4: Verify against the live deployment**

Open the production URL and confirm each item:

- `/` shows the hub: a turning vortex, three destinations with live counts, and five statistics figures
- Every figure is plausible — around 826 characters, 126 locations, 51 episodes, and non-zero Rick and Morty counts
- Clicking a destination plays the portal and lands on the list, with no flash of an empty page
- The portal on a cached destination still lasts about a second rather than a single frame
- A card click plays the shortened portal
- Following a character's origin link plays the shortened portal and lands on the location
- Browser back plays no portal at all
- The header gun opens the settings panel; `Esc` closes it and focus returns to the gun
- Switching to Citadel repaints the whole site light, with a wave, and every text pair stays legible
- Switching to Cronenberg-1 repaints crimson; check the muted text on raised surfaces, which is the highest-risk pair
- Reloading on Citadel shows no dark flash
- Turning `PORTAL TRANSITIONS` off makes every navigation immediate, with skeletons instead
- Turning `REDUCED MOTION` on does the same, and stops the resting vortex on the hub
- Turning `PORTAL SFX` on produces a short sound on the next jump
- Paginating and filtering still show skeletons, not a portal
- The refresh bar appears on a refetch and never replaces content

- [ ] **Step 5: Verify with the system preference set to reduce**

In the browser devtools, set `prefers-reduced-motion: reduce` — in Chrome, the Rendering panel — leave `REDUCED MOTION` on `AUTO`, and reload.

Expected: no portal on any navigation, no resting animation on the hub, no recolor wave. This is spec §8.4 and §12.1, and it is the one thing on this list a reviewer is likely to check personally.

- [ ] **Step 6: Tag the milestone**

```bash
git tag plan-3-portal
git push origin plan-3-portal
```

- [ ] **Step 7: Update the handoff note**

In `START-HERE.md`, describe plan 3 as complete, point the next session at plan 4, and record any deviation discovered during execution. Note in particular that `AppLayout` is no longer a placeholder, and that the three `react-refresh` warnings from plan 2 are unchanged.

```bash
git add START-HERE.md
git commit -m "docs: bring the handoff note up to date through plan 3"
git push
```

---

## Verification against the spec

| Spec requirement | Task |
|---|---|
| §6.2 `GET /api/stats`, every value derived from API responses | 1, 2 |
| §6.3 24 h TTL, one cache key for the aggregate | 1 |
| §7.1 the `/` route | 21 |
| §7.2 URL → Query → client → function, unchanged for the new endpoint | 16 |
| §7.3 `pages/` compose, features query, `shared/` stays generic | 16, 17 |
| §8.1 the traversal lasts as long as the request | 10, 13 |
| §8.2 the four phases, the 300 ms floor, the 8 s ceiling | 10 |
| §8.2 a quote after 1.5 s, never on a fast response | 10, 11, 13 |
| §8.3 full portal between sections, shortened for detail and relations | 15, 17, 19, 20 |
| §8.3 skeletons rather than a portal for pagination and filters | 20 (nothing routed through the portal) |
| §8.3 no portal on browser back | 15 (back never passes through `usePortalNavigation`) |
| §8.4 opt-out under the toggle, the override, and the system preference | 6, 15, 17 |
| §8.5 bands, lobed outline, faster core, rim sparks, core grit | 12 |
| §8.5 the frame loop halts on a hidden tab | 12 |
| §9.1 three dimensions, one of them light | 4, 8 |
| §9.2 `data-dimension`, one `localStorage` object, applied before first paint | 5, 7 |
| §9.3 a recolor wave that respects reduced motion | 9 |
| §11.4 a thin bar for a background refresh, no spinners | 18 |
| §11.5 the four-row panel, opened from the header mini gun and from the hub | 8, 17, 19 |
| §11.5 `PORTAL SFX` covers interface sound only | 14 |
| §12.1 decorative animation disables under `prefers-reduced-motion` | 6, 17, 22 |
| §12.1 `Esc` closes the panel and returns focus to its trigger | 8, 19 |
| §12.2 routes code-split via `React.lazy` | 21 |
| §12.3 unit coverage of the portal state machine and `SettingsProvider` | 5, 10 |
| §12.4 the boundary rule holds across every emitted chunk | 22 |
| §13.1 deploy as soon as a slice works | 3, 22 |

Deferred to later plans by design: §6.2 search, ask, dossier, speak; §6.4 AI storage; §6.5 spend controls; §7.4 the search overlay and the hub's coordinate input; §10 AI features; §15 the README. The Konami easter egg (`shared/hooks/useKonami.ts`) and the microcopy move to `shared/lore/copy.ts` stay with plan 5.

## Test count after each task

| Task | Frontend | Backend |
|---|---|---|
| — (baseline) | 124 | 79 |
| 1 | 124 | 84 |
| 2 | 124 | 85 |
| 3 | 124 | 85 |
| 4 | 131 | 85 |
| 5 | 137 | 85 |
| 6 | 144 | 85 |
| 7 | 146 | 85 |
| 8 | 153 | 85 |
| 9 | 156 | 85 |
| 10 | 167 | 85 |
| 11 | 170 | 85 |
| 12 | 174 | 85 |
| 13 | 180 | 85 |
| 14 | 183 | 85 |
| 15 | 188 | 85 |
| 16 | 190 | 85 |
| 17 | 197 | 85 |
| 18 | 200 | 85 |
| 19 | 203 | 85 |
| 20 | 203 | 85 |
| 21 | 203 | 85 |
| 22 | 203 | 85 |

Task 19 rewrites a test file rather than adding one: plan 2's three layout tests become six, so the suite grows by three. Tasks 20 and 21 add no tests by design — one is a refactor with the existing suite as its safety net, the other is a routing change verified by the build output and by hand.
