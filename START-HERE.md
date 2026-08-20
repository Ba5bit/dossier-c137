# Start Here

Handoff note for a fresh session. Last updated 2026-08-20, after plans 1–4 shipped in full. **Plan 5 has not been written yet** — writing it, then executing it, is the next step. No API key is outstanding.

## What this project is

**Dossier C-137** — a Rick and Morty archive browser, submitted as a course-entry test assignment. Characters, locations, and episodes, searchable and browsable, presented as an internal terminal of the Citadel of Ricks.

The assignment requires a public GitHub repository, a thorough README, and that **every external API is called from the server**. Bonus credit for a light/dark theme with persistence, an AI integration, and skeleton loading states. All are in scope.

## Read these, in order

| Document | What it settles |
|---|---|
| `docs/superpowers/specs/2026-08-19-dossier-c137-design.md` | The full design. Architecture, endpoints, component tree, error handling, deployment. Includes a requirements traceability table mapping every assignment requirement to a section |
| `docs/superpowers/plans/2026-08-20-dossier-c137-foundation.md` | Plan 1 of 5, complete. Twenty-three TDD tasks with complete code in every step |
| `docs/superpowers/plans/2026-08-20-dossier-c137-entities.md` | Plan 2 of 5, complete. Twenty TDD tasks: locations, episodes, and all three detail pages |
| `docs/superpowers/plans/2026-08-20-dossier-c137-portal.md` | Plan 3 of 5, complete. Twenty-two TDD tasks: `/api/stats`, the settings layer, the three dimensions, the portal transition system, the hub, and the real header |
| `docs/superpowers/plans/2026-08-20-dossier-c137-ai.md` | Plan 4 of 5, complete. Twenty-four TDD tasks: `/api/search`, `/api/dossier`, `/api/ask`, AI storage, spend ceilings, the search overlay and page, the hub input, the persona setting, the dossier block, and the grounded chat |
| `docs/design/tokens.md` | Ten source colors expanded into three palettes, every pair contrast-checked |
| `docs/design/visual-direction.md` | The direction, the rejected alternatives, and why each reference was weighted as it was |
| `design-brief/STEP-2-PROMPTS.md` | Per-screen layout descriptions, detailed enough to build from directly |

The approved Claude Design mockup lives outside the repository, at `Downloads/design-system-approved.html`. It is the visual reference for the whole site, and its palette and typefaces already match `src/index.css` exactly. Its empty-state copy differs from the shipped copy; the plan's wording won, because the tests assert it.

## Current state

**Plans 1–4 are complete, deployed, and tagged `plan-1-foundation`, `plan-2-entities`, `plan-3-portal`, and `plan-4-ai`.** All commits are on `main` and pushed.

| | |
|---|---|
| Frontend | https://dossier-c137.vercel.app |
| Backend | https://coeupddmmjnjotarlnwg.supabase.co/functions/v1/api |
| Repository | https://github.com/Ba5bit/dossier-c137 |
| Supabase project ref | `coeupddmmjnjotarlnwg` (region ap-northeast-2) |

| Suite | Count |
|---|---|
| Frontend (Vitest) | 252 |
| Backend (Deno) | 149 |

What exists:

- **Backend, eleven endpoints.** `router -> handler -> service -> client/cache`, one service per entity over a shared `services/refs.ts`, deployed with `--no-verify-jwt`. `/health`, `/characters`, `/characters/:id`, `/locations`, `/locations/:id`, `/episodes`, `/episodes/:id`, `/stats`, `/search`, `POST /dossier`, `POST /ask`
- **`/api/stats` aggregates five upstream `info.count` values** behind the single cache key `stats`, 24 h TTL. Nothing in it is hardcoded, which is what spec §6.2 asks for. Live figures: 826 characters, 126 locations, 51 episodes, 107 Ricks, 68 Mortys
- **Relation expansion is server-side.** A detail response arrives whole — the character dossier carries its origin, location, and every episode; a location carries its resident roster; an episode carries its cast. The frontend never fans out
- **Cache.** `cache_entries` migrated and live, 24 h TTL, stale-on-failure fallback. List keys sort their parameters; detail keys are `character/7`, `location/3`, `episode/5`; the stats aggregate is the bare key `stats`. RLS on with no policies
- **The hub is at `/`.** `HubPage` carries the resting portal gun, three destinations with live counts, and a five-figure statistics strip. The `Navigate` redirect from `/` to `/characters` is gone
- **The portal transition system.** `usePortalMachine` is the state machine — four phases, a 300 ms floor, an 8 s ceiling, a quote after 1.5 s. `PortalProvider` binds `traversing` to `useIsFetching`, so the traversal lasts exactly as long as the request. `PortalCanvas` draws the vortex; `PortalLink` routes navigation through it and degrades to an ordinary link when the portal is off or absent
- **Three dimensions.** `c-137` dark, `citadel` light, `cronenberg` dark, written to `data-dimension` on the document element and to one `localStorage` object under `citadel-settings`. An inline script in `index.html` applies the stored dimension before first paint, so a light-dimension visitor never sees a dark flash
- **The portal gun settings panel** carries four rows: dimension, `PORTAL SFX`, `PORTAL TRANSITIONS`, and a three-state `REDUCED MOTION`. It opens from the header mini gun and from the hub, closes on `Esc`, and returns focus to its trigger
- **Every route is code-split** through `React.lazy`, with a `DetailSkeleton` as the Suspense fallback. The build emits a chunk per page
- **The refresh bar** marks a background refetch without replacing content, and stays away on a first load, where skeletons already do the job
- **The boundary lint rule** fires on any `rickandmortyapi.com` reference in `src/`, and every emitted chunk is clean
- **`/api/search` is one cached aggregate.** Three parallel name queries against characters, locations and episodes behind the single key `search?q=<lowercased>`, 24 h TTL, twenty items per group. `q` must be 2–100 characters or the endpoint answers 400
- **`POST /api/dossier` is write-once.** A stored dossier is returned without touching the provider; a miss generates one, stores it and returns `cached: false`. The primary key is `(entity_type, entity_id, persona, prompt_version)`, so a reworded prompt writes new rows beside the old ones rather than destroying them — **bump `PROMPT_VERSION` in `lib/persona.ts`, never edit a stored row**. Characters only; any other `entityType` is a 400
- **`POST /api/ask` streams Server-Sent Events.** `sources` is emitted **first**, then a run of `token` frames. Everything that can produce an HTTP status — validation, the quota — happens before the `Response` is constructed; a failure after the first byte travels in-band as an `error` event, because the status is already sent
- **AI answers are grounded.** `services/ask.ts` searches the literal question first and only widens to extracted terms when that finds nothing, caps at six sources, and hands the model a `CONTEXT` block as its only permitted knowledge. When nothing matched, the context says `no records matched` rather than skipping the call. Verified live: "who is Gandalf the Grey?" returns empty sources and invents nobody
- **Two AI tables.** `ai_dossiers` and `ai_usage`, migrated and live, RLS on with no policies. `ai_usage_bump()` counts in the database so two concurrent requests cannot both read the same figure
- **Spend ceilings.** 30 `ask` calls and 10 `dossier` calls per caller per day, plus a global 500 under the reserved `ip_hash` `__global__`. Addresses are never stored — the key is a salted SHA-256 digest, salted from `IP_HASH_SALT`. A counter that cannot be written lets the request through rather than becoming an outage
- **A missing `XAI_API_KEY` does not take the archive down.** `index.ts` substitutes a stand-in client that raises `AiError`, so the three read sections keep working and only the AI endpoints answer 502
- **Search reaches the visitor three ways.** The `⌘K` / `Ctrl+K` overlay, the `⌕ SEARCH` button in the header, and the coordinate input on the hub — all the same `PortalSearch`, debounced 300 ms with a local draft, arrow keys and Enter, and an `ASK ▸` button. A bare name goes to `/search`; a question goes to `/ask`
- **The chat is at `/ask`, and it is stateless on the server.** The browser sends the last six turns with each question; nothing about a conversation reaches Postgres. Only dossiers are stored
- **The persona is a setting, not a per-message toggle.** `rick` or `morty`, in the same `citadel-settings` object as the dimension, switchable in the portal gun panel and in the chat header, and part of the dossier primary key
- **`.env.local`** holds real values and is gitignored. `.env.example` records the contract

Verified against the live deployment after plan 4, in a real browser: `Ctrl+K` opens the overlay, `rick` returns fifteen grouped results, arrow-plus-Enter fires the portal into the character page, `GENERATE DOSSIER` returns the stored text instantly, `/ask?q=…` asks once and renders four clickable source cards before the answer, the Morty voice survives a reload, and the Gandalf question refuses to invent. `grep` over `dist/assets` finds neither `rickandmortyapi` nor `xai-`.

Nine things were found and deliberately not fixed. They are listed with their evidence under **Open observations**, below the plan 5 agenda; four of them are confirmed defects.

## Immediate next step

**Write plan 5**, then execute it — inline in the session, using the superpowers `writing-plans` and `executing-plans` skills. Not subagent-driven: the user chose inline deliberately, because a fresh subagent per task re-reads the whole context and costs far more tokens than this project is worth.

Plan 5 owns, in this order. The **Open observations** section below carries the evidence for every row marked with a number.

| # | Item | What it covers |
|---|---|---|
| 1 | The README | The assignment grades it. Setup, architecture, the server-side-API guarantee, the bonus features, and an honest known-issues list: speech cut, Edge Function cold starts, the AI daily quotas, no SSR |
| 2 | Four confirmed defects | Observations 1–4 below. All small, all reproducible, all found during the plan 4 walkthrough |
| 3 | The microcopy move | Spec §7.3 wants every string in `src/shared/lore/copy.ts`. Plan 1 deliberately deferred it and every plan since has added inline copy. `src/shared/lore/quotes.ts` is a data file and stays where it is |
| 4 | The mobile pass | Narrow-window behaviour of the search overlay, the chat input, the source cards, the filter bars and the grids |
| 5 | The contrast pass | Muted text on `--surface-raised` in `citadel` and `cronenberg`, over the new chat and dossier surfaces |
| 6 | The persona prompt | Observation 6. Sharpen `askSystemPrompt`, and **bump `PROMPT_VERSION`** so stored dossiers survive |
| 7 | Accessibility | Observations 5 and 7 |
| 8 | The Konami easter egg | `shared/hooks/useKonami.ts` |
| 9 | The plan-3 walkthrough | Still unrun: the portal animation, the dimension repaint, the absence of a flash on reload, `prefers-reduced-motion`. Checklist is in plan 3, task 22, steps 4 and 5 |

## Open observations

Everything found during plan 4 that was **not** fixed inline, because it was imperfect rather than broken, or because fixing it needed a decision. Each one states how it was confirmed.

**1. A stored dossier still spends a day's allowance.** `handlers/dossier.ts` calls `quota.check` **before** `service.getDossier`, and the store read happens inside the service. So the 10-per-day dossier ceiling counts *views*, not *generations* — an eleventh visitor reading a dossier that was written last week is refused, having cost nothing. Confirmed by reading the handler. The fix is to move the quota behind the store lookup, which means the service has to tell the handler whether it is about to call the provider; the cleanest shape is for `getDossier` to take the quota and check it only on the miss path.

**2. `/search?q=<one character>` renders skeletons forever.** `useSearch` disables the query below two characters, and a disabled TanStack query reports `status: 'pending'`, so `SearchPage`'s `query.trim() !== '' && isPending` branch is true with nothing on the way. Confirmed live at `https://dossier-c137.vercel.app/search?q=r` — two `Loading` statuses and no explanation. The page should show the same "two characters minimum" line `PortalSearch` already uses.

**3. The `/search` input does not prefill from the URL.** Landing on `/search?q=rick` shows the results but an empty search box, so refining the query means retyping it. Confirmed in the same live check. `PortalSearch` needs an optional initial draft.

**4. The first `Ctrl+K` after a cold page load does nothing.** Reproduced once on the live site: the very first press right after navigation did not open the overlay, and the second did. Most likely the press landed before the lazy route chunk hydrated and `useSearchHotkey` attached its listener. Worth confirming and, if real, worth attaching the listener above the lazy boundary.

**5. The search overlay has no focus trap.** `SearchOverlay` sets `aria-modal="true"` and closes on `Escape`, but nothing stops `Tab` from walking into the page behind it. Confirmed by reading the component.

**6. The two voices barely differ in the chat.** In `/ask`, a narrow factual question produces near-identical prose from Rick and from Morty — confirmed live, asking "who is Birdperson?" in both voices. Two causes: the previous answer travels back as history and the model mirrors it, and `askSystemPrompt`'s "plain prose, under 120 words" pulls hard against characterisation. Morty's voice does come through when the archive has nothing — "Aw jeez, no records matched this question. Sorry." The dossiers, which have no history and a more evaluative instruction, are clearly distinct. **Any reword must bump `PROMPT_VERSION`**, or stored dossiers will silently disagree with the prompt that supposedly wrote them.

**7. Two elements share the label "Search the archive".** When the overlay opens over the hub, the hub's own coordinate input is still in the accessibility tree under the same name. Confirmed in a live accessibility snapshot.

**8. The `citadel` and `cronenberg` contrast check was not run** over the chat and the dossier block, and neither was the narrow-window pass. Both are in the plan 4 walkthrough as steps 10 and 11 and were deliberately left — they are visual judgement, and the mobile pass was already plan 5's scope.

**9. The xAI key was pasted into a session transcript on 2026-08-20 and should be treated as compromised.** It is still live. Rotate it at `console.x.ai`, put the new value in `supabase/functions/.env`, then re-run `secrets set --env-file` and the function deploy. Nothing in the repository holds it — the exposure is the transcript on disk.

**Nothing is needed from the user to start.** Both secrets are set and both deploys are done.

**Claude cannot run any `supabase` command** — the permission classifier blocks every invocation. If plan 5 touches the function or the database, each such command is a checkpoint where the user runs it with a `!` prefix.

Before touching anything, confirm the inherited state is green:

```bash
git status                # expect a clean tree on main
npm test                  # expect 252 passing
npm run test:api          # expect 149 passing
npm run lint && npm run build
```

All four were run and were green at the end of plan 4: 252 frontend, 149 backend, 0 lint errors with 13 warnings, build clean, tree clean on `main`. If a fresh session sees anything else, something changed outside these commits.

Run them one at a time. Chaining all four in a single command has produced one run where Vitest reported fifteen errors with the tests themselves executing in 191 ms — workers failing to start under load on this machine, not assertions failing. Re-running alone gave a clean pass twice. If you see that shape — a pile of errors and a suspiciously short test duration — re-run before believing it.

## Deploying

Vercel rebuilds on every push to `main`. The Edge Function does not:

```bash
npx supabase functions deploy api --no-verify-jwt
```

**Claude cannot run that command.** It is blocked by the auto-mode permission classifier, and it was blocked mid-plan-3 as well. Ask the user to run it themselves with a `!` prefix in the prompt. Plan for it: an endpoint written at task 2 and deployed at task 3 means one interruption, not one per task.

## Commands that are not obvious

```bash
npm test          # frontend, Vitest
npm run test:api  # backend, Deno - needs the --config flag baked into the script
npm run lint      # ESLint, replaces the template's oxlint
npm run build     # tsc -b && vite build
```

**`npm test` does not type-check.** Vitest transpiles without checking, so a type error in a test file surfaces only under `npm run build`. Two of them survived four tasks in plan 3 for exactly that reason. Run the build before believing a slice is done.

## Deviations from the plans as written, already made

From plans 1 and 2:

- **ESLint replaced oxlint.** `create-vite` now ships oxlint, but the boundary rule needs `no-restricted-syntax` with AST selectors, which oxlint lacks
- **`supabase/functions/deno.json` added.** Without it Deno resolved JSR imports through the frontend's `node_modules` and failed
- **`vite.config.ts` imports `defineConfig` from `vitest/config`.** Vitest 4 dropped the triple-slash augmentation the plan uses, and `tsc` rejected the `test` key
- **The project was renamed** from Citadel Archive to Dossier C-137, after the deploy. The `citadel` dimension token is unrelated and unchanged
- **`ApiError` declares `code` as a field, not a constructor parameter property.** `tsconfig` runs with `erasableSyntaxOnly`, which rejects the shorthand
- **`vercel.json` added** with a catch-all rewrite to `index.html`. Without it Vercel resolved `/characters` against the filesystem and returned its own 404
- **Text filters are debounced and hold a local draft.** Binding an input straight to the URL dropped keystrokes on the deployed build: typing `morty` produced `?name=moy`, because the router round trip is asynchronous. The commit delay is 300 ms, and external changes are still adopted. The component lives at `src/shared/ui/TextFilter.tsx`
- **`stubClient` in `characters_test.ts` gained two no-op methods** when plan 2 widened the `CharacterClient` contract

From plan 3, all five of them defects in the plan's test code rather than in its design:

- **Fake timers cannot cross a phase boundary in one `act()`.** Two tests — `usePortalMachine.test.tsx`'s "never raises a quote on a fast response" and `PortalProvider.test.tsx`'s "closes once nothing is fetching" — advanced the clock through several phases in a single call. React does not flush the state change that schedules the next phase's timer until the `act()` block exits, so the machine stalled one phase short. Both now advance one phase at a time, which is what the neighbouring tests in the same files already did
- **A Vitest 4 mock function is not constructible.** The `AudioContext` stub in `portalSound.test.ts` was `vi.fn(() => ({…}))`, and `new` on it throws, which the implementation caught and reported as "no audio API". It is a real class now, with a `vi.fn` inside its constructor so the call assertions are unchanged
- **The direct `userEvent` API does not carry held modifier keys between calls.** `portalNavigation.test.tsx`'s modified-click test held Meta with `userEvent.keyboard` and then clicked with `userEvent.click`, and the modifier was gone by the second call. It uses one `userEvent.setup()` session now
- **`HubPage.test.tsx` waited on a label that renders beside its skeleton.** `findByText('RICKS ON FILE')` resolved before any data landed, so the figure assertions that followed ran too early. It waits on the figure instead
- **`react-hooks/set-state-in-effect` rejected two components.** `PortalProvider` set its quote from an effect keyed on `showQuote`; it is a `useMemo` now. `DimensionWave` set `playing` from an effect keyed on the dimension; it uses the adjust-state-during-render pattern with a wave counter, so a second switch mid-wave still restarts the timer. Both were errors, not warnings, and `npm run lint` exited non-zero until they were fixed

And two type errors that only `tsc -b` caught, after the tests had been green for several tasks:

- **`src/app/prepaint.test.ts` read `index.html` with `node:fs`,** which needs `@types/node`. It imports `../../index.html?raw` through Vite instead — no new dependency
- **`PortalCanvas`'s null check did not narrow inside `render`.** The plan declared `render` with `function`, which hoists above the check, so TypeScript would not carry the narrowing of `context` into it. It is an arrow const now, declared after the check

From plan 4, all of them defects in the plan's test code rather than in its design:

- **Three test files did not stub `VITE_API_BASE`.** `PortalSearch.test.tsx` and `SearchOverlay.test.tsx` as written, and `AppLayout.test.tsx` once it began rendering `PortalSearch`. Without the stub the client reads the real URL out of `.env.local` and the request sails past MSW to the live function; every page test in the repo already does this in its `beforeAll`
- **`askStream.test.ts` did not type-check.** A `vi.fn` with no declared parameters records `mock.calls[0]` as an empty tuple, so the cast to `[string, RequestInit]` was rejected. It goes through `unknown`. `npm test` never caught it — only `npm run build` does
- **`SearchPage.test.tsx` asserted on `/107/`,** which matches both the group counter and the "ALL 107 CHARACTERS" link. Narrowed to `/107 ON FILE/`
- **The `ask` stub in `router_test.ts`'s `services()` helper** is placed by task 9, but the `ask` field only joins the `Services` type at task 11, so the file does not compile in between. Added at task 11 instead
- **Three existing `settings.test.ts` cases compare the whole settings object,** so adding `persona` broke them. Their fixtures and expectations gained the field
- **`frame()` in `router.ts` was written with real newlines** instead of `
` escapes. Inside a template literal the two are identical and the live stream was correct either way; normalized to the plan's form

## Conventions now established in the code

- **New UI copy stays inline**, in the same voice as plan 1. Spec §7.3 wants it all in `src/shared/lore/copy.ts`; plan 5 owns that move. `src/shared/lore/quotes.ts` is the one exception plan 3 created — it is a data file, not a microcopy registry
- **`shared/` knows nothing about specific entity types.** That is why `RosterGrid` lives in `features/characters/` even though the location and episode dossiers both use it
- **Context objects live in their own `.ts` files.** `SettingsContext.ts` and `PortalContext.ts` hold nothing but a `createContext` call, which keeps every `.tsx` file exporting components and only components
- **Every internal link in `features/` is a `PortalLink`, with `variant="short"`.** `src/shared/ui/DimensionNotFound.tsx` keeps a plain `Link` on purpose — a portal on the way out of a dead end is theatre
- **Every list page follows the same shape:** `useUrlFilters(KEYS) -> use<Entity>(filters) -> <Filters/> <Grid/> <Pagination/>`, with the page composing only
- **Every detail page follows the same shape too:** `useParams -> use<Entity>(id) -> DetailSkeleton while pending, DimensionNotFound on a `NOT_FOUND` code, ErrorState otherwise, the dossier when data lands`. The detail query hooks refuse to retry a 404
- **A 404 means two different things upstream**, and the client keeps them apart: `getList` normalizes it to an empty array because a filter matching nothing is routine, `getOne` raises `NotFoundError` because a missing record is real
- **Hooks degrade rather than throw outside their provider.** `useSettings` returns the defaults with an inert setter, and `usePortalNavigation` navigates plainly with no portal context. That is what lets the four entity-card test files render bare inside a `MemoryRouter` with no provider boilerplate. If a card test ever fails on a missing provider, fix the fallback, not the test

## The lint baseline

`npm run lint` exits 0 with **13 warnings and no errors**. All thirteen are `react-refresh/only-export-components`:

- Three from the filter bars, each exporting its `*_FILTER_KEYS` constant beside its component. Plan 2 accepted these
- Ten from `src/app/routes.tsx`, one per `lazy()` binding, because the file also exports the non-component `router`. Plan 4 added two, for `/search` and `/ask`

None of them are worth chasing. What matters is that the count of **errors** stays at zero — treat a new error as a blocker, a new warning as noise.

## Still needed from the user

**One thing, and it is not blocking: rotate the xAI key.** It was pasted into a session transcript on 2026-08-20 and is still live — observation 9. New key into `supabase/functions/.env`, then `secrets set --env-file` and a function deploy, both of which only the user can run.

Otherwise nothing. `XAI_API_KEY` and `IP_HASH_SALT` are set as Supabase secrets and the function is deployed with them. They also live in `supabase/functions/.env`, which is gitignored and exists only for `supabase functions serve` and for re-running `secrets set --env-file`. No ElevenLabs key is needed — speech is cut.

## Decisions already made — do not relitigate

**Stack.** React 19 + Vite + TypeScript, React Router v7, TanStack Query, Tailwind v4, Supabase Edge Functions on Deno, Supabase Postgres as the cache, Vercel for the frontend. Next.js was considered and rejected in favour of a stack the developer already knows.

**AI providers.** Grok for text, chosen over Gemini because tone is the point of the feature. **Speech is cut from the project** — no ElevenLabs, no `/api/speak`, no `ai_audio`, no Storage bucket, no §10.3. The AI bonus is carried by the grounded chat and the dossiers, which are the parts that show prompt and retrieval work; a second paid provider for a button nobody grades was not worth the failure modes. The README's known-issues section says so honestly.

**The persona is a setting, not a per-message toggle.** It persists in `citadel-settings`, it is switchable from two places, and it is part of the `ai_dossiers` primary key, so each character has one dossier per voice.

**The AI is a chatbot with a persona choice.** Rick or Morty, chosen by the visitor, persisted in `citadel-settings` beside the dimension and switchable both in the portal gun panel and in the chat header. It drives the system prompt and is part of the `ai_dossiers` primary key, so each character has one dossier per voice. The conversation itself is never persisted: the browser sends the last six turns with each question, and the server stays stateless.

**Themes are dimensions.** `c-137` dark by default, `citadel` light, `cronenberg` dark. One light and two dark satisfies the assignment's light/dark requirement literally while keeping the concept.

**The portal is the loader.** The transition animation is bound to `isPending` rather than to a fixed duration, with a 300 ms floor and an 8 second ceiling. Skeletons handle loading inside a section; the portal handles moving between sections.

**No Framer Motion.** Plan 3 decided this and shipped it: the state machine already owns every duration, the visual is a canvas rather than a tree of animated DOM nodes, and CSS keyframes on a `data-phase` attribute do the whole job with no 50 kB dependency and a far easier assertion. Do not reintroduce it.

**The hub reports locations, not distinct dimensions.** No upstream endpoint aggregates distinct dimension strings, and §6.2 forbids hardcoding a count.

**AI is grounded.** `/api/ask` retrieves real entities first and passes them as the only permitted source of facts, then shows the sources beneath the answer. An ungrounded LLM invents characters, and a reviewer catches that within a minute.

**Design system publishes from code.** Claude Design's `/design-sync` reads tokens and React components from the repository, not an exported mockup — so the code comes first. The command must be typed by the user; it cannot be run on their behalf.

## Three things that are easy to get wrong

**A stored dossier is permanent, so a reworded prompt must bump `PROMPT_VERSION`.** `prompt_version` is part of the `ai_dossiers` primary key precisely so that new wording writes new rows beside the old ones. Editing `lib/persona.ts` without bumping it leaves every stored dossier attributed to a prompt that no longer exists, and no new one is ever generated for a character that already has a row. This matters immediately: plan 5 is expected to reword `askSystemPrompt` — and while that particular function does not feed the dossier path, the constant is shared, so the bump is the safe move either way.

**Muted text must be validated against every surface, not just the background.** The original `--text-secondary` values passed on `--bg` and failed on `--surface-raised`, which is where muted text actually lives. Current values pass in the worst case. Any new colour needs the same treatment — and there are three dimensions to check now, not one. Cronenberg's muted-on-raised pair is the highest-risk of the nine.

**Half of all origins are `unknown`.** Ten of the twenty characters on page one. The redaction bar is a routine field state, not a rare flourish, and the grid has to stay readable when half its cards carry one.

## Working agreement

Conversation in Russian. Every committed artifact — specs, plans, README, code comments, UI copy — in English. The interface language is English.

Lead with a recommendation rather than a menu. Raise a concern once, then execute the full request.
