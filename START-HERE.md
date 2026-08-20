# Start Here

Handoff note for a fresh session. Last updated 2026-08-20, after **all five plans shipped in full**. Nothing is outstanding. No API key is needed and none is missing.

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
| `docs/superpowers/plans/2026-08-20-dossier-c137-polish.md` | Plan 5 of 5, complete. Twenty tasks: the four defects, the two prompts, the copy registry, the Konami egg, the contrast test, the mobile pass, the README |
| `docs/superpowers/plans/2026-08-20-walkthrough-notes.md` | The plan 3, 4 and 5 walkthrough, run against the live deployment |
| `README.md` | The graded document. Setup, architecture, trade-offs, known issues, screenshots |
| `docs/design/tokens.md` | Ten source colors expanded into three palettes, every pair contrast-checked. Plan 5 appended the corrections it made |
| `docs/design/visual-direction.md` | The direction, the rejected alternatives, and why each reference was weighted as it was |
| `design-brief/STEP-2-PROMPTS.md` | Per-screen layout descriptions, detailed enough to build from directly |

The approved Claude Design mockup lives outside the repository, at `Downloads/design-system-approved.html`. It is the visual reference for the whole site, and its palette and typefaces already match `src/index.css` exactly. Its empty-state copy differs from the shipped copy; the plan's wording won, because the tests assert it.


## Current state

**Plans 1–5 are complete, deployed, and tagged `plan-1-foundation`, `plan-2-entities`, `plan-3-portal`, `plan-4-ai` and `plan-5-polish`.** All commits are on `main` and pushed. The project is submittable as it stands.

| | |
|---|---|
| Frontend | https://dossier-c137.vercel.app |
| Backend | https://coeupddmmjnjotarlnwg.supabase.co/functions/v1/api |
| Repository | https://github.com/Ba5bit/dossier-c137 |
| Supabase project ref | `coeupddmmjnjotarlnwg` (region ap-northeast-2) |

| Suite | Count |
|---|---|
| Frontend (Vitest) | 272 |
| Backend (Deno) | 156 |

What exists, on top of everything plans 1–4 built (eleven endpoints, the Postgres cache, server-side relation expansion, the hub with live figures, the portal transition system, three dimensions, code-split routes, the API-boundary lint rule, `/api/search`, the write-once dossiers, the SSE-streamed grounded chat, the spend ceilings):

- **`README.md`**, the document the assignment grades. Setup from a clean clone, both environment tables, the server-side-API guarantee with the command that proves it, an architecture diagram, the endpoint table, four things done differently, six trade-offs, seven known issues, and five screenshots under `docs/screenshots/`
- **Every user-facing string lives in `src/shared/lore/copy.ts`**, which closes spec §7.3. `src/shared/lore/quotes.ts` stays where it is — a random data set, not microcopy. `src/features/ai/persona.ts` was merged in and deleted
- **The dossier quota counts generations, not views.** `getDossier` takes an `onGenerate` callback and runs it only on the miss path, so reading a stored dossier costs nothing. Verified live: first call `cached: false`, second `cached: true` in 0.8 s
- **`PROMPT_VERSION` is 2.** Both voices were sharpened — Rick opens by dismissing the question, Morty by hesitating — and both prompts forbid imitating the voice of an earlier turn, which was what pulled the two together. Verified live on "who is Birdperson?": the two answers now open completely differently
- **The search overlay takes the page out of the tab order and the accessibility tree** through `inert` on the page shell. That closed both the missing focus trap and the two inputs sharing the name "Search the archive" — the hub's is `Archive coordinates` now
- **`/search` explains a one-character query** instead of rendering skeletons forever, **prefills its box from the URL**, and drops its suggestion dropdown there: the full result groups are already below it
- **The contrast grid is a test.** `src/shared/design/contrast.test.ts` parses `src/index.css` and checks seven foreground tokens against three surfaces in three dimensions — 63 ratios, all at 4.5:1 or better. Three tokens genuinely failed and were lifted: `c-137 --dead`, and `cronenberg --accent`/`--accent-hover`/`--dead`
- **Every page works at 375 px**, verified in a real browser: nothing overflows, the header wraps, the filter bar becomes a 2×2 grid, the source cards wrap
- **The Konami easter egg.** Typing `wubbalubbadubdub` anywhere switches to `cronenberg` and persists
- **A portal favicon**, which had never existed — its absence was a 404 on every page load

The plan-3 walkthrough, unrun since plan 3, was finally run against the live deployment. Sixteen of eighteen checks pass; the two that cannot be checked headlessly — the 1.5 s portal quote and the interface whoosh — are covered by unit tests and named as such. Full results in `docs/superpowers/plans/2026-08-20-walkthrough-notes.md`.

## Immediate next step

**There isn't one.** All five plans are done and the project is submittable.

If more work is wanted, these are the honest candidates, none of them blocking:

| Candidate | Why it was not done |
|---|---|
| The boot sequence (spec §11.3) | A terminal typing `DOSSIER C-137 v1.37 // INITIALIZING…` on the first visit of a session. Never planned into any of the five plans; pure flourish |
| The remaining §11.3 details | The 42-characters caption, the Poopybutthole badge, the crosshair cursor on the hub, per-record document titles, the back-to-top portal |
| Speech | Cut deliberately, and the README says so. Reversing that decision means a second paid provider |
| The thirteen lint warnings | All `react-refresh/only-export-components`, all accepted by plans 2 and 4. Chasing them buys nothing |

## Open observations

**None.** Observations 1–8 were closed by plan 5, each with a test or a live verification behind it.

Observation 9 — the xAI key pasted into a session transcript on 2026-08-20 — is closed too. The user revoked that key and issued a new one, which is set as a Supabase secret and deployed: `POST /api/dossier` generated a fresh dossier against the live function on 2026-08-20, which it could not do with a revoked key. A revoked key in an old transcript is inert. Nothing in the repository ever held it.

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

- **Every user-facing string goes in `src/shared/lore/copy.ts`.** Plan 5 finished the move spec §7.3 asked for; an inline string in a component is now a regression, not a shortcut. `src/shared/lore/quotes.ts` is the one exception — a random data set, not microcopy
- **`shared/` knows nothing about specific entity types.** That is why `RosterGrid` lives in `features/characters/` even though the location and episode dossiers both use it
- **Context objects live in their own `.ts` files.** `SettingsContext.ts` and `PortalContext.ts` hold nothing but a `createContext` call, which keeps every `.tsx` file exporting components and only components
- **Every internal link in `features/` is a `PortalLink`, with `variant="short"`.** `src/shared/ui/DimensionNotFound.tsx` keeps a plain `Link` on purpose — a portal on the way out of a dead end is theatre
- **Every list page follows the same shape:** `useUrlFilters(KEYS) -> use<Entity>(filters) -> <Filters/> <Grid/> <Pagination/>`, with the page composing only
- **Every detail page follows the same shape too:** `useParams -> use<Entity>(id) -> DetailSkeleton while pending, DimensionNotFound on a `NOT_FOUND` code, ErrorState otherwise, the dossier when data lands`. The detail query hooks refuse to retry a 404
- **A 404 means two different things upstream**, and the client keeps them apart: `getList` normalizes it to an empty array because a filter matching nothing is routine, `getOne` raises `NotFoundError` because a missing record is real
- **Hooks degrade rather than throw outside their provider.** `useSettings` returns the defaults with an inert setter, and `usePortalNavigation` navigates plainly with no portal context. That is what lets the four entity-card test files render bare inside a `MemoryRouter` with no provider boilerplate. If a card test ever fails on a missing provider, fix the fallback, not the test

## The lint baseline

`npm run lint` exits 0 with **13 warnings and no errors**. Plan 5 added a second error-level rule beside the API boundary one: `no-restricted-imports` forbids `node:*` anywhere under `src/` except test files. Node types are on for the app project so `contrast.test.ts` can read `src/index.css` from disk — `?raw` returns an empty string under Vitest — and that rule is what stops a Node builtin from following them into the bundle. All thirteen are `react-refresh/only-export-components`:

- Three from the filter bars, each exporting its `*_FILTER_KEYS` constant beside its component. Plan 2 accepted these
- Ten from `src/app/routes.tsx`, one per `lazy()` binding, because the file also exports the non-component `router`. Plan 4 added two, for `/search` and `/ask`

None of them are worth chasing. What matters is that the count of **errors** stays at zero — treat a new error as a blocker, a new warning as noise.

## Still needed from the user

**Nothing.** `XAI_API_KEY` and `IP_HASH_SALT` are set as Supabase secrets and the function is deployed with them. They also live in `supabase/functions/.env`, which is gitignored and exists only for `supabase functions serve` and for re-running `secrets set --env-file`. No ElevenLabs key is needed — speech is cut.

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
