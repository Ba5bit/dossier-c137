# Start Here

Handoff note for a fresh session. Last updated 2026-08-20, after plans 1 and 2 shipped in full. Plan 3 has not been written yet.

## What this project is

**Dossier C-137** — a Rick and Morty archive browser, submitted as a course-entry test assignment. Characters, locations, and episodes, searchable and browsable, presented as an internal terminal of the Citadel of Ricks.

The assignment requires a public GitHub repository, a thorough README, and that **every external API is called from the server**. Bonus credit for a light/dark theme with persistence, an AI integration, and skeleton loading states. All are in scope.

## Read these, in order

| Document | What it settles |
|---|---|
| `docs/superpowers/specs/2026-08-19-dossier-c137-design.md` | The full design. Architecture, endpoints, component tree, error handling, deployment. Includes a requirements traceability table mapping every assignment requirement to a section |
| `docs/superpowers/plans/2026-08-20-dossier-c137-foundation.md` | Plan 1 of 5, complete. Twenty-three TDD tasks with complete code in every step |
| `docs/superpowers/plans/2026-08-20-dossier-c137-entities.md` | Plan 2 of 5, complete. Twenty TDD tasks: locations, episodes, and all three detail pages |
| `docs/design/tokens.md` | Ten source colors expanded into three palettes, every pair contrast-checked |
| `docs/design/visual-direction.md` | The direction, the rejected alternatives, and why each reference was weighted as it was |
| `design-brief/STEP-2-PROMPTS.md` | Per-screen layout descriptions, detailed enough to build from directly |

The approved Claude Design mockup lives outside the repository, at `Downloads/design-system-approved.html`. It is the visual reference for the whole site, and its palette and typefaces already match `src/index.css` exactly. Its empty-state copy differs from the shipped copy; the plan's wording won, because the tests assert it.

## Current state

**Plans 1 and 2 are complete, deployed, and tagged `plan-1-foundation` and `plan-2-entities`.** All commits are on `main` and pushed.

| | |
|---|---|
| Frontend | https://dossier-c137.vercel.app |
| Backend | https://coeupddmmjnjotarlnwg.supabase.co/functions/v1/api |
| Repository | https://github.com/Ba5bit/dossier-c137 |
| Supabase project ref | `coeupddmmjnjotarlnwg` (region ap-northeast-2) |

What exists:

- **Backend, complete for all three entities.** `router -> handler -> service -> client/cache`, one service per entity over a shared `services/refs.ts`, deployed with `--no-verify-jwt`. Seven endpoints: `/health`, `/characters`, `/characters/:id`, `/locations`, `/locations/:id`, `/episodes`, `/episodes/:id`. 79 Deno tests
- **Relation expansion is server-side.** A detail response arrives whole — the character dossier carries its origin, location, and every episode; a location carries its resident roster; an episode carries its cast. The frontend never fans out
- **Cache.** `cache_entries` migrated and live, 24 h TTL, stale-on-failure fallback. List keys sort their parameters; detail keys are `character/7`, `location/3`, `episode/5`. RLS on with no policies, verified: the anon key reads `[]`, the service role reads rows
- **Frontend, all three entity slices.** List and detail pages for characters, locations, and episodes, behind a nav shell at `src/app/AppLayout.tsx`. Shared detail primitives in `src/shared/ui/`: `RedactionBar`, `Stamp`, `DimensionNotFound`, `DetailSkeleton`, `TextFilter`. `RosterGrid` lives in `features/characters/` and is reused by the location and episode dossiers. 124 Vitest tests, with MSW-backed integration tests on every page
- **`useUrlFilters` is generic over a key set.** Each filter bar exports its own `*_FILTER_KEYS` constant; the page passes it in
- **The boundary lint rule** fires on any `rickandmortyapi.com` reference in `src/`, and the shipped bundle is clean
- **`.env.local`** holds real values and is gitignored. `.env.example` records the contract

Verified against the live deployment: all seven endpoints return real data; the nav highlights the active section; the locations and episodes lists load with real fields; filtering locations by dimension narrows to three results and writes `?dimension=Fantasy`; `?episode=S03` returns that season only; a dead character's dossier carries the `TERMINATED` stamp and a redaction bar for its unknown origin; resolved origins, residents, and cast members all link through; `/characters/99999` shows the dimension-not-found body and `/characters/rick` shows the error state with retry, neither blank.

## Immediate next step

**Write plan 3**, then execute it. It does not exist yet. Plan 3 owns the hub page, the portal transitions, the header with the mini portal gun, the settings panel, and the dimensions — spec §8, §9, and §11.5. Use the superpowers `writing-plans` skill against the spec, matching the shape of plans 1 and 2: bite-sized TDD tasks, complete code in every step, one commit per task, an expected test count after each.

Before touching anything, confirm the inherited state is green:

```bash
git status                # expect a clean tree on main
npm test                  # expect 124 passing
npm run test:api          # expect 79 passing
npm run lint && npm run build
```

If those four are green, the handoff is intact. If they are not, stop and say so — plan 3 will assume plan 2's numbers as its baseline.

Two things plan 3 inherits and should not fight:

- **`AppLayout` is a placeholder.** `src/app/AppLayout.tsx` is a plain nav bar, written so the sections were reachable before the hub existed. Plan 3 replaces it with the real header; its three tests go with it.
- **The lint carries three `react-refresh/only-export-components` warnings**, one per filter bar, because each exports its `*_FILTER_KEYS` constant alongside its component. They are warnings, not errors, and the lint still exits 0. Moving the constants to their own module would silence them if plan 3 wants that.

Vercel rebuilds on every push to `main`. The Edge Function does not: it needs `npx supabase functions deploy api --no-verify-jwt`.

## Commands that are not obvious

```bash
npm test          # frontend, Vitest
npm run test:api  # backend, Deno - needs the --config flag baked into the script
npm run lint      # ESLint, replaces the template's oxlint
npm run build
```

## Deviations from the plan as written, already made

- **ESLint replaced oxlint.** `create-vite` now ships oxlint, but the task 15 boundary rule needs `no-restricted-syntax` with AST selectors, which oxlint lacks
- **`supabase/functions/deno.json` added.** Without it Deno resolved JSR imports through the frontend's `node_modules` and failed
- **`vite.config.ts` imports `defineConfig` from `vitest/config`.** Vitest 4 dropped the triple-slash augmentation the plan uses, and `tsc` rejected the `test` key
- **The project was renamed** from Citadel Archive to Dossier C-137, after the deploy. The `citadel` dimension token is unrelated and unchanged
- **`ApiError` declares `code` as a field, not a constructor parameter property.** `tsconfig` runs with `erasableSyntaxOnly`, which rejects the shorthand
- **`vercel.json` added** with a catch-all rewrite to `index.html`. Without it Vercel resolved `/characters` against the filesystem and returned its own 404, so no deep link or shared filtered URL worked
- **Text filters are debounced and hold a local draft.** The plan bound the name and species inputs straight to the URL, which dropped keystrokes on the deployed build: typing `morty` produced `?name=moy`, because the router round trip is asynchronous and React restored the stale value into the DOM mid-typing. The commit delay is 300 ms, and external changes (clear, back button, pasted URL) are still adopted. Plan 2 task 15 moved this component to `src/shared/ui/TextFilter.tsx`, and all three filter bars now share it
- **`stubClient` in `characters_test.ts` gained two no-op methods.** Plan 2 task 4 widened the `CharacterClient` contract with `getCharacter` and `getEpisodesByIds`, which broke the six existing list tests at type-check time; the plan did not mention the helper. It now returns both alongside `listCharacters`, unused by the list tests

## Conventions now established in the code

- **New UI copy stays inline**, in the same voice as plan 1. Spec §7.3 wants it all in `src/shared/lore/copy.ts`; plan 5 owns that move. Introducing it mid-flight would leave three places to reconcile instead of one
- **`shared/` knows nothing about specific entity types.** That is why `RosterGrid` lives in `features/characters/` even though the location and episode dossiers both use it
- **Every list page follows the same shape:** `useUrlFilters(KEYS) -> use<Entity>(filters) -> <Filters/> <Grid/> <Pagination/>`, with the page composing only
- **Every detail page follows the same shape too:** `useParams -> use<Entity>(id) -> DetailSkeleton while pending, DimensionNotFound on a `NOT_FOUND` code, ErrorState otherwise, the dossier when data lands`. The detail query hooks refuse to retry a 404 — a missing record stays missing
- **A 404 means two different things upstream**, and the client keeps them apart: `getList` normalizes it to an empty array because a filter matching nothing is routine, `getOne` raises `NotFoundError` because a missing record is real. The batch endpoint also returns a bare object for a single id, which `getMany` wraps

## Still needed from the user, later

Plan 4 needs Grok and ElevenLabs API keys, set via `supabase secrets set`. Nothing before that.

## Decisions already made — do not relitigate

**Stack.** React 19 + Vite + TypeScript, React Router v7, TanStack Query, Tailwind v4, Supabase Edge Functions on Deno, Supabase Postgres as the cache, Vercel for the frontend. Next.js was considered and rejected in favour of a stack the developer already knows.

**AI providers.** Grok for text, chosen over Gemini because tone is the point of the feature. ElevenLabs Voice Design for speech — synthesized from a description rather than cloned, which is both licensing-clean and the only option on the free tier.

**Themes are dimensions.** `c-137` dark by default, `citadel` light, `cronenberg` dark. One light and two dark satisfies the assignment's light/dark requirement literally while keeping the concept.

**The portal is the loader.** The transition animation is bound to `isPending` rather than to a fixed duration, with a 300 ms floor and an 8 second ceiling. Skeletons handle loading inside a section; the portal handles moving between sections.

**AI is grounded.** `/api/ask` retrieves real entities first and passes them as the only permitted source of facts, then shows the sources beneath the answer. An ungrounded LLM invents characters, and a reviewer catches that within a minute.

**Design system publishes from code.** Claude Design's `/design-sync` reads tokens and React components from the repository, not an exported mockup — so the code comes first. The command must be typed by the user; it cannot be run on their behalf. A validated mockup already exists and surfaced one real defect, but it is a reference, not a dependency.

## Two things that are easy to get wrong

**Muted text must be validated against every surface, not just the background.** The original `--text-secondary` values passed on `--bg` and failed on `--surface-raised`, which is where muted text actually lives. Current values pass in the worst case. Any new colour needs the same treatment.

**Half of all origins are `unknown`.** Ten of the twenty characters on page one. The redaction bar is a routine field state, not a rare flourish, and the grid has to stay readable when half its cards carry one.

## Working agreement

Conversation in Russian. Every committed artifact — specs, plans, README, code comments, UI copy — in English. The interface language is English.

Lead with a recommendation rather than a menu. Raise a concern once, then execute the full request.
