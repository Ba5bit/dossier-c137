# Dossier C-137 — Design Specification

**Date:** 2026-08-19
**Status:** Approved, ready for implementation planning
**Interface language:** English

---

## 1. Overview

A web application for searching and browsing characters, episodes, and locations from *Rick and Morty*.

The product metaphor: this is not "a website about the show" but an **internal terminal of the Citadel of Ricks archive**. The user is an archive operator, search is entering coordinates into a portal gun, moving between sections is a portal jump, switching themes is switching dimensions.

The metaphor operates at the level of presentation and microcopy. Navigation underneath stays conventional: tabs, filters, pagination, shareable URLs. This is a deliberate principle — see §3.2.

---

## 2. Goals

1. Satisfy every requirement of the assignment (levels 1–3 and bonus) in a verifiable way.
2. Ship a working deployment with a public link.
3. Build something that visibly demonstrates affection for the source material: lore details, microcopy, considered states.
4. Demonstrate engineering maturity: layered backend, caching, grounded AI, thorough state handling.
5. Deliver a desktop-first interface that adapts responsively down to mobile viewports.

---

## 3. Core Principles

### 3.1. All external calls happen server-side

The frontend **never** contacts `rickandmortyapi.com`, Grok, or ElevenLabs directly. The only external address the frontend knows is the URL of our Supabase Edge Function.

This is an explicit assignment requirement and a practical necessity: the Grok and ElevenLabs keys must not reach the browser bundle.

**Enforcement:** no occurrence of `rickandmortyapi.com` may appear anywhere under `src/`. A lint rule enforces this — see §12.4.

### 3.2. Conventional structure, localized wildness

Level 1 of the assignment asks for a "convenient interface" and a "logical component structure." Creative presentation must not undermine that.

The rule: **the layout is restrained and dense; expressiveness is concentrated in an explicitly enumerated set of places** — the portal transition, the boot screen, empty and error states, the `TERMINATED` stamp, and the easter eggs. Outside that list the interface behaves predictably.

Practical consequence: on a card at rest, only the status indicator animates. Everything else wakes on `:hover`. A grid of twenty cards must not flicker.

### 3.3. Search state lives in the URL

The search query, active filters, and page number are stored in `useSearchParams`, not in React state. Consequences: the browser back button works, a result set is shareable by link, and a page reload preserves context.

### 3.4. The transition animation *is* the loader

The portal transition does not play on top of a wait — it **is** the representation of the wait. See §8.

---

## 4. Requirements Traceability

| Requirement | How it is satisfied | Section |
|---|---|---|
| Public GitHub repository | Repository created public | §13 |
| README with all mandated sections | Section checklist | §15 |
| External APIs called server-side only | Edge Function as the sole egress point | §3.1, §6 |
| **L1.** Search page with a convenient interface | `/search` plus `<PortalSearch/>` on the hub and via `Cmd+K` | §7.1, §7.4 |
| **L1.** Logical component structure | Feature-based tree, strict layering, isolation | §7.3 |
| **L2.** Own backend over the external API | Edge Function `api` with service layers | §6 |
| **L2.** Routing between pages | React Router v7, eight routes | §7.1 |
| **L2.** Pagination for lists | `Pagination` component, state in the URL | §7.5 |
| **L3.** Deployment | Vercel (frontend) plus Supabase (functions) | §13 |
| **Bonus 1.** Light/dark theme with persistence | Three dimensions — one light, two dark — persisted to `localStorage` | §9 |
| **Bonus 2.** AI integration | Grok: character dossiers plus grounded search | §10 |
| **Bonus 3.** Loaders and skeletons | Skeletons on every list; the portal as transition loader | §8, §11.4 |

---

## 5. Technology Stack

| Layer | Choice | Rationale |
|---|---|---|
| Build | Vite + TypeScript | Fast dev loop, simple configuration |
| UI | React 19 | The developer's primary stack |
| Routing | React Router v7 | SPA standard; `useSearchParams` provides URL state |
| Data | TanStack Query | Caching, deduplication, `isPending` for skeletons, `isFetching` for background refresh |
| Styling | Tailwind + CSS custom properties | Themes become a swap of variables on `<html>` with no branching in components |
| Animation | ~~Framer Motion~~ + CSS/canvas | **As built: no animation library.** CSS keyframes driven by a `data-phase` attribute, and a canvas vortex. The state machine already owned every duration |
| Backend | Supabase Edge Functions (Deno) | Our own service; secrets stay server-side; one-command deploy |
| Storage | Supabase Postgres | Cache for external API responses, AI dossiers, quota accounting |
| Files | Supabase Storage | Cache for generated audio |
| Text AI | Grok (xAI API) | Credits already available; the model's tone suits the character far better than the alternatives |
| Speech | ~~ElevenLabs Voice Design~~ | **Not built.** Cut deliberately; see the README's known issues |
| Frontend hosting | Vercel | Free, deploys on push |

**Alternatives considered** (material for the README "trade-offs" section):

- **Next.js fullstack.** Would have given a single repository, a single deployment, SSR, and Suspense skeletons out of the box. Rejected in favor of Vite + Supabase, a stack the developer knows better — on a project with a fixed deadline, familiarity outweighs theoretical elegance.
- **Gemini instead of Grok.** A more generous free tier, but it smooths tone aggressively. For a feature whose entire point is a character's voice, that is disqualifying.
- **A separate NestJS backend.** Demonstrates layering more explicitly but adds a second deployment and a second runtime with no functional gain.

---

## 6. Backend

### 6.1. Structure

A single Edge Function `api` with an internal router. Layers flow strictly in one direction:

```
router  →  handler  →  service  →  client / cache
```

```
supabase/functions/api/
  index.ts              entry point, CORS, routing
  router.ts             maps method and path to a handler
  handlers/
    characters.ts       request parsing, validation, service call, response shaping
    locations.ts
    episodes.ts
    search.ts
    ask.ts
    dossier.ts
    speak.ts
  services/
    rickMorty.ts        domain logic: lists, details, relation expansion
    search.ts           aggregation across the three entity types
    ai.ts               context assembly, prompts, Grok invocation
    speech.ts           speech synthesis, Storage caching
  clients/
    rmClient.ts         HTTP client for rickandmortyapi.com — the only place that address appears
    grokClient.ts
    elevenLabsClient.ts
  lib/
    cache.ts            Postgres cache read/write
    rateLimit.ts        quotas for AI endpoints
    errors.ts           typed errors mapped to HTTP codes
    validate.ts         query parameter parsing and validation
  types.ts              response contracts, shared with the frontend
```

Layer responsibilities: a `handler` knows nothing about the external API's HTTP shape, a `service` knows nothing about `Request`/`Response`, a `client` knows nothing about the cache. Each layer is tested by substituting a stub for the layer below it.

### 6.2. Endpoints

All responses are JSON. Base path: `/api`.

#### `GET /api/characters`

Parameters: `page`, `name`, `status` (`alive|dead|unknown`), `species`, `gender` (`female|male|genderless|unknown`).

```jsonc
{
  "items": [ /* Character[] */ ],
  "pagination": { "page": 1, "pageCount": 42, "total": 826, "pageSize": 20 }
}
```

The numbers above are illustrative. `total` and `pageCount` come from the external API's `info` block and are **never hardcoded** — entity counts in the source change between seasons.

#### `GET /api/characters/:id`

Returns the character together with expanded relations, in a single frontend request:

```jsonc
{
  "character": { /* … */ },
  "origin":   { "id": 1, "name": "Earth (C-137)", "resolved": true },
  "location": { "id": 20, "name": "Earth (Replacement Dimension)", "resolved": true },
  "episodes": [ { "id": 1, "name": "Pilot", "episode": "S01E01" } ]
}
```

`resolved: false` means the entity has no ID in the external API (for example `origin: "unknown"`); the frontend renders it as non-clickable. This case is common and must be handled explicitly rather than by crashing.

Episode expansion uses the external API's batch endpoint (`/episode/1,2,3`) rather than N separate requests.

#### `GET /api/locations` · `GET /api/locations/:id`

Filters: `name`, `type`, `dimension`. The detail response includes the resident roster with names and statuses.

#### `GET /api/episodes` · `GET /api/episodes/:id`

Filters: `name`, `episode` (a code such as `S03`). The detail response includes the participating characters.

#### `GET /api/search?q=`

Aggregation: parallel queries against all three entity types by `name`, returning a grouped result.

```jsonc
{
  "query": "morty",
  "groups": {
    "characters": { "items": [ /* up to 20 */ ], "total": 116 },
    "locations":  { "items": [], "total": 0 },
    "episodes":   { "items": [], "total": 0 }
  }
}
```

An empty group is not an error. The external API answers `404` for an empty result set; the client normalizes that into an empty array.

#### `GET /api/stats`

Aggregate statistics for the hub: entity counts per type, page counts, and the number of characters named `Rick` and named `Morty`. Cached for 24 hours. Every value is derived from API responses; nothing is hardcoded.

#### `POST /api/dossier`

Body: `{ "entityType": "character", "entityId": 1 }`.

1. Look up `ai_dossiers` by `(entityType, entityId, promptVersion)`. On a hit, return immediately.
2. Assemble factual context from the entity's data.
3. Call Grok. Persist the result.
4. Return the text.

A dossier is generated once per entity. Subsequent views are instant and free.

#### `POST /api/ask` — grounded search

Body: `{ "q": "who is Birdperson?" }`. The response is an SSE stream.

1. Validate: `q` between 3 and 300 characters.
2. Check the quota (§6.5).
3. **Retrieval:** call `search.ts` with `q` and with proper nouns extracted from the question. Select up to six most relevant entities.
4. **Grounding:** serialize those entities to JSON and place them in the prompt as the only permissible source of facts.
5. Call Grok with streaming. The system prompt requires answering strictly from context and saying so plainly when the context does not contain the answer.
6. Stream `token` events; a final `sources` event carries the IDs and types of the entities used.

The frontend renders the stream and, beneath it, clickable cards for the sources.

**Why this matters:** without grounding, the model confidently invents characters and episodes, and a reviewer catches that within a minute of a demo. With grounding, the LLM becomes a presentation layer over verified data rather than a source of facts.

#### `POST /api/speak`

Body: `{ "entityType": "character", "entityId": 1 }`.

1. Check `ai_audio`. On a hit, return a signed Storage URL.
2. Otherwise take the dossier text (generating it if necessary), call ElevenLabs, store the mp3 in Storage, insert a row into `ai_audio`, return the URL.

The voice is created once via Voice Design from a text description and pinned as a `voice_id` in the environment.

### 6.3. Caching

```sql
create table cache_entries (
  key        text primary key,
  payload    jsonb       not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index cache_entries_expires_at_idx on cache_entries (expires_at);
```

The cache key is a normalized path with sorted parameters: `characters?gender=male&page=2&status=alive`. Sorting is mandatory — without it, the same logical query with reordered parameters produces two entries.

TTL is 24 hours, justified by the fact that show data is static between season releases.

Miss strategy: fetch from the external API, write to the cache, return. If the external API is unreachable and an **expired** entry exists, serve it with an `X-Cache: stale` header. Stale data beats an empty screen.

### 6.4. AI Artifact Storage

```sql
create table ai_dossiers (
  entity_type    text not null,
  entity_id      int  not null,
  text           text not null,
  model          text not null,
  prompt_version int  not null default 1,
  created_at     timestamptz not null default now(),
  primary key (entity_type, entity_id, prompt_version)
);

create table ai_audio (
  entity_type  text not null,
  entity_id    int  not null,
  voice_id     text not null,
  storage_path text not null,
  duration_ms  int,
  created_at   timestamptz not null default now(),
  primary key (entity_type, entity_id, voice_id)
);
```

Including `prompt_version` in the primary key allows the prompt to change and dossiers to be regenerated without destroying prior output.

**Access.** RLS is enabled on every table with no policies defined, which denies the anonymous key entirely. Reads and writes happen only inside the Edge Function under the service-role key. The client uses the anonymous key solely to invoke the function.

### 6.5. Spend Control

The AI endpoints (`/api/ask`, `/api/dossier`, `/api/speak`) cost money and are publicly reachable. Without a quota, a single script drains it.

```sql
create table ai_usage (
  ip_hash text not null,
  day     date not null,
  count   int  not null default 0,
  primary key (ip_hash, day)
);
```

IP addresses are hashed with a salt; raw addresses are never stored. Quotas: 30 `/api/ask` calls and 10 `/api/speak` calls per IP per day. On exceedance the API returns `429`, and the interface renders a human message styled as a portal-gun malfunction.

A global daily ceiling for the whole application backs this up, so distributed traffic cannot produce unbounded spend.

### 6.6. Error Handling

Typed errors in `errors.ts` map to HTTP codes:

| Situation | Code | Frontend behavior |
|---|---|---|
| Empty result from the external API | `200` with empty array | Empty state |
| Unknown ID | `404` | "Dimension not found" page |
| Malformed parameter | `400` | Reset the filter, show a toast |
| External API down, stale cache available | `200` with `X-Cache: stale` | Unobtrusive "data may be outdated" notice |
| External API down, no cache | `503` | Error state with retry |
| AI quota exceeded | `429` | Quota-exhausted message |
| AI provider failure | `502` | Error confined to the AI block; the rest of the page still works |

Error shape is uniform: `{ "error": { "code": "RATE_LIMITED", "message": "…" } }`.

**AI isolation:** a Grok or ElevenLabs failure must not break the page. The dossier and speech features are independent blocks with their own loading and error states.

---

## 7. Frontend

### 7.1. Routes

| Path | Purpose |
|---|---|
| `/` | Portal hub: the gun, the coordinate input, archive statistics |
| `/search?q=&type=` | Search page: grouped results plus the AI answer block |
| `/characters?page=&name=&status=&species=&gender=` | Character list |
| `/characters/:id` | Character dossier |
| `/locations?page=&name=&type=&dimension=` | Location list |
| `/locations/:id` | Location dossier |
| `/episodes?page=&name=&episode=` | Episode list |
| `/episodes/:id` | Episode dossier |
| `*` | 404 — "This dimension doesn't exist" |

### 7.2. Data Flow

```
User
   ↓ action
URL (useSearchParams)          ← single source of truth for search state
   ↓
TanStack Query (key = URL)     ← cache, deduplication, states
   ↓
apiClient (shared/api)         ← knows only our backend
   ↓
Supabase Edge Function
   ↓
Postgres cache → rickandmortyapi.com / Grok / ElevenLabs
```

### 7.3. Component Tree

```
src/
  app/
    App.tsx                    providers: Query, Router, Dimension, Settings
    routes.tsx                 route configuration
  pages/
    HubPage.tsx                hub composition
    SearchPage.tsx
    CharactersPage.tsx
    CharacterDetailPage.tsx
    LocationsPage.tsx
    LocationDetailPage.tsx
    EpisodesPage.tsx
    EpisodeDetailPage.tsx
    NotFoundPage.tsx
  features/
    search/
      PortalSearch.tsx         the input; serves as both hero and overlay
      SearchOverlay.tsx        Cmd+K wrapper
      ResultGroup.tsx          one entity type's result group
      AskRick.tsx              streaming AI answer block
      SourceCards.tsx          grounding sources beneath the answer
      useSearchQuery.ts
      useAskStream.ts
    characters/
      CharacterGrid.tsx
      CharacterCard.tsx
      CharacterFilters.tsx
      CharacterDossier.tsx
      StatusIndicator.tsx
      useCharacters.ts
      useCharacter.ts
    locations/  …same shape
    episodes/   …same shape
    ai/
      DossierPanel.tsx         AI description generation and display
      SpeakButton.tsx          speech: idle/loading/playing/error
  shared/
    api/
      client.ts                the only place holding the backend URL
      types.ts                 contracts shared with the backend
    ui/
      Button.tsx  Chip.tsx  Badge.tsx  Skeleton.tsx
      Pagination.tsx  EmptyState.tsx  ErrorState.tsx  Stamp.tsx
    portal/
      PortalTransition.tsx     transition state machine
      PortalGun.tsx            interactive gun on the hub
      PortalCanvas.tsx         vortex rendering
      usePortalNavigation.ts
    settings/
      SettingsProvider.tsx     dimension, audio, transitions, motion
      SettingsPanel.tsx        the "Portal Gun Settings" panel
      useSettings.ts
    lore/
      quotes.ts                loading-screen lines
      copy.ts                  all microcopy in one place
    hooks/
      useUrlFilters.ts         read and write filters in the URL
      useKonami.ts             the wubbalubbadubdub easter egg
```

**Separation rule.** `pages/` only compose — no queries and no logic. Queries live in hooks inside `features/`. `shared/` knows nothing about specific entity types.

**Size rule.** A component file exceeding roughly 150 lines is a signal to split, not a license to continue.

**All user-facing text lives in `shared/lore/copy.ts`.** No copy strings in component markup. The voice in this project is strong and specific; keeping it consistent is only possible with the text collected in one place.

### 7.4. Search

`<PortalSearch/>` is one component appearing in two places:

1. **Hub hero.** A large input beside the portal gun.
2. **Overlay.** Opened with `Cmd+K` / `Ctrl+K` or by clicking the mini-gun in the header. Available from every page.

Behavior is identical in both:

- Fewer than 2 characters: a hint, no request.
- After a 300 ms debounce the query hits `/api/search`. Instant results appear below the input, grouped by type, up to 5 per group.
- `Enter` navigates to `/search?q=…` with the full result set.
- An `ASK RICK` button — or input recognized as a question, meaning it ends in `?` or opens with an interrogative word — routes to `/api/ask`.
- Arrow keys move through results, `Enter` navigates, `Esc` closes the overlay.

The `/search` page shows all three result groups with independent pagination inside each, plus the AI answer block above them when the query was submitted as a question.

### 7.5. Pagination

The `<Pagination/>` component, with state in the `page` URL parameter.

- Display: `DIMENSION 3 / 42`, with `← JUMP` and `JUMP →` controls.
- Direct jump to a page number through an input.
- The corresponding control is disabled on the first and last page.
- Changing pages does **not** trigger a portal transition; within a section, skeletons handle loading.
- The total page count comes from the backend response and is never computed client-side.
- Changing a filter resets `page` to 1.

---

## 8. Portal Transition System

### 8.1. Principle

A transition between sections is not a fixed-duration animation layered over a wait. The duration of the "in the portal" phase equals the duration of the request.

### 8.2. State Machine

```
idle
  ↓ user selects a section
firing        400 ms, fixed — the shot, the portal opens
  ↓ the TanStack Query request starts in parallel
traversing    lasts while isPending; minimum 300 ms
  ↓ data arrives
collapsing    350 ms — the portal closes over already-rendered content
  ↓
idle
```

**The 300 ms floor on `traversing` is mandatory.** Without it, a 20 ms cache hit produces a jarring single-frame flash — worse than having no animation at all.

**An 8-second ceiling applies.** If the request outlives it, the portal collapses and an error state appears. An endlessly spinning vortex reads as a frozen application.

If a request exceeds 1.5 s, a random line from `shared/lore/quotes.ts` fades in beneath the vortex. The threshold exists so that fast responses never flash text.

### 8.3. Scope

| Event | Transition |
|---|---|
| Hub → section | Portal |
| Section → another section | Portal |
| List → detail page | Portal, shortened (`firing` 250 ms) |
| Pagination page change | Skeletons |
| Filter applied | Skeletons |
| Following a relation link in a dossier | Portal, shortened |
| Browser back navigation | None |

Disabling the transition on back navigation is deliberate: an animation on return reads as latency, not as an effect.

### 8.4. Opt-Out

The portal does not play when `REDUCED MOTION` is on, when the `PORTAL TRANSITIONS` toggle is off, or when the system reports `prefers-reduced-motion: reduce`. In those cases navigation is immediate and loading is represented by skeletons.

### 8.5. Implementation

`PortalCanvas` draws the vortex on a `<canvas>`, reproducing five properties of the reference image (`design/references/show/portal-reference.png`):

1. **Concentric bands, not a gradient.** Six to eight alternating light and dark green layers of uneven width, following the outline. A smooth radial gradient yields a neon doughnut and must be avoided.
2. **An irregular outline.** Low-frequency noise applied to the radius produces soft lobes. The irregularity is what reads as a portal; a clean circle reads as a ring.
3. **A separate core vortex.** Spiral arms in the center, lighter and yellower than the bands, rotating **faster** than the outer layers. The differential rate conveys depth.
4. **Rim sparks.** Eight to ten white specular points of varying size on and just inside the rim, flaring and fading independently.
5. **Core grit.** A scattering of small brown flecks near the center, preserving the hand-painted quality.

Opening is a rapid scale-up with slight overshoot; the portal does not change shape as it opens, and the edge churns continuously throughout every phase.

Constraint: the `requestAnimationFrame` loop halts when the tab is hidden (`visibilitychange`). Framer Motion handles the wrapper and timings.

---

## 9. Dimensions as Themes

### 9.1. The Set

| Dimension | Scheme | Role |
|---|---|---|
| `c-137` | Dark | Default. Acid-green portal accent |
| `citadel` | **Light** | Sterile blue-white high-tech |
| `cronenberg` | Dark | Crimson, an easter egg |

The bonus requirement for light/dark switching is satisfied by the explicit presence of one light and two dark schemes.

### 9.2. Implementation

A `data-dimension` attribute on `<html>`. Each dimension redefines a set of CSS custom properties: background, surface, border, accent, primary and secondary text, and the semantic `alive` / `dead` / `unknown` colors.

Tailwind is configured against those variables, so switching themes requires no conditional logic in components.

The value persists to `localStorage` under the key `citadel-settings` alongside the other settings. It is applied **before first paint** by an inline script in `index.html` — otherwise a user on the light theme sees a dark flash on load.

### 9.3. Dimension Switch Transition

Switching dimensions plays a short recolor wave (~250 ms, `clip-path`) radiating from the settings panel. It respects `REDUCED MOTION`.

---

## 10. AI Features

### 10.1. Character Dossier

A `GENERATE DOSSIER` button on the detail page calls `/api/dossier`, shows a text skeleton, then the result.

The prompt supplies factual context from the character's data — name, status, species, origin, location, episode count — and requires a tone of cynical sarcasm in character, a length of three to four sentences, and no facts outside the context.

A `*burp*` marker in the response renders with its own styling rather than as plain text.

The result is stored permanently. The first visitor waits; everyone after gets it instantly.

### 10.2. Grounded Search

Specified in §6.2 (`/api/ask`). On the frontend:

- `useAskStream.ts` reads the SSE stream and accumulates tokens.
- `AskRick.tsx` renders a blinking cursor while streaming.
- `SourceCards.tsx` renders the sources after the final event.
- A provider failure does not affect the ordinary search results, which remain on screen.

### 10.3. Speech

`SpeakButton` sits beside the dossier. States: `idle` → `generating` → `playing` → `idle`, plus `error`.

The voice is synthesized through Voice Design from a text description — "an elderly cynical scientist, raspy, clipped rhythm" — rather than cloned. The `voice_id` is pinned in the environment.

Audio is cached in Supabase Storage; pressing the button again plays the stored file without contacting the provider.

The button stays disabled until a dossier exists — there is nothing to narrate otherwise. Narration is offered on character dossiers only.

---

## 11. Design System and Details

### 11.1. Typography

| Role | Typeface | Usage |
|---|---|---|
| Display | The show's logo typeface | Logo and `h1` only. Large, rare |
| Interface | Space Grotesk | All body text: cards, filters, buttons, descriptions |
| Monospace | JetBrains Mono | IDs, coordinates, page numbers, episode codes, statuses |

The display face is a display face: unreadable at small sizes. Use outside headings is prohibited.

### 11.2. Status Indicators

| Status | Rendering |
|---|---|
| `Alive` | Pulsing green dot at a heartbeat rhythm |
| `Dead` | Flat red line — a flatline |
| `unknown` | A dot with interference, trembling irregularly |

This is the only animation that runs on a card at rest.

### 11.3. Detail Catalog

**Cards**
- Dead characters render desaturated with a fracture in the card corner
- On `:hover`, a micro-glitch with chromatic aberration
- IDs set in monospace: `REGISTRY #001 · C-137`

**Dossiers (detail pages)**
- Header stamp: `DOSSIER C-137 // CLEARANCE: UNRESTRICTED`
- A dead character receives a red `TERMINATED` stamp over the photo, rotated −12°
- `origin: unknown` renders as a line struck through by a redaction bar
- An episode's character list is labeled `PERSONNEL PRESENT`
- A location's residents are labeled `REGISTERED RESIDENTS`

**Empty and Error States**
- No results: `Oooh, nothing here! Existence is pain!`
- 404: `This dimension doesn't exist. Try one where you're less of an idiot.`
- Network failure: `The portal fluid is out. Blame Jerry.`
- AI quota exhausted: a portal gun overheat malfunction

**Hub Statistics**
- `N ENTITIES INDEXED · M DIMENSIONS · K EPISODES`, sourced from `/api/stats`, never hardcoded
- A separate counter for the number of Ricks and Mortys on file
- If the character page count happens to equal 42, highlight it with a dedicated caption. This must be conditional: entity counts in the source change, so the joke cannot be baked into the markup

**Filters**
- The `species: Poopybutthole` value gets its own badge — the only one of its kind in the data

**Easter Eggs**
- Typing `wubbalubbadubdub` anywhere switches the dimension to `cronenberg`
- A portal favicon
- A crosshair cursor on the hub page
- Document titles of the form `Morty Smith — Dossier C-137`
- A back-to-top control shaped as a miniature portal
- The AI input placeholder: `Ask Rick. He won't be nice about it.`

**Boot Sequence**
- On the first visit of a session, a terminal types `DOSSIER C-137 v1.37 // INITIALIZING…` before the hub assembles
- Skippable by click, disabled by the transitions toggle, never plays under `REDUCED MOTION`
- The flag lives in `sessionStorage`, not `localStorage`: someone demoing the project must be able to replay the effect in a new tab

**Interface Audio**
- A whoosh on portal transitions
- **Off by default.** Toggled in the settings panel and duplicated on the hub
- This governs interface sound effects only. Dossier narration (§10.3) is unaffected: it plays only on an explicit button press, which is itself the user's consent

### 11.4. Loading States

- **Skeletons mirror the geometry of the real cards**: same dimensions, same spacing, same line count. A skeleton of a different shape causes a layout jump on swap.
- No spinners.
- Skeletons appear on lists, detail pages, and the dossier block.
- Background refresh (`isFetching` with data already present) shows a thin progress bar at the top without replacing content.

### 11.5. Settings Panel

The `SettingsPanel` component is styled as the portal gun's housing. It opens from the mini-gun in the header and is duplicated as a prominent control on the hub.

```
PORTAL GUN SETTINGS
  DIMENSION            ● C-137  ○ Citadel  ○ Cronenberg-1
  PORTAL SFX           [ OFF ]      ← default
  PORTAL TRANSITIONS   [ ON  ]
  REDUCED MOTION       [ AUTO ]
```

`PORTAL SFX` controls interface sound effects only — it does not mute dossier narration, which is user-initiated per press.

`REDUCED MOTION: AUTO` reads the system preference and allows manual override. Everything persists as a single object in `localStorage` under `citadel-settings`.

---

## 12. Quality

### 12.1. Accessibility

- Portal transitions and all decorative animation disable under `prefers-reduced-motion`.
- The search overlay traps focus, closes on `Esc`, supports arrow navigation, and returns focus to its trigger.
- Character status is conveyed by more than color — a text label sits alongside the indicator.
- Character images carry meaningful `alt` text.
- Text contrast is verified in all three dimensions. The `cronenberg` scheme is the highest risk.
- Pagination and filters are fully keyboard operable.

### 12.2. Performance

- Character images use `loading="lazy"` with explicit `width`/`height` to prevent layout shift.
- `PortalCanvas` halts its render loop when the tab is hidden.
- Routes are code-split via `React.lazy`.
- Backend responses carry cache headers that complement the server-side cache.

### 12.3. Testing

| Level | Tool | Coverage |
|---|---|---|
| Unit (backend) | Deno test | `services/*` against a stubbed client: filter parsing, cache keys, relation expansion, AI context assembly |
| Unit (frontend) | Vitest | `useUrlFilters`, the portal state machine, `SettingsProvider` |
| Component | React Testing Library | `CharacterCard` in every status, `Pagination` at boundaries, `EmptyState`, `ErrorState` |
| Integration | Vitest + MSW | List flow: load → filter → paginate |
| Smoke | Manual checklist before submission | Every route, all three dimensions, both audio states |

Testing effort concentrates on branching logic — filter parsing, cache keys, the portal state machine, `resolved: false` handling. Exhaustive markup assertions are not worth writing.

### 12.4. Boundary Enforcement

A lint rule forbids the string `rickandmortyapi.com` anywhere under `src/`. The only permitted location is `supabase/functions/api/clients/rmClient.ts`.

This turns the assignment's central requirement into something automatically verified rather than a matter of trust.

---

## 13. Deployment and Environment

### 13.1. Sequencing

**The deployment goes up at the start of the work, not at the end.** An empty application on Vercel plus a responding Edge Function is the foundation. A deferred deployment becomes CORS and environment-variable debugging under deadline pressure.

### 13.2. Topology

| Component | Platform | Publishing |
|---|---|---|
| Frontend | Vercel | Auto-deploy on push to `main` |
| Backend | Supabase Edge Functions | `supabase functions deploy api` |
| Database | Supabase Postgres | Migrations in `supabase/migrations/` |
| Audio | Supabase Storage | Private bucket, signed URLs |

### 13.3. Environment Variables

**Frontend (Vercel):** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE`.

**Backend (Supabase secrets):** `RM_API_BASE`, `XAI_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `IP_HASH_SALT`, `SUPABASE_SERVICE_ROLE_KEY`.

No provider key ever appears in a `VITE_`-prefixed variable — anything with that prefix ends up in the browser bundle.

### 13.4. CORS

The Edge Function answers `OPTIONS` and allows the Vercel domain, `localhost` for development, and Vercel preview domains. A wildcard origin is not used.

---

## 14. Risks and Trade-offs

| Risk | Mitigation |
|---|---|
| Edge Function cold start of 200–500 ms | The portal transition absorbs the latency; the cache accelerates repeat requests |
| External API unavailable | Serve stale cache with a notice rather than an error |
| LLM fabricating facts | Grounding: answers constrained to supplied context, with sources shown to the user |
| AI quota drain | Per-IP limits, a global daily ceiling, permanent dossier caching |
| An interface overloaded with detail | Only status animates at rest; expressiveness confined to the list in §3.2 |
| Poor legibility of the display typeface | Restricted to the logo and `h1` |
| Two deployments instead of one | Accepted deliberately; offset by stack familiarity |
| Portal transitions becoming tiresome during heavy navigation | An off toggle; never applied to pagination, filters, or back navigation |
| The dark `cronenberg` scheme failing contrast | Contrast verification is an explicit checklist item in §12.1 |

**Trade-offs to document in the README:**

1. **Vite + Supabase instead of Next.js.** Gave up SSR, a unified deployment, and out-of-the-box Suspense skeletons. Gained a familiar stack and Postgres as a natural cache layer.
2. **SPA without SSR.** SEO is irrelevant for this project; first paint is marginally slower.
3. **Synthesized voice instead of a cloned one.** Less resemblance to the original, but licensing-clean and workable on the free tier.
4. **Postgres cache instead of Redis.** Slower, but avoids another service; with static data the difference is immaterial.

---

## 15. README

Written in English. Mandatory sections per the assignment:

1. **Project description** — what it is, a link to the live deployment, screenshots.
2. **Installation and running** — local development, environment variables, migrations, running functions.
3. **Design and development process** — from requirements through brainstorming to specification, linking to this document.
4. **Unique approaches** — the portal as a loading indicator; grounded AI rather than a bare LLM call; themes as dimensions; the lint rule enforcing the server-side-only boundary.
5. **Trade-offs** — §14.
6. **Known issues** — cold starts, absence of SSR, AI quotas, speech limited to characters, plus whatever surfaces during development.
7. **Stack rationale** — §5 with its alternatives table.

The known-issues section gets filled in honestly. An empty one reads worse than a list of real limitations.

---

## 16. Implementation Order

1. Project scaffold, Supabase setup, **a working deployment of both halves**
2. Backend: router, `rmClient`, cache, the three list endpoints, `/api/stats`
3. Design tokens and shared components in code, then `/design-sync` to publish the system
4. List sections: grid, filters, pagination, skeletons
5. Detail pages with relations
6. Settings panel and the three dimensions
7. Portal transition system and the boot screen
8. Search: `PortalSearch`, the overlay, `/search`
9. AI: dossiers, grounded `/api/ask`
10. Speech
11. The detail and microcopy layer
12. Responsive adaptation for mobile
13. Tests
14. README
15. Smoke pass against the checklist

Step 1 is not deferred under any circumstances.
