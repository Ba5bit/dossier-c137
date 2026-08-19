# Citadel Archive — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a working vertical slice of Citadel Archive — a Supabase Edge Function backend that proxies and caches the Rick and Morty API, plus a React frontend rendering the character list with URL-driven filters, pagination, and skeletons.

**Architecture:** A React SPA (Vite) calls exactly one backend: a Supabase Edge Function written in Deno. That function is the sole egress point to `rickandmortyapi.com`, enforced by a lint rule. Inside the function, layers flow one way — `router → handler → service → client/cache` — with each layer tested by stubbing the layer beneath it. Responses are cached in Supabase Postgres with a 24-hour TTL.

**Tech Stack:** React 19, Vite, TypeScript, React Router v7, TanStack Query, Tailwind v4, Vitest, React Testing Library, MSW, Supabase Edge Functions (Deno), Supabase Postgres.

**Source spec:** `docs/superpowers/specs/2026-08-19-citadel-archive-design.md`

---

## Plan decomposition

This is plan 1 of 5. Each plan leaves working, deployed software.

| Plan | Delivers | Spec sections |
|---|---|---|
| **1 — Foundation** (this document) | Scaffold, deployment of both halves, backend router + cache + characters endpoints, character list with filters, pagination, skeletons, the boundary lint rule | §5, §6.1, §6.2 (characters), §6.3, §6.6, §7.1–7.5, §12.4, §13 |
| 2 — Entities | Locations and episodes endpoints and pages; all three detail pages with expanded relations | §6.2 (remaining), §7.1 |
| 3 — Identity | Settings panel, three dimensions, portal transition system, boot sequence | §8, §9, §11.5 |
| 4 — Intelligence | Global search, `/search` page, AI dossiers, grounded `/api/ask`, spend controls | §6.2 (search/ask/dossier), §6.5, §10.1, §10.2 |
| 5 — Finish | Speech, the detail and microcopy layer, responsive adaptation, README | §10.3, §11.3, §15 |

### Why the code comes before the screen designs

Claude Design publishes a design system by reading **code** — `/design-sync` ingests tokens and React components from the repository, not an exported mockup. Nothing can be synced until the token layer and the shared components exist.

The order is therefore inverted from the original intent. Tasks 1–4 and 16–21 produce the token set and nine components; running `/design-sync` at that point publishes the system, and the remaining screens are then designed against components that genuinely exist rather than against a picture that has yet to be translated into code.

The approved mockup is not discarded. It validated the system by eye and surfaced a real defect — muted text failing AA on raised surfaces — and it remains the visual reference while the components are built.

`/design-sync` must be typed by the user at the prompt; it cannot be invoked on their behalf.

**Do not start plan 2 until plan 1 is deployed and verified.** Spec §13.1 makes this non-negotiable: a deferred deployment becomes CORS and environment debugging under deadline pressure.

---

## File structure

Files created by this plan, and the single responsibility of each.

### Backend

```
supabase/
  config.toml                              Supabase project configuration
  migrations/
    20260820000001_cache_entries.sql       The response cache table
  functions/api/
    index.ts                               Entry point: CORS, delegates to router
    router.ts                              Maps method + path to a handler
    types.ts                               Response contracts shared with the frontend
    handlers/
      characters.ts                        Parses the request, calls the service, shapes the response
    services/
      rickMorty.ts                         Domain logic: list characters, normalize pagination
    clients/
      rmClient.ts                          The only file naming rickandmortyapi.com
    lib/
      cache.ts                             Postgres cache read and write
      errors.ts                            Typed errors mapped to HTTP codes
      validate.ts                          Query parameter parsing and validation
    tests/
      router_test.ts
      rmClient_test.ts
      cache_test.ts
      rickMorty_test.ts
      validate_test.ts
```

### Frontend

```
src/
  main.tsx                                 Mounts the app
  index.css                                Tailwind import, dimension palettes, theme mapping
  app/
    App.tsx                                Providers: QueryClient, RouterProvider
    routes.tsx                             Route configuration
  pages/
    CharactersPage.tsx                     Composition only — no queries, no logic
    NotFoundPage.tsx                       404
  features/characters/
    useCharacters.ts                       The TanStack Query hook
    CharacterGrid.tsx                      Renders a list of cards, or empty/error/skeleton
    CharacterCard.tsx                      One character
    CharacterFilters.tsx                   Filter controls bound to the URL
    StatusIndicator.tsx                    Alive / dead / unknown
  shared/
    api/
      client.ts                            The only file naming the backend URL
      types.ts                             Mirrors the backend contract
    ui/
      Skeleton.tsx                         Loading placeholder primitive
      Pagination.tsx                       Page navigation
      EmptyState.tsx                       No results
      ErrorState.tsx                       Failure with retry
    hooks/
      useUrlFilters.ts                     Reads and writes filters in the URL
  test/
    setup.ts                               Vitest and RTL setup
    msw.ts                                 Mock server handlers
```

---

## Task 1: Scaffold the Vite project

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`

- [ ] **Step 1: Create the Vite project in the current directory**

The directory already contains `docs/`, `references/`, `design-brief/`, and `.gitignore`. Scaffold in place:

```bash
npm create vite@latest . -- --template react-ts
```

When prompted about the non-empty directory, choose to ignore existing files and continue.

- [ ] **Step 2: Install dependencies**

```bash
npm install
```

- [ ] **Step 3: Verify the dev server starts**

```bash
npm run dev
```

Expected: Vite prints a local URL, and opening it shows the default Vite + React page. Stop the server with Ctrl+C.

- [ ] **Step 4: Verify the production build succeeds**

```bash
npm run build
```

Expected: exit code 0, and a `dist/` directory is produced.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite React TypeScript project"
```

---

## Task 2: Install runtime dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install application dependencies**

```bash
npm install react-router-dom @tanstack/react-query
```

- [ ] **Step 2: Install Tailwind v4**

```bash
npm install tailwindcss @tailwindcss/vite
```

- [ ] **Step 3: Install test dependencies**

```bash
npm install -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event msw
```

- [ ] **Step 4: Verify the install produced no errors**

```bash
npm ls react-router-dom @tanstack/react-query tailwindcss vitest
```

Expected: each package is listed with a version, and no `UNMET DEPENDENCY` appears.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add router, query, tailwind, and test dependencies"
```

---

## Task 3: Wire Tailwind and the dimension palettes

**Files:**
- Modify: `vite.config.ts`
- Create: `src/index.css`
- Modify: `index.html`

- [ ] **Step 1: Register the Tailwind plugin**

Replace `vite.config.ts` entirely:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

- [ ] **Step 2: Write the stylesheet with all three palettes**

Replace `src/index.css` entirely. Values come from `docs/design/tokens.md` and must not be altered — each has a computed contrast ratio behind it.

```css
@import "tailwindcss";

:root,
[data-dimension="c-137"] {
  --bg: #2E3B2C;
  --surface: #3A4838;
  --raised: #414F3D;
  --line: #4E5C4A;
  --fg: #EAE9EA;
  --muted: #BAC1B4;
  --accent: #A7CB56;
  --accent-hover: #B8D96D;
  --link: #A2D0E4;
  --highlight: #F3EF7C;
  --alive: #A7CB56;
  --dead: #DB958C;
  --unknown: #BAC1B4;
}

[data-dimension="citadel"] {
  --bg: #E8EAEA;
  --surface: #F2F3F3;
  --raised: #FBFBFB;
  --line: #C3CCCC;
  --fg: #22302C;
  --muted: #5A6663;
  --accent: #3E5A5E;
  --accent-hover: #2E4649;
  --link: #3E5A5E;
  --highlight: #4C6520;
  --alive: #4C6520;
  --dead: #8E4A42;
  --unknown: #6B7370;
}

[data-dimension="cronenberg"] {
  --bg: #23291C;
  --surface: #2F3726;
  --raised: #3A4430;
  --line: #49573D;
  --fg: #E4E2DA;
  --muted: #B4B0A3;
  --accent: #C07E72;
  --accent-hover: #D29387;
  --link: #A2D0E4;
  --highlight: #CBCA78;
  --alive: #A7CB56;
  --dead: #C07E72;
  --unknown: #B4B0A3;
}

@theme inline {
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-raised: var(--raised);
  --color-line: var(--line);
  --color-fg: var(--fg);
  --color-muted: var(--muted);
  --color-accent: var(--accent);
  --color-accent-hover: var(--accent-hover);
  --color-link: var(--link);
  --color-highlight: var(--highlight);
  --color-alive: var(--alive);
  --color-dead: var(--dead);
  --color-unknown: var(--unknown);

  --font-sans: "Space Grotesk", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
}

body {
  background-color: var(--bg);
  color: var(--fg);
  font-family: var(--font-sans);
}
```

- [ ] **Step 3: Load the fonts and set the default dimension**

Replace `index.html` entirely:

```html
<!doctype html>
<html lang="en" data-dimension="c-137">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Citadel Archive</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@400;500&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Verify Tailwind compiles against the tokens**

Replace `src/App.tsx` with a temporary check:

```tsx
export default function App() {
  return (
    <div className="min-h-screen bg-bg p-8">
      <h1 className="text-fg font-mono text-2xl">CITADEL ARCHIVE</h1>
      <p className="text-muted mt-2">Tailwind is reading the dimension tokens.</p>
      <span className="text-accent mt-4 block">Portal accent</span>
    </div>
  )
}
```

Run:

```bash
npm run dev
```

Expected: the page renders on the dark green `#2E3B2C` background, the heading is monospace off-white, and "Portal accent" is lime. If colors are absent, Tailwind is not resolving `@theme inline`.

- [ ] **Step 5: Commit**

```bash
git add vite.config.ts src/index.css index.html src/App.tsx
git commit -m "feat: wire Tailwind v4 to the three dimension palettes"
```

---

## Task 4: Configure Vitest

**Files:**
- Modify: `vite.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/shared/ui/Skeleton.tsx`
- Create: `src/shared/ui/Skeleton.test.tsx`
- Modify: `package.json`

- [ ] **Step 1: Write the failing test**

Create `src/shared/ui/Skeleton.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Skeleton } from './Skeleton'

describe('Skeleton', () => {
  it('exposes a busy status to assistive technology', () => {
    render(<Skeleton />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('applies a caller-supplied class so it can mirror real geometry', () => {
    render(<Skeleton className="h-40 w-full" />)
    expect(screen.getByRole('status')).toHaveClass('h-40', 'w-full')
  })
})
```

- [ ] **Step 2: Add the test configuration**

Replace `vite.config.ts` entirely:

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

Create `src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

Add the script to `package.json` under `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL — `Failed to resolve import "./Skeleton"`.

- [ ] **Step 4: Write the minimal implementation**

Create `src/shared/ui/Skeleton.tsx`:

```tsx
type SkeletonProps = {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`animate-pulse rounded bg-raised ${className}`}
    />
  )
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
npm test
```

Expected: PASS — 2 tests passing.

- [ ] **Step 6: Commit**

```bash
git add vite.config.ts src/test/setup.ts src/shared/ui/Skeleton.tsx src/shared/ui/Skeleton.test.tsx package.json
git commit -m "feat: configure Vitest and add the Skeleton primitive"
```

---

## Task 5: Initialize Supabase and the cache migration

**Files:**
- Create: `supabase/config.toml` (generated)
- Create: `supabase/migrations/20260820000001_cache_entries.sql`

- [ ] **Step 1: Initialize the local Supabase project**

```bash
npx supabase init
```

Expected: `supabase/config.toml` is created.

- [ ] **Step 2: Write the cache migration**

Create `supabase/migrations/20260820000001_cache_entries.sql`:

```sql
create table if not exists cache_entries (
  key        text primary key,
  payload    jsonb       not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists cache_entries_expires_at_idx
  on cache_entries (expires_at);

-- RLS on with no policies denies the anonymous key entirely.
-- Only the Edge Function, using the service role key, may read or write.
alter table cache_entries enable row level security;
```

- [ ] **Step 3: Link the project to a Supabase instance**

Create a project at https://supabase.com/dashboard, then link it. Replace `<project-ref>` with the reference from the project settings:

```bash
npx supabase link --project-ref <project-ref>
```

- [ ] **Step 4: Apply the migration**

```bash
npx supabase db push
```

Expected: the CLI reports the migration applied. Verify in the dashboard that the `cache_entries` table exists with RLS enabled.

- [ ] **Step 5: Commit**

```bash
git add supabase/
git commit -m "feat: add Supabase project config and the cache_entries migration"
```

---

## Task 6: Backend types and validation

**Files:**
- Create: `supabase/functions/api/types.ts`
- Create: `supabase/functions/api/lib/validate.ts`
- Create: `supabase/functions/api/tests/validate_test.ts`

- [ ] **Step 1: Write the failing test**

Create `supabase/functions/api/tests/validate_test.ts`:

```ts
import { assertEquals, assertThrows } from 'jsr:@std/assert'
import { parseCharacterQuery } from '../lib/validate.ts'
import { ValidationError } from '../lib/errors.ts'

Deno.test('defaults to page 1 when no page is supplied', () => {
  const result = parseCharacterQuery(new URLSearchParams(''))
  assertEquals(result.page, 1)
})

Deno.test('reads a valid page number', () => {
  const result = parseCharacterQuery(new URLSearchParams('page=7'))
  assertEquals(result.page, 7)
})

Deno.test('rejects a page below 1', () => {
  assertThrows(
    () => parseCharacterQuery(new URLSearchParams('page=0')),
    ValidationError,
  )
})

Deno.test('rejects a non-numeric page', () => {
  assertThrows(
    () => parseCharacterQuery(new URLSearchParams('page=abc')),
    ValidationError,
  )
})

Deno.test('lowercases status and accepts valid values', () => {
  const result = parseCharacterQuery(new URLSearchParams('status=Alive'))
  assertEquals(result.status, 'alive')
})

Deno.test('rejects an unknown status', () => {
  assertThrows(
    () => parseCharacterQuery(new URLSearchParams('status=undead')),
    ValidationError,
  )
})

Deno.test('trims the name and drops it when empty', () => {
  assertEquals(parseCharacterQuery(new URLSearchParams('name=  ')).name, undefined)
  assertEquals(parseCharacterQuery(new URLSearchParams('name= rick ')).name, 'rick')
})

Deno.test('omits absent optional filters', () => {
  const result = parseCharacterQuery(new URLSearchParams('page=2'))
  assertEquals(result.name, undefined)
  assertEquals(result.status, undefined)
  assertEquals(result.species, undefined)
  assertEquals(result.gender, undefined)
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
deno test --allow-env supabase/functions/api/tests/validate_test.ts
```

Expected: FAIL — module `../lib/validate.ts` not found.

- [ ] **Step 3: Write the error types**

Create `supabase/functions/api/lib/errors.ts`:

```ts
export class AppError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super('INVALID_PARAMETER', message, 400)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super('NOT_FOUND', message, 404)
    this.name = 'NotFoundError'
  }
}

export class UpstreamError extends AppError {
  constructor(message: string) {
    super('UPSTREAM_UNAVAILABLE', message, 503)
    this.name = 'UpstreamError'
  }
}
```

- [ ] **Step 4: Write the shared contracts**

Create `supabase/functions/api/types.ts`:

```ts
export type CharacterStatus = 'alive' | 'dead' | 'unknown'
export type CharacterGender = 'female' | 'male' | 'genderless' | 'unknown'

export type CharacterQuery = {
  page: number
  name?: string
  status?: CharacterStatus
  species?: string
  gender?: CharacterGender
}

export type CharacterRef = {
  name: string
  id: number | null
}

export type Character = {
  id: number
  name: string
  status: string
  species: string
  type: string
  gender: string
  image: string
  origin: CharacterRef
  location: CharacterRef
  episodeCount: number
}

export type Pagination = {
  page: number
  pageCount: number
  total: number
  pageSize: number
}

export type ListResponse<T> = {
  items: T[]
  pagination: Pagination
}
```

- [ ] **Step 5: Write the validator**

Create `supabase/functions/api/lib/validate.ts`:

```ts
import { ValidationError } from './errors.ts'
import type {
  CharacterGender,
  CharacterQuery,
  CharacterStatus,
} from '../types.ts'

const STATUSES: CharacterStatus[] = ['alive', 'dead', 'unknown']
const GENDERS: CharacterGender[] = ['female', 'male', 'genderless', 'unknown']

function parsePage(raw: string | null): number {
  if (raw === null || raw === '') return 1
  if (!/^\d+$/.test(raw)) {
    throw new ValidationError(`page must be a positive integer, received "${raw}"`)
  }
  const page = Number(raw)
  if (page < 1) {
    throw new ValidationError(`page must be at least 1, received ${page}`)
  }
  return page
}

function parseText(raw: string | null): string | undefined {
  if (raw === null) return undefined
  const trimmed = raw.trim()
  return trimmed === '' ? undefined : trimmed
}

function parseEnum<T extends string>(
  raw: string | null,
  allowed: T[],
  field: string,
): T | undefined {
  const value = parseText(raw)
  if (value === undefined) return undefined
  const lowered = value.toLowerCase() as T
  if (!allowed.includes(lowered)) {
    throw new ValidationError(
      `${field} must be one of ${allowed.join(', ')}, received "${value}"`,
    )
  }
  return lowered
}

export function parseCharacterQuery(params: URLSearchParams): CharacterQuery {
  return {
    page: parsePage(params.get('page')),
    name: parseText(params.get('name')),
    status: parseEnum(params.get('status'), STATUSES, 'status'),
    species: parseText(params.get('species')),
    gender: parseEnum(params.get('gender'), GENDERS, 'gender'),
  }
}
```

- [ ] **Step 6: Run the test to verify it passes**

```bash
deno test --allow-env supabase/functions/api/tests/validate_test.ts
```

Expected: PASS — 8 tests passing.

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/api/types.ts supabase/functions/api/lib/errors.ts supabase/functions/api/lib/validate.ts supabase/functions/api/tests/validate_test.ts
git commit -m "feat: add backend contracts, typed errors, and query validation"
```

---

## Task 7: The Rick and Morty client

**Files:**
- Create: `supabase/functions/api/clients/rmClient.ts`
- Create: `supabase/functions/api/tests/rmClient_test.ts`

This is the only file in the repository permitted to name `rickandmortyapi.com`. Task 15 adds a lint rule enforcing that.

- [ ] **Step 1: Write the failing test**

Create `supabase/functions/api/tests/rmClient_test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
deno test --allow-env supabase/functions/api/tests/rmClient_test.ts
```

Expected: FAIL — module `../clients/rmClient.ts` not found.

- [ ] **Step 3: Write the client**

Create `supabase/functions/api/clients/rmClient.ts`:

```ts
import { UpstreamError } from '../lib/errors.ts'
import type { CharacterQuery } from '../types.ts'

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

export type RmListResponse<T> = {
  info: { count: number; pages: number }
  results: T[]
}

export type FetchFn = (url: string) => Promise<Response>

const EMPTY: RmListResponse<never> = {
  info: { count: 0, pages: 0 },
  results: [],
}

function buildQuery(query: CharacterQuery): string {
  const params = new URLSearchParams()
  params.set('page', String(query.page))
  if (query.name) params.set('name', query.name)
  if (query.status) params.set('status', query.status)
  if (query.species) params.set('species', query.species)
  if (query.gender) params.set('gender', query.gender)
  return params.toString()
}

export function createRmClient(fetchFn: FetchFn = fetch) {
  async function get<T>(path: string): Promise<RmListResponse<T>> {
    let response: Response
    try {
      response = await fetchFn(`${BASE_URL}${path}`)
    } catch (cause) {
      throw new UpstreamError(
        `Rick and Morty API unreachable: ${(cause as Error).message}`,
      )
    }

    // The upstream API answers 404 for an empty result set, which is a
    // normal outcome for a filter that matches nothing, not a failure.
    if (response.status === 404) {
      return EMPTY as RmListResponse<T>
    }

    if (!response.ok) {
      throw new UpstreamError(
        `Rick and Morty API returned ${response.status}`,
      )
    }

    return await response.json() as RmListResponse<T>
  }

  return {
    listCharacters(query: CharacterQuery) {
      return get<RawCharacter>(`/character?${buildQuery(query)}`)
    },
  }
}

export type RmClient = ReturnType<typeof createRmClient>
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
deno test --allow-env supabase/functions/api/tests/rmClient_test.ts
```

Expected: PASS — 6 tests passing.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/api/clients/rmClient.ts supabase/functions/api/tests/rmClient_test.ts
git commit -m "feat: add the Rick and Morty HTTP client with upstream error handling"
```

---

## Task 8: The Postgres cache

**Files:**
- Create: `supabase/functions/api/lib/cache.ts`
- Create: `supabase/functions/api/tests/cache_test.ts`

- [ ] **Step 1: Write the failing test**

Create `supabase/functions/api/tests/cache_test.ts`:

```ts
import { assertEquals } from 'jsr:@std/assert'
import { buildCacheKey, createCache, type CacheStore } from '../lib/cache.ts'

function memoryStore(): CacheStore & { writes: number } {
  const rows = new Map<string, { payload: unknown; expiresAt: number }>()
  return {
    writes: 0,
    async read(key) {
      return rows.get(key) ?? null
    },
    async write(key, payload, expiresAt) {
      this.writes++
      rows.set(key, { payload, expiresAt })
    },
  }
}

Deno.test('sorts parameters so equivalent queries share one key', () => {
  const a = buildCacheKey('characters', { status: 'alive', page: '2' })
  const b = buildCacheKey('characters', { page: '2', status: 'alive' })
  assertEquals(a, b)
  assertEquals(a, 'characters?page=2&status=alive')
})

Deno.test('omits undefined parameters from the key', () => {
  const key = buildCacheKey('characters', { page: '1', name: undefined })
  assertEquals(key, 'characters?page=1')
})

Deno.test('calls the loader and stores the result on a miss', async () => {
  const store = memoryStore()
  const cache = createCache(store, () => 1_000)

  const result = await cache.resolve('k', 60, async () => ({ value: 42 }))

  assertEquals(result.payload, { value: 42 })
  assertEquals(result.stale, false)
  assertEquals(store.writes, 1)
})

Deno.test('returns the stored payload without calling the loader on a hit', async () => {
  const store = memoryStore()
  const cache = createCache(store, () => 1_000)
  await cache.resolve('k', 60, async () => ({ value: 1 }))

  let called = false
  const result = await cache.resolve('k', 60, async () => {
    called = true
    return { value: 2 }
  })

  assertEquals(called, false)
  assertEquals(result.payload, { value: 1 })
  assertEquals(store.writes, 1)
})

Deno.test('refreshes an expired entry', async () => {
  const store = memoryStore()
  let now = 1_000
  const cache = createCache(store, () => now)
  await cache.resolve('k', 60, async () => ({ value: 1 }))

  now = 100_000
  const result = await cache.resolve('k', 60, async () => ({ value: 2 }))

  assertEquals(result.payload, { value: 2 })
  assertEquals(result.stale, false)
})

Deno.test('serves an expired entry marked stale when the loader fails', async () => {
  const store = memoryStore()
  let now = 1_000
  const cache = createCache(store, () => now)
  await cache.resolve('k', 60, async () => ({ value: 1 }))

  now = 100_000
  const result = await cache.resolve('k', 60, async () => {
    throw new Error('upstream down')
  })

  assertEquals(result.payload, { value: 1 })
  assertEquals(result.stale, true)
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
deno test --allow-env supabase/functions/api/tests/cache_test.ts
```

Expected: FAIL — module `../lib/cache.ts` not found.

- [ ] **Step 3: Write the cache**

Create `supabase/functions/api/lib/cache.ts`:

```ts
export type CacheRow = {
  payload: unknown
  expiresAt: number
}

export type CacheStore = {
  read(key: string): Promise<CacheRow | null>
  write(key: string, payload: unknown, expiresAt: number): Promise<void>
}

export type Resolved<T> = {
  payload: T
  stale: boolean
}

/**
 * Parameters are sorted so that the same logical query always produces the
 * same key. Without sorting, reordered parameters would create duplicate
 * entries for identical requests.
 */
export function buildCacheKey(
  prefix: string,
  params: Record<string, string | undefined>,
): string {
  const search = new URLSearchParams()
  for (const key of Object.keys(params).sort()) {
    const value = params[key]
    if (value !== undefined) search.set(key, value)
  }
  const query = search.toString()
  return query ? `${prefix}?${query}` : prefix
}

export function createCache(store: CacheStore, now: () => number = Date.now) {
  async function resolve<T>(
    key: string,
    ttlSeconds: number,
    load: () => Promise<T>,
  ): Promise<Resolved<T>> {
    const existing = await store.read(key)

    if (existing && existing.expiresAt > now()) {
      return { payload: existing.payload as T, stale: false }
    }

    try {
      const fresh = await load()
      await store.write(key, fresh, now() + ttlSeconds * 1_000)
      return { payload: fresh, stale: false }
    } catch (error) {
      // Stale data beats an empty screen when the upstream is unreachable.
      if (existing) {
        return { payload: existing.payload as T, stale: true }
      }
      throw error
    }
  }

  return { resolve }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
deno test --allow-env supabase/functions/api/tests/cache_test.ts
```

Expected: PASS — 6 tests passing.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/api/lib/cache.ts supabase/functions/api/tests/cache_test.ts
git commit -m "feat: add the Postgres-backed cache with stale-on-failure fallback"
```

---

## Task 9: The Postgres cache store

**Files:**
- Modify: `supabase/functions/api/lib/cache.ts`

- [ ] **Step 1: Append the Supabase-backed store**

Add to the end of `supabase/functions/api/lib/cache.ts`:

```ts
import { createClient } from 'jsr:@supabase/supabase-js@2'

export function createPostgresStore(url: string, serviceKey: string): CacheStore {
  const db = createClient(url, serviceKey)

  return {
    async read(key) {
      const { data, error } = await db
        .from('cache_entries')
        .select('payload, expires_at')
        .eq('key', key)
        .maybeSingle()

      if (error || !data) return null

      return {
        payload: data.payload,
        expiresAt: new Date(data.expires_at).getTime(),
      }
    },

    async write(key, payload, expiresAt) {
      await db.from('cache_entries').upsert({
        key,
        payload,
        expires_at: new Date(expiresAt).toISOString(),
      })
    },
  }
}
```

Move the `import` line to the top of the file alongside any other imports.

- [ ] **Step 2: Verify the existing tests still pass**

The store is not covered by unit tests — it is a thin adapter whose behavior belongs to Supabase. The logic above it is already tested through `memoryStore`.

```bash
deno test --allow-env supabase/functions/api/tests/cache_test.ts
```

Expected: PASS — 6 tests passing, unchanged.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/api/lib/cache.ts
git commit -m "feat: add the Supabase Postgres cache store adapter"
```

---

## Task 10: The characters service

**Files:**
- Create: `supabase/functions/api/services/rickMorty.ts`
- Create: `supabase/functions/api/tests/rickMorty_test.ts`

- [ ] **Step 1: Write the failing test**

Create `supabase/functions/api/tests/rickMorty_test.ts`:

```ts
import { assertEquals } from 'jsr:@std/assert'
import { createRickMortyService } from '../services/rickMorty.ts'
import type { RawCharacter, RmListResponse } from '../clients/rmClient.ts'

function rawCharacter(overrides: Partial<RawCharacter> = {}): RawCharacter {
  return {
    id: 1,
    name: 'Rick Sanchez',
    status: 'Alive',
    species: 'Human',
    type: '',
    gender: 'Male',
    image: 'https://example.test/1.jpeg',
    origin: {
      name: 'Earth (C-137)',
      url: 'https://rickandmortyapi.com/api/location/1',
    },
    location: {
      name: 'Citadel of Ricks',
      url: 'https://rickandmortyapi.com/api/location/3',
    },
    episode: [
      'https://rickandmortyapi.com/api/episode/1',
      'https://rickandmortyapi.com/api/episode/2',
    ],
    ...overrides,
  }
}

function stubClient(response: RmListResponse<RawCharacter>) {
  return {
    listCharacters: async () => response,
  }
}

const passthroughCache = {
  resolve: async <T>(_key: string, _ttl: number, load: () => Promise<T>) => ({
    payload: await load(),
    stale: false,
  }),
}

Deno.test('extracts the numeric id from a relation URL', async () => {
  const service = createRickMortyService(
    stubClient({ info: { count: 1, pages: 1 }, results: [rawCharacter()] }),
    passthroughCache,
  )

  const result = await service.listCharacters({ page: 1 })

  assertEquals(result.payload.items[0].origin, { name: 'Earth (C-137)', id: 1 })
  assertEquals(result.payload.items[0].location, { name: 'Citadel of Ricks', id: 3 })
})

Deno.test('marks a relation without a URL as unresolvable', async () => {
  const service = createRickMortyService(
    stubClient({
      info: { count: 1, pages: 1 },
      results: [rawCharacter({ origin: { name: 'unknown', url: '' } })],
    }),
    passthroughCache,
  )

  const result = await service.listCharacters({ page: 1 })

  assertEquals(result.payload.items[0].origin, { name: 'unknown', id: null })
})

Deno.test('counts episodes rather than passing URLs through', async () => {
  const service = createRickMortyService(
    stubClient({ info: { count: 1, pages: 1 }, results: [rawCharacter()] }),
    passthroughCache,
  )

  const result = await service.listCharacters({ page: 1 })

  assertEquals(result.payload.items[0].episodeCount, 2)
})

Deno.test('takes pagination totals from the upstream info block', async () => {
  const service = createRickMortyService(
    stubClient({ info: { count: 826, pages: 42 }, results: [] }),
    passthroughCache,
  )

  const result = await service.listCharacters({ page: 3 })

  assertEquals(result.payload.pagination, {
    page: 3,
    pageCount: 42,
    total: 826,
    pageSize: 20,
  })
})

Deno.test('builds a cache key covering every supplied filter', async () => {
  let seenKey = ''
  const recordingCache = {
    resolve: async <T>(key: string, _ttl: number, load: () => Promise<T>) => {
      seenKey = key
      return { payload: await load(), stale: false }
    },
  }

  const service = createRickMortyService(
    stubClient({ info: { count: 0, pages: 0 }, results: [] }),
    recordingCache,
  )

  await service.listCharacters({ page: 2, status: 'alive', name: 'rick' })

  assertEquals(seenKey, 'characters?name=rick&page=2&status=alive')
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
deno test --allow-env supabase/functions/api/tests/rickMorty_test.ts
```

Expected: FAIL — module `../services/rickMorty.ts` not found.

- [ ] **Step 3: Write the service**

Create `supabase/functions/api/services/rickMorty.ts`:

```ts
import { buildCacheKey, type Resolved } from '../lib/cache.ts'
import type { RawCharacter, RmListResponse } from '../clients/rmClient.ts'
import type {
  Character,
  CharacterQuery,
  CharacterRef,
  ListResponse,
} from '../types.ts'

const PAGE_SIZE = 20
const TTL_SECONDS = 24 * 60 * 60

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

/**
 * Relations arrive as URLs ending in a numeric id, or as an empty string
 * when the entity has no record — `origin: "unknown"` is common enough that
 * half of any given page carries it.
 */
function toRef(relation: { name: string; url: string }): CharacterRef {
  const match = relation.url.match(/\/(\d+)$/)
  return { name: relation.name, id: match ? Number(match[1]) : null }
}

function toCharacter(raw: RawCharacter): Character {
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

export function createRickMortyService(client: CharacterClient, cache: CacheLike) {
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

- [ ] **Step 4: Run the test to verify it passes**

```bash
deno test --allow-env supabase/functions/api/tests/rickMorty_test.ts
```

Expected: PASS — 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/api/services/rickMorty.ts supabase/functions/api/tests/rickMorty_test.ts
git commit -m "feat: add the characters service with relation resolution and caching"
```

---

## Task 11: The router and the function entry point

**Files:**
- Create: `supabase/functions/api/router.ts`
- Create: `supabase/functions/api/handlers/characters.ts`
- Create: `supabase/functions/api/index.ts`
- Create: `supabase/functions/api/tests/router_test.ts`

- [ ] **Step 1: Write the failing test**

Create `supabase/functions/api/tests/router_test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
deno test --allow-env supabase/functions/api/tests/router_test.ts
```

Expected: FAIL — module `../router.ts` not found.

- [ ] **Step 3: Write the handler**

Create `supabase/functions/api/handlers/characters.ts`:

```ts
import { parseCharacterQuery } from '../lib/validate.ts'
import type { Resolved } from '../lib/cache.ts'
import type { Character, CharacterQuery, ListResponse } from '../types.ts'

export type CharacterService = {
  listCharacters(
    query: CharacterQuery,
  ): Promise<Resolved<ListResponse<Character>>>
}

export async function handleListCharacters(
  url: URL,
  service: CharacterService,
): Promise<{ body: ListResponse<Character>; stale: boolean }> {
  const query = parseCharacterQuery(url.searchParams)
  const result = await service.listCharacters(query)
  return { body: result.payload, stale: result.stale }
}
```

- [ ] **Step 4: Write the router**

Create `supabase/functions/api/router.ts`:

```ts
import { handleListCharacters, type CharacterService } from './handlers/characters.ts'
import { AppError } from './lib/errors.ts'

const JSON_HEADERS = { 'content-type': 'application/json' }

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

export function createRouter(service: CharacterService) {
  return async function route(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = normalizePath(url.pathname)

    try {
      if (path === '/health') {
        return json({ status: 'ok' })
      }

      if (path === '/characters' && request.method === 'GET') {
        const { body, stale } = await handleListCharacters(url, service)
        return json(body, 200, stale ? { 'X-Cache': 'stale' } : {})
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

- [ ] **Step 5: Write the entry point**

Create `supabase/functions/api/index.ts`:

```ts
import { createRouter } from './router.ts'
import { createRmClient } from './clients/rmClient.ts'
import { createCache, createPostgresStore } from './lib/cache.ts'
import { createRickMortyService } from './services/rickMorty.ts'

const ALLOWED_ORIGIN_PATTERNS = [
  /^http:\/\/localhost:\d+$/,
  /^https:\/\/.*\.vercel\.app$/,
]

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGIN_PATTERNS.some((p) => p.test(origin))
  return {
    'Access-Control-Allow-Origin': allowed ? origin : 'null',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
    'Access-Control-Max-Age': '86400',
  }
}

const store = createPostgresStore(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)
const service = createRickMortyService(createRmClient(), createCache(store))
const route = createRouter(service)

Deno.serve(async (request) => {
  const cors = corsHeaders(request.headers.get('origin'))

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }

  const response = await route(request)
  for (const [key, value] of Object.entries(cors)) {
    response.headers.set(key, value)
  }
  return response
})
```

- [ ] **Step 6: Run the test to verify it passes**

```bash
deno test --allow-env supabase/functions/api/tests/router_test.ts
```

Expected: PASS — 8 tests passing.

- [ ] **Step 7: Run the whole backend suite**

```bash
deno test --allow-env supabase/functions/api/tests/
```

Expected: PASS — 33 tests passing across five files.

- [ ] **Step 8: Commit**

```bash
git add supabase/functions/api/
git commit -m "feat: add the API router, characters handler, and function entry point"
```

---

## Task 12: Deploy both halves

This is the checkpoint spec §13.1 insists on. Nothing beyond this point proceeds until a public URL responds.

**Files:**
- Create: `.env.example`
- Create: `.env.local`

- [ ] **Step 1: Deploy the Edge Function**

```bash
npx supabase functions deploy api --no-verify-jwt
```

`--no-verify-jwt` is required because the archive is public and the frontend has no authenticated user.

- [ ] **Step 2: Verify the function responds**

Replace `<project-ref>` with the project reference:

```bash
curl -i "https://<project-ref>.supabase.co/functions/v1/api/health"
```

Expected: HTTP 200 and the body `{"status":"ok"}`.

- [ ] **Step 3: Verify the characters endpoint against live data**

```bash
curl -s "https://<project-ref>.supabase.co/functions/v1/api/characters?page=1" | head -c 400
```

Expected: JSON containing `"items"` and a `"pagination"` object reporting `"total":826` and `"pageCount":42`.

- [ ] **Step 4: Verify caching took effect**

Run the same request twice and compare timings:

```bash
time curl -s -o /dev/null "https://<project-ref>.supabase.co/functions/v1/api/characters?page=1"
time curl -s -o /dev/null "https://<project-ref>.supabase.co/functions/v1/api/characters?page=1"
```

Expected: the second call is measurably faster. Confirm a row now exists in the `cache_entries` table via the Supabase dashboard.

- [ ] **Step 5: Record the environment contract**

Create `.env.example`:

```
# Public — safe to expose in the browser bundle
VITE_API_BASE=https://<project-ref>.supabase.co/functions/v1/api
VITE_SUPABASE_ANON_KEY=<anon-key>
```

Create `.env.local` with the real values. `.gitignore` already excludes `.env.*` while permitting `.env.example`.

- [ ] **Step 6: Deploy the frontend to Vercel**

```bash
npx vercel --yes
```

Then set the environment variables in the Vercel dashboard under Settings → Environment Variables, using the names from `.env.example`, and redeploy:

```bash
npx vercel --prod
```

- [ ] **Step 7: Verify the deployed frontend loads**

Open the Vercel URL. Expected: the temporary App page renders on the dark green background. This confirms the build pipeline and the token stylesheet survive deployment.

- [ ] **Step 8: Commit**

```bash
git add .env.example
git commit -m "chore: deploy the Edge Function and frontend, record the environment contract"
```

---

## Task 13: The frontend API client

**Files:**
- Create: `src/shared/api/types.ts`
- Create: `src/shared/api/client.ts`
- Create: `src/shared/api/client.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/shared/api/client.test.ts`:

```tsx
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
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL — cannot resolve `./client`.

- [ ] **Step 3: Write the shared types**

Create `src/shared/api/types.ts`:

```ts
export type CharacterRef = {
  name: string
  id: number | null
}

export type Character = {
  id: number
  name: string
  status: string
  species: string
  type: string
  gender: string
  image: string
  origin: CharacterRef
  location: CharacterRef
  episodeCount: number
}

export type Pagination = {
  page: number
  pageCount: number
  total: number
  pageSize: number
}

export type ListResponse<T> = {
  items: T[]
  pagination: Pagination
}

export type CharacterFilters = {
  page?: number
  name?: string
  status?: string
  species?: string
  gender?: string
}
```

- [ ] **Step 4: Write the client**

Create `src/shared/api/client.ts`. This is the only frontend file naming the backend URL.

```ts
import type { Character, CharacterFilters, ListResponse } from './types'

export class ApiError extends Error {
  constructor(readonly code: string, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

function baseUrl(): string {
  return import.meta.env.VITE_API_BASE ?? '/api'
}

async function get<T>(path: string): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${baseUrl()}${path}`)
  } catch (cause) {
    throw new ApiError('NETWORK', (cause as Error).message)
  }

  const body = await response.json()

  if (!response.ok) {
    const code = body?.error?.code ?? 'UNKNOWN'
    const message = body?.error?.message ?? `Request failed (${response.status})`
    throw new ApiError(code, message)
  }

  return body as T
}

export function fetchCharacters(
  filters: CharacterFilters,
): Promise<ListResponse<Character>> {
  const params = new URLSearchParams()
  params.set('page', String(filters.page ?? 1))
  if (filters.name) params.set('name', filters.name)
  if (filters.status) params.set('status', filters.status)
  if (filters.species) params.set('species', filters.species)
  if (filters.gender) params.set('gender', filters.gender)

  return get<ListResponse<Character>>(`/characters?${params.toString()}`)
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
npm test
```

Expected: PASS — 5 new tests passing.

- [ ] **Step 6: Commit**

```bash
git add src/shared/api/
git commit -m "feat: add the frontend API client with typed errors"
```

---

## Task 14: URL-driven filter state

**Files:**
- Create: `src/shared/hooks/useUrlFilters.ts`
- Create: `src/shared/hooks/useUrlFilters.test.tsx`

Spec §3.3: search state lives in the URL so the back button works and results are shareable.

- [ ] **Step 1: Write the failing test**

Create `src/shared/hooks/useUrlFilters.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useUrlFilters } from './useUrlFilters'

function Probe() {
  const { filters, setFilter, clearFilters } = useUrlFilters()
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

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/characters" element={<Probe />} />
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
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL — cannot resolve `./useUrlFilters`.

- [ ] **Step 3: Write the hook**

Create `src/shared/hooks/useUrlFilters.ts`:

```ts
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { CharacterFilters } from '../api/types'

export type FilterKey = 'page' | 'name' | 'status' | 'species' | 'gender'

export function useUrlFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = useMemo<CharacterFilters>(() => {
    const rawPage = searchParams.get('page')
    return {
      page: rawPage ? Number(rawPage) : 1,
      name: searchParams.get('name') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      species: searchParams.get('species') ?? undefined,
      gender: searchParams.get('gender') ?? undefined,
    }
  }, [searchParams])

  const setFilter = useCallback(
    (key: FilterKey, value: string | undefined) => {
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

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm test
```

Expected: PASS — 6 new tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/shared/hooks/
git commit -m "feat: hold character filters in the URL so results stay shareable"
```

---

## Task 15: The boundary lint rule

**Files:**
- Modify: `eslint.config.js`

Spec §12.4: the central requirement becomes automatically verified rather than a matter of trust.

- [ ] **Step 1: Add the restriction**

The Vite template generates `eslint.config.js`. Add a `rules` block to the configuration object that targets `src/**`:

```js
rules: {
  'no-restricted-syntax': [
    'error',
    {
      selector: "Literal[value=/rickandmortyapi\\.com/]",
      message:
        'The frontend must never contact rickandmortyapi.com directly. All external calls go through the Edge Function. See spec section 3.1.',
    },
    {
      selector: "TemplateElement[value.raw=/rickandmortyapi\\.com/]",
      message:
        'The frontend must never contact rickandmortyapi.com directly. All external calls go through the Edge Function. See spec section 3.1.',
    },
  ],
},
```

- [ ] **Step 2: Write a violation to prove the rule fires**

Temporarily add to `src/shared/api/client.ts`:

```ts
const VIOLATION = 'https://rickandmortyapi.com/api/character'
```

- [ ] **Step 3: Run the linter to verify it catches the violation**

```bash
npm run lint
```

Expected: FAIL — the error message above, reported at the `VIOLATION` line.

- [ ] **Step 4: Remove the violation and verify the lint passes**

Delete the `VIOLATION` line, then:

```bash
npm run lint
```

Expected: exit code 0, no errors.

- [ ] **Step 5: Commit**

```bash
git add eslint.config.js
git commit -m "feat: forbid direct external API references in frontend source"
```

---

## Task 16: The status indicator

**Files:**
- Create: `src/features/characters/StatusIndicator.tsx`
- Create: `src/features/characters/StatusIndicator.test.tsx`

Spec §12.1: status is never conveyed by color alone.

- [ ] **Step 1: Write the failing test**

Create `src/features/characters/StatusIndicator.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusIndicator } from './StatusIndicator'

describe('StatusIndicator', () => {
  it('shows a text label alongside the dot for alive', () => {
    render(<StatusIndicator status="Alive" />)
    expect(screen.getByText('Alive')).toBeInTheDocument()
  })

  it('shows a text label for dead', () => {
    render(<StatusIndicator status="Dead" />)
    expect(screen.getByText('Dead')).toBeInTheDocument()
  })

  it('shows a text label for unknown', () => {
    render(<StatusIndicator status="unknown" />)
    expect(screen.getByText('unknown')).toBeInTheDocument()
  })

  it('applies the alive color token', () => {
    const { container } = render(<StatusIndicator status="Alive" />)
    expect(container.querySelector('[data-status="alive"]')).toBeInTheDocument()
  })

  it('applies the dead color token regardless of casing', () => {
    const { container } = render(<StatusIndicator status="DEAD" />)
    expect(container.querySelector('[data-status="dead"]')).toBeInTheDocument()
  })

  it('falls back to unknown for an unrecognized value', () => {
    const { container } = render(<StatusIndicator status="Cronenberged" />)
    expect(container.querySelector('[data-status="unknown"]')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL — cannot resolve `./StatusIndicator`.

- [ ] **Step 3: Write the component**

Create `src/features/characters/StatusIndicator.tsx`:

```tsx
type StatusIndicatorProps = {
  status: string
}

type Kind = 'alive' | 'dead' | 'unknown'

const DOT_CLASS: Record<Kind, string> = {
  alive: 'bg-alive animate-pulse',
  dead: 'bg-dead',
  unknown: 'bg-unknown',
}

function toKind(status: string): Kind {
  const normalized = status.toLowerCase()
  if (normalized === 'alive') return 'alive'
  if (normalized === 'dead') return 'dead'
  return 'unknown'
}

export function StatusIndicator({ status }: StatusIndicatorProps) {
  const kind = toKind(status)

  return (
    <span className="flex items-center gap-2 font-mono text-xs">
      <span
        data-status={kind}
        aria-hidden="true"
        className={`inline-block h-2 w-2 rounded-full ${DOT_CLASS[kind]}`}
      />
      <span className="text-muted">{status}</span>
    </span>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm test
```

Expected: PASS — 6 new tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/features/characters/StatusIndicator.tsx src/features/characters/StatusIndicator.test.tsx
git commit -m "feat: add the status indicator with a text label beside the dot"
```

---

## Task 17: The character card

**Files:**
- Create: `src/features/characters/CharacterCard.tsx`
- Create: `src/features/characters/CharacterCard.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/features/characters/CharacterCard.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CharacterCard } from './CharacterCard'
import type { Character } from '../../shared/api/types'

function character(overrides: Partial<Character> = {}): Character {
  return {
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
    ...overrides,
  }
}

function renderCard(data: Character) {
  return render(
    <MemoryRouter>
      <CharacterCard character={data} />
    </MemoryRouter>,
  )
}

describe('CharacterCard', () => {
  it('shows the name and species', () => {
    renderCard(character())
    expect(screen.getByText('Rick Sanchez')).toBeInTheDocument()
    expect(screen.getByText('Human')).toBeInTheDocument()
  })

  it('renders the registry id in monospace archive format', () => {
    renderCard(character({ id: 7 }))
    expect(screen.getByText('REGISTRY #007')).toBeInTheDocument()
  })

  it('gives the image a meaningful alt text', () => {
    renderCard(character())
    expect(screen.getByAltText('Rick Sanchez')).toBeInTheDocument()
  })

  it('lazily loads the image with explicit dimensions', () => {
    renderCard(character())
    const image = screen.getByAltText('Rick Sanchez')
    expect(image).toHaveAttribute('loading', 'lazy')
    expect(image).toHaveAttribute('width')
    expect(image).toHaveAttribute('height')
  })

  it('links to the character detail route', () => {
    renderCard(character({ id: 42 }))
    expect(screen.getByRole('link')).toHaveAttribute('href', '/characters/42')
  })

  it('renders a redaction bar when the origin is unknown', () => {
    renderCard(character({ origin: { name: 'unknown', id: null } }))
    expect(screen.getByTestId('redacted-origin')).toBeInTheDocument()
  })

  it('shows the origin name when it is known', () => {
    renderCard(character())
    expect(screen.getByText('Earth (C-137)')).toBeInTheDocument()
    expect(screen.queryByTestId('redacted-origin')).not.toBeInTheDocument()
  })

  it('marks a deceased character for styling', () => {
    const { container } = renderCard(character({ status: 'Dead' }))
    expect(container.querySelector('[data-deceased="true"]')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL — cannot resolve `./CharacterCard`.

- [ ] **Step 3: Write the component**

Create `src/features/characters/CharacterCard.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { StatusIndicator } from './StatusIndicator'
import type { Character } from '../../shared/api/types'

type CharacterCardProps = {
  character: Character
}

function registryId(id: number): string {
  return `REGISTRY #${String(id).padStart(3, '0')}`
}

export function CharacterCard({ character }: CharacterCardProps) {
  const deceased = character.status.toLowerCase() === 'dead'
  const originUnknown = character.origin.id === null

  return (
    <Link
      to={`/characters/${character.id}`}
      data-deceased={deceased}
      className="group block border border-line bg-surface transition-colors hover:border-accent data-[deceased=true]:opacity-80"
    >
      <img
        src={character.image}
        alt={character.name}
        width={300}
        height={300}
        loading="lazy"
        className="aspect-square w-full object-cover"
      />

      <div className="space-y-2 p-4">
        <p className="font-mono text-xs text-muted">{registryId(character.id)}</p>

        <h3 className="text-fg font-medium leading-tight">{character.name}</h3>

        <StatusIndicator status={character.status} />

        <dl className="space-y-1 font-mono text-xs">
          <div className="flex justify-between gap-2">
            <dt className="text-muted">SPECIES</dt>
            <dd className="text-fg truncate">{character.species}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted">ORIGIN</dt>
            <dd className="text-fg truncate">
              {originUnknown ? (
                <span
                  data-testid="redacted-origin"
                  aria-label="Origin redacted"
                  className="inline-block h-3 w-20 bg-fg align-middle"
                />
              ) : (
                character.origin.name
              )}
            </dd>
          </div>
        </dl>
      </div>
    </Link>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm test
```

Expected: PASS — 8 new tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/features/characters/CharacterCard.tsx src/features/characters/CharacterCard.test.tsx
git commit -m "feat: add the character card with redaction bar for unknown origins"
```

---

## Task 18: Pagination

**Files:**
- Create: `src/shared/ui/Pagination.tsx`
- Create: `src/shared/ui/Pagination.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/shared/ui/Pagination.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Pagination } from './Pagination'

describe('Pagination', () => {
  it('reports the position in archive wording', () => {
    render(<Pagination page={3} pageCount={42} onChange={() => {}} />)
    expect(screen.getByText('DIMENSION 3 / 42')).toBeInTheDocument()
  })

  it('disables the previous control on the first page', () => {
    render(<Pagination page={1} pageCount={42} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled()
  })

  it('disables the next control on the last page', () => {
    render(<Pagination page={42} pageCount={42} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
  })

  it('enables both controls in the middle', () => {
    render(<Pagination page={20} pageCount={42} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: /previous/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /next/i })).toBeEnabled()
  })

  it('emits the next page number', async () => {
    const onChange = vi.fn()
    render(<Pagination page={5} pageCount={42} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(onChange).toHaveBeenCalledWith(6)
  })

  it('emits the previous page number', async () => {
    const onChange = vi.fn()
    render(<Pagination page={5} pageCount={42} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /previous/i }))
    expect(onChange).toHaveBeenCalledWith(4)
  })

  it('renders nothing when there is only one page', () => {
    const { container } = render(
      <Pagination page={1} pageCount={1} onChange={() => {}} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL — cannot resolve `./Pagination`.

- [ ] **Step 3: Write the component**

Create `src/shared/ui/Pagination.tsx`:

```tsx
type PaginationProps = {
  page: number
  pageCount: number
  onChange: (page: number) => void
}

const BUTTON =
  'border border-line px-3 py-2 font-mono text-xs text-fg transition-colors ' +
  'hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 ' +
  'disabled:hover:border-line disabled:hover:text-fg'

export function Pagination({ page, pageCount, onChange }: PaginationProps) {
  if (pageCount <= 1) return null

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-center gap-4 py-6"
    >
      <button
        type="button"
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className={BUTTON}
      >
        &larr; JUMP
      </button>

      <span className="font-mono text-xs text-muted">
        DIMENSION {page} / {pageCount}
      </span>

      <button
        type="button"
        aria-label="Next page"
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
        className={BUTTON}
      >
        JUMP &rarr;
      </button>
    </nav>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm test
```

Expected: PASS — 7 new tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/shared/ui/Pagination.tsx src/shared/ui/Pagination.test.tsx
git commit -m "feat: add pagination with archive wording and boundary handling"
```

---

## Task 19: Empty and error states

**Files:**
- Create: `src/shared/ui/EmptyState.tsx`
- Create: `src/shared/ui/ErrorState.tsx`
- Create: `src/shared/ui/states.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/shared/ui/states.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmptyState } from './EmptyState'
import { ErrorState } from './ErrorState'

describe('EmptyState', () => {
  it('shows the archive voice for no results', () => {
    render(<EmptyState />)
    expect(
      screen.getByText('Oooh, nothing here! Existence is pain!'),
    ).toBeInTheDocument()
  })

  it('accepts a caller-supplied message', () => {
    render(<EmptyState message="No dimensions match." />)
    expect(screen.getByText('No dimensions match.')).toBeInTheDocument()
  })
})

describe('ErrorState', () => {
  it('shows the network failure message', () => {
    render(<ErrorState onRetry={() => {}} />)
    expect(
      screen.getByText('The portal fluid is out. Blame Jerry.'),
    ).toBeInTheDocument()
  })

  it('offers a retry control', async () => {
    const onRetry = vi.fn()
    render(<ErrorState onRetry={onRetry} />)
    await userEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('shows a caller-supplied message instead of the default', () => {
    render(<ErrorState message="Registry offline." onRetry={() => {}} />)
    expect(screen.getByText('Registry offline.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL — cannot resolve `./EmptyState`.

- [ ] **Step 3: Write the components**

Create `src/shared/ui/EmptyState.tsx`:

```tsx
type EmptyStateProps = {
  message?: string
}

export function EmptyState({
  message = 'Oooh, nothing here! Existence is pain!',
}: EmptyStateProps) {
  return (
    <div className="border border-line bg-surface px-6 py-16 text-center">
      <p className="font-mono text-sm text-muted">NO RECORDS FOUND</p>
      <p className="mt-3 text-fg">{message}</p>
    </div>
  )
}
```

Create `src/shared/ui/ErrorState.tsx`:

```tsx
type ErrorStateProps = {
  message?: string
  onRetry: () => void
}

export function ErrorState({
  message = 'The portal fluid is out. Blame Jerry.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="border border-dead bg-surface px-6 py-16 text-center">
      <p className="font-mono text-sm text-dead">REGISTRY UNREACHABLE</p>
      <p className="mt-3 text-fg">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 border border-line px-4 py-2 font-mono text-xs text-fg transition-colors hover:border-accent hover:text-accent"
      >
        RETRY
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm test
```

Expected: PASS — 5 new tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/shared/ui/EmptyState.tsx src/shared/ui/ErrorState.tsx src/shared/ui/states.test.tsx
git commit -m "feat: add empty and error states in the archive voice"
```

---

## Task 20: The characters query hook and grid

**Files:**
- Create: `src/features/characters/useCharacters.ts`
- Create: `src/features/characters/CharacterGrid.tsx`
- Create: `src/features/characters/CharacterGrid.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/features/characters/CharacterGrid.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CharacterGrid } from './CharacterGrid'
import type { Character } from '../../shared/api/types'

const rick: Character = {
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

function renderGrid(props: Partial<Parameters<typeof CharacterGrid>[0]> = {}) {
  return render(
    <MemoryRouter>
      <CharacterGrid
        characters={[]}
        isPending={false}
        isError={false}
        onRetry={() => {}}
        {...props}
      />
    </MemoryRouter>,
  )
}

describe('CharacterGrid', () => {
  it('renders skeletons while pending', () => {
    renderGrid({ isPending: true })
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0)
  })

  it('renders no cards while pending', () => {
    renderGrid({ isPending: true, characters: [rick] })
    expect(screen.queryByText('Rick Sanchez')).not.toBeInTheDocument()
  })

  it('renders the error state on failure', () => {
    renderGrid({ isError: true })
    expect(screen.getByText('REGISTRY UNREACHABLE')).toBeInTheDocument()
  })

  it('renders the empty state when there are no results', () => {
    renderGrid({ characters: [] })
    expect(screen.getByText('NO RECORDS FOUND')).toBeInTheDocument()
  })

  it('renders a card per character', () => {
    renderGrid({ characters: [rick, { ...rick, id: 2, name: 'Morty Smith' }] })
    expect(screen.getByText('Rick Sanchez')).toBeInTheDocument()
    expect(screen.getByText('Morty Smith')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL — cannot resolve `./CharacterGrid`.

- [ ] **Step 3: Write the query hook**

Create `src/features/characters/useCharacters.ts`:

```ts
import { useQuery } from '@tanstack/react-query'
import { fetchCharacters } from '../../shared/api/client'
import type { CharacterFilters } from '../../shared/api/types'

export function useCharacters(filters: CharacterFilters) {
  return useQuery({
    // The filter object is the identity of this request, so it is the key.
    queryKey: ['characters', filters],
    queryFn: () => fetchCharacters(filters),
    // Show data enters as skeletons on first load only; subsequent pages
    // keep the previous result visible while the next one arrives.
    placeholderData: (previous) => previous,
    staleTime: 5 * 60 * 1000,
  })
}
```

- [ ] **Step 4: Write the grid**

Create `src/features/characters/CharacterGrid.tsx`:

```tsx
import { CharacterCard } from './CharacterCard'
import { Skeleton } from '../../shared/ui/Skeleton'
import { EmptyState } from '../../shared/ui/EmptyState'
import { ErrorState } from '../../shared/ui/ErrorState'
import type { Character } from '../../shared/api/types'

type CharacterGridProps = {
  characters: Character[]
  isPending: boolean
  isError: boolean
  onRetry: () => void
}

const GRID = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'
const SKELETON_COUNT = 20

export function CharacterGrid({
  characters,
  isPending,
  isError,
  onRetry,
}: CharacterGridProps) {
  if (isError) return <ErrorState onRetry={onRetry} />

  if (isPending) {
    return (
      <div className={GRID}>
        {Array.from({ length: SKELETON_COUNT }, (_, index) => (
          // The skeleton mirrors the card geometry exactly — a square image
          // above a fixed content block — so nothing shifts on swap.
          <div key={index} className="border border-line bg-surface">
            <Skeleton className="aspect-square w-full rounded-none" />
            <div className="space-y-2 p-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (characters.length === 0) return <EmptyState />

  return (
    <div className={GRID}>
      {characters.map((character) => (
        <CharacterCard key={character.id} character={character} />
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
npm test
```

Expected: PASS — 5 new tests passing.

- [ ] **Step 6: Commit**

```bash
git add src/features/characters/useCharacters.ts src/features/characters/CharacterGrid.tsx src/features/characters/CharacterGrid.test.tsx
git commit -m "feat: add the characters query hook and grid with geometry-matched skeletons"
```

---

## Task 21: The filter bar

**Files:**
- Create: `src/features/characters/CharacterFilters.tsx`
- Create: `src/features/characters/CharacterFilters.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/features/characters/CharacterFilters.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CharacterFilters } from './CharacterFilters'

function setup(overrides = {}) {
  const onChange = vi.fn()
  const onClear = vi.fn()
  render(
    <CharacterFilters
      filters={{ page: 1 }}
      onChange={onChange}
      onClear={onClear}
      {...overrides}
    />,
  )
  return { onChange, onClear }
}

describe('CharacterFilters', () => {
  it('emits the typed name', async () => {
    const { onChange } = setup()
    await userEvent.type(screen.getByLabelText('Search by name'), 'rick')
    expect(onChange).toHaveBeenLastCalledWith('name', 'rick')
  })

  it('shows the current name value', () => {
    setup({ filters: { page: 1, name: 'morty' } })
    expect(screen.getByLabelText('Search by name')).toHaveValue('morty')
  })

  it('emits the selected status', async () => {
    const { onChange } = setup()
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'dead')
    expect(onChange).toHaveBeenCalledWith('status', 'dead')
  })

  it('emits undefined when a select is reset to any', async () => {
    const { onChange } = setup({ filters: { page: 1, status: 'dead' } })
    await userEvent.selectOptions(screen.getByLabelText('Status'), '')
    expect(onChange).toHaveBeenCalledWith('status', undefined)
  })

  it('emits the selected gender', async () => {
    const { onChange } = setup()
    await userEvent.selectOptions(screen.getByLabelText('Gender'), 'female')
    expect(onChange).toHaveBeenCalledWith('gender', 'female')
  })

  it('hides the clear control when no filter is active', () => {
    setup()
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()
  })

  it('shows the clear control when a filter is active', () => {
    setup({ filters: { page: 1, status: 'alive' } })
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
  })

  it('emits a clear request', async () => {
    const { onClear } = setup({ filters: { page: 1, status: 'alive' } })
    await userEvent.click(screen.getByRole('button', { name: /clear/i }))
    expect(onClear).toHaveBeenCalledOnce()
  })

  it('does not treat page alone as an active filter', () => {
    setup({ filters: { page: 5 } })
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL — cannot resolve `./CharacterFilters`.

- [ ] **Step 3: Write the component**

Create `src/features/characters/CharacterFilters.tsx`:

```tsx
import type { CharacterFilters as Filters } from '../../shared/api/types'
import type { FilterKey } from '../../shared/hooks/useUrlFilters'

type CharacterFiltersProps = {
  filters: Filters
  onChange: (key: FilterKey, value: string | undefined) => void
  onClear: () => void
}

const STATUSES = ['alive', 'dead', 'unknown']
const GENDERS = ['female', 'male', 'genderless', 'unknown']

const FIELD =
  'border border-line bg-surface px-3 py-2 font-mono text-xs text-fg ' +
  'outline-none focus:border-accent'

const LABEL = 'font-mono text-xs text-muted'

export function CharacterFilters({
  filters,
  onChange,
  onClear,
}: CharacterFiltersProps) {
  // Page is navigation, not filtering — it must not light up the clear control.
  const hasActiveFilter = Boolean(
    filters.name || filters.status || filters.species || filters.gender,
  )

  return (
    <div className="flex flex-wrap items-end gap-4 border border-line bg-surface p-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="filter-name" className={LABEL}>
          Search by name
        </label>
        <input
          id="filter-name"
          type="text"
          value={filters.name ?? ''}
          placeholder="ENTER DESIGNATION"
          onChange={(event) =>
            onChange('name', event.target.value || undefined)
          }
          className={`${FIELD} w-56`}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="filter-status" className={LABEL}>
          Status
        </label>
        <select
          id="filter-status"
          value={filters.status ?? ''}
          onChange={(event) =>
            onChange('status', event.target.value || undefined)
          }
          className={FIELD}
        >
          <option value="">ANY</option>
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {value.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="filter-species" className={LABEL}>
          Species
        </label>
        <input
          id="filter-species"
          type="text"
          value={filters.species ?? ''}
          placeholder="ANY"
          onChange={(event) =>
            onChange('species', event.target.value || undefined)
          }
          className={`${FIELD} w-40`}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="filter-gender" className={LABEL}>
          Gender
        </label>
        <select
          id="filter-gender"
          value={filters.gender ?? ''}
          onChange={(event) =>
            onChange('gender', event.target.value || undefined)
          }
          className={FIELD}
        >
          <option value="">ANY</option>
          {GENDERS.map((value) => (
            <option key={value} value={value}>
              {value.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

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

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm test
```

Expected: PASS — 9 new tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/features/characters/CharacterFilters.tsx src/features/characters/CharacterFilters.test.tsx
git commit -m "feat: add the character filter bar bound to URL state"
```

---

## Task 22: Wire the page, the router, and the providers

**Files:**
- Create: `src/pages/CharactersPage.tsx`
- Create: `src/pages/NotFoundPage.tsx`
- Create: `src/app/routes.tsx`
- Modify: `src/app/App.tsx` (replacing `src/App.tsx`)
- Modify: `src/main.tsx`
- Create: `src/test/msw.ts`
- Create: `src/pages/CharactersPage.test.tsx`

- [ ] **Step 1: Write the failing integration test**

Create `src/test/msw.ts`:

```ts
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const BASE = 'https://api.test/api'

function character(id: number, name: string) {
  return {
    id,
    name,
    status: 'Alive',
    species: 'Human',
    type: '',
    gender: 'Male',
    image: `https://example.test/${id}.jpeg`,
    origin: { name: 'Earth (C-137)', id: 1 },
    location: { name: 'Citadel of Ricks', id: 3 },
    episodeCount: 51,
  }
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
]

export const server = setupServer(...handlers)
```

Create `src/pages/CharactersPage.test.tsx`:

```tsx
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server } from '../test/msw'
import { CharactersPage } from './CharactersPage'

beforeAll(() => {
  vi.stubEnv('VITE_API_BASE', 'https://api.test/api')
  server.listen({ onUnhandledRequest: 'error' })
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function renderPage(path = '/characters') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/characters" element={<CharactersPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CharactersPage', () => {
  it('loads and renders characters from the backend', async () => {
    renderPage()
    expect(await screen.findByText('Character Page 1')).toBeInTheDocument()
  })

  it('reports the total from the backend pagination block', async () => {
    renderPage()
    expect(await screen.findByText('DIMENSION 1 / 42')).toBeInTheDocument()
  })

  it('honours a page supplied in the URL', async () => {
    renderPage('/characters?page=7')
    expect(await screen.findByText('Character Page 7')).toBeInTheDocument()
  })

  it('advances the page when the next control is used', async () => {
    renderPage()
    await screen.findByText('Character Page 1')
    await userEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(await screen.findByText('Character Page 2')).toBeInTheDocument()
  })

  it('shows the empty state when a filter matches nothing', async () => {
    renderPage()
    await screen.findByText('Character Page 1')
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'dead')
    await waitFor(() =>
      expect(screen.getByText('NO RECORDS FOUND')).toBeInTheDocument(),
    )
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL — cannot resolve `./CharactersPage`.

- [ ] **Step 3: Write the page**

Create `src/pages/CharactersPage.tsx`. It composes only — no queries, no logic.

```tsx
import { useUrlFilters } from '../shared/hooks/useUrlFilters'
import { useCharacters } from '../features/characters/useCharacters'
import { CharacterFilters } from '../features/characters/CharacterFilters'
import { CharacterGrid } from '../features/characters/CharacterGrid'
import { Pagination } from '../shared/ui/Pagination'

export function CharactersPage() {
  const { filters, setFilter, clearFilters } = useUrlFilters()
  const { data, isPending, isError, refetch } = useCharacters(filters)

  return (
    <main className="mx-auto max-w-[1280px] space-y-6 px-6 py-10">
      <header className="space-y-1">
        <p className="font-mono text-xs text-muted">
          CITADEL ARCHIVE // CLEARANCE: UNRESTRICTED
        </p>
        <h1 className="text-fg text-3xl font-bold">Characters</h1>
      </header>

      <CharacterFilters
        filters={filters}
        onChange={setFilter}
        onClear={clearFilters}
      />

      <CharacterGrid
        characters={data?.items ?? []}
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

- [ ] **Step 4: Write the 404 page**

Create `src/pages/NotFoundPage.tsx`:

```tsx
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="mx-auto max-w-[1280px] px-6 py-24 text-center">
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
    </main>
  )
}
```

- [ ] **Step 5: Write the routes and providers**

Create `src/app/routes.tsx`:

```tsx
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { CharactersPage } from '../pages/CharactersPage'
import { NotFoundPage } from '../pages/NotFoundPage'

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/characters" replace /> },
  { path: '/characters', element: <CharactersPage /> },
  { path: '*', element: <NotFoundPage /> },
])
```

Delete `src/App.tsx` and create `src/app/App.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { router } from './routes'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
```

Replace `src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 6: Run the test to verify it passes**

```bash
npm test
```

Expected: PASS — 5 new tests passing, and the whole suite green.

- [ ] **Step 7: Verify the lint and the build**

```bash
npm run lint && npm run build
```

Expected: both exit 0.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: wire the characters page, router, and query provider"
```

---

## Task 23: Deploy and verify the slice

- [ ] **Step 1: Run the full test suite**

```bash
npm test && deno test --allow-env supabase/functions/api/tests/
```

Expected: both green.

- [ ] **Step 2: Deploy**

```bash
npx vercel --prod
```

- [ ] **Step 3: Verify against the live deployment**

Open the production URL and confirm each item:

- The character grid loads with real images and names
- Skeletons appear briefly on first load and match the card geometry
- Typing in the name filter narrows the results
- The URL updates as filters change
- Copying the URL into a new tab reproduces the same filtered view
- The browser back button steps through filter changes
- Pagination reports `DIMENSION 1 / 42` and advances
- Changing a filter resets the page to 1
- Selecting a status matching nothing shows `NO RECORDS FOUND`
- At least one card displays a redaction bar for an unknown origin
- Visiting an unknown path shows the 404 page

- [ ] **Step 4: Confirm the boundary holds in the shipped bundle**

```bash
grep -r "rickandmortyapi" dist/ || echo "CLEAN: no direct external API reference in the bundle"
```

Expected: `CLEAN` — proving the frontend reaches the external API only through the Edge Function.

- [ ] **Step 5: Commit any fixes and tag the milestone**

```bash
git add -A
git commit -m "chore: verify the deployed foundation slice"
git tag plan-1-foundation
```

---

## Verification against the spec

| Spec requirement | Task |
|---|---|
| §3.1 external calls server-side only | 7, 15, 23 |
| §3.3 search state in the URL | 14 |
| §5 technology stack | 1, 2 |
| §6.1 one-way layering | 6–11 |
| §6.2 `/api/characters` | 10, 11 |
| §6.3 cache with sorted keys and stale fallback | 8, 9 |
| §6.6 typed errors mapped to HTTP codes | 6, 11 |
| §7.1 routes for characters and 404 | 22 |
| §7.2 URL → Query → client → function data flow | 13, 14, 20 |
| §7.3 pages compose, features query, shared is generic | 22 |
| §7.5 pagination, page reset on filter change | 14, 18 |
| §9 dimension palettes as CSS variables | 3 |
| §11.1 three typefaces by role | 3 |
| §11.2 status indicator variants | 16 |
| §11.4 skeletons mirroring card geometry | 20 |
| §12.1 status not conveyed by color alone, alt text | 16, 17 |
| §12.2 lazy images with explicit dimensions | 17 |
| §12.3 tests at unit, component, and integration level | 4–22 |
| §12.4 boundary lint rule | 15 |
| §13 deployment of both halves, early | 12, 23 |

Deferred to later plans by design: §6.2 locations, episodes, search, ask, dossier, speak; §6.4 AI storage; §6.5 spend controls; §8 portal transitions; §9.3 dimension switch animation; §10 AI features; §11.3 the full detail catalog; §11.5 settings panel; §15 README.
