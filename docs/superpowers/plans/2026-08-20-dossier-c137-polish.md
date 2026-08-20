# Dossier C-137 — Plan 5: Polish, Copy, Accessibility and the README

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. The user chose **inline execution** for this project deliberately — a fresh subagent per task re-reads the whole context and costs far more than this work is worth. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the nine open observations from the plan 4 walkthrough, move every user-facing string into one registry, make the archive usable on a phone and legible in all three dimensions, and ship the README the assignment is graded on.

**Architecture:** No new subsystems. Four backend edits (the dossier quota, the two voices, a prompt-version bump), a set of surgical frontend fixes, one new module (`src/shared/lore/copy.ts`) that every component reads its text from, one new hook (`src/shared/hooks/useKonami.ts`), one new automated check (a contrast test that parses `src/index.css`), and one new document (`README.md`).

**Tech Stack:** Unchanged. React 19 + Vite + TypeScript, React Router v7, TanStack Query, Tailwind v4, Supabase Edge Functions on Deno, Vitest + RTL + MSW, Deno test.

---

## Before you start

Confirm the inherited state, **one command at a time** — chaining them has produced a false failure on this machine (a pile of Vitest errors with a suspiciously short test duration means workers failed to start; re-run before believing it):

```bash
git status        # clean tree on main
npm test          # 252 passing
npm run test:api  # 149 passing
npm run lint      # 0 errors, 13 warnings
npm run build     # clean
```

**Two constraints that govern this whole plan:**

1. **Claude cannot run any `supabase` command.** The permission classifier blocks every invocation. Tasks 1–2 change the deployed function; Task 3 is the single checkpoint where the user runs the deploy with a `!` prefix. Do not scatter deploys across tasks.
2. **The microcopy move (Tasks 9–11) moves strings, it never rewords them.** Forty test files assert on exact text. A reword there is a test failure, and worse, a silent voice change. Reword only where a task says to.

**Ordering note.** `START-HERE.md` lists the README first. This plan writes it at Task 18 instead, after the fixes it must describe honestly, and Task 20 revises its known-issues list once the walkthrough is done. The README is the graded artifact, so it is not deferred past that — it is written while every fact in it is still fresh.

---

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `supabase/functions/api/handlers/dossier.ts` | Hands the quota to the service instead of spending it up front | 1 |
| `supabase/functions/api/services/dossier.ts` | Calls the quota only on the generate path | 1 |
| `supabase/functions/api/lib/persona.ts` | Sharper voices, anti-mirroring instruction, `PROMPT_VERSION = 2` | 2 |
| `src/pages/SearchPage.tsx` | Explains a one-character query; prefills the box from the URL | 4, 5 |
| `src/features/search/PortalSearch.tsx` | Optional initial draft, optional accessible label | 5, 6 |
| `src/app/AppLayout.tsx` | `inert` page shell behind the overlay; the Konami listener | 6, 12 |
| `src/shared/lore/copy.ts` | **New.** Every user-facing string in the app | 9, 10, 11 |
| `src/features/ai/persona.ts` | **Deleted.** Its contents move into `copy.ts` | 10 |
| `src/shared/hooks/useKonami.ts` | **New.** Typed-sequence detector | 12 |
| `src/shared/design/contrast.ts` | **New.** WCAG ratio maths + a token parser for `index.css` | 13 |
| `src/index.css` | Two token corrections in `c-137` and `cronenberg` | 13 |
| `docs/design/tokens.md` | Records the corrected values | 13 |
| `README.md` | **New.** The graded document | 18, 20 |

---

## Task 1: A stored dossier stops spending a day's allowance

Observation 1. `handlers/dossier.ts` calls `quota.check` before the service looks in the store, so the ten-per-day ceiling counts *views* rather than *generations*: the eleventh visitor reading a dossier written last week is refused, having cost nothing. The service is the only code that knows whether it is about to call the provider, so the check moves inside it, as a callback the handler supplies.

**Files:**
- Modify: `supabase/functions/api/services/dossier.ts`
- Modify: `supabase/functions/api/handlers/dossier.ts`
- Test: `supabase/functions/api/tests/dossier_test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `supabase/functions/api/tests/dossier_test.ts`:

```ts
Deno.test('does not spend the allowance on a stored dossier', async () => {
  const characters = stubCharacters()
  const grok = stubGrok()
  const store = memoryStore({
    [`character/1/rick/${PROMPT_VERSION}`]: { text: 'On file.', model: 'grok-old' },
  })
  const service = createDossierService(characters.service, grok.client, store.store)

  let spent = 0
  const dossier = await service.getDossier('character', 1, 'rick', async () => {
    spent += 1
  })

  assertEquals(dossier.cached, true)
  assertEquals(spent, 0)
})

Deno.test('spends the allowance before generating a new dossier', async () => {
  const characters = stubCharacters()
  const grok = stubGrok()
  const store = memoryStore()
  const service = createDossierService(characters.service, grok.client, store.store)

  const order: string[] = []
  await service.getDossier('character', 1, 'rick', async () => {
    order.push('quota')
  })

  assertEquals(order, ['quota'])
  assertEquals(grok.calls.length, 1)
})

Deno.test('a refused allowance never reaches the provider', async () => {
  const characters = stubCharacters()
  const grok = stubGrok()
  const store = memoryStore()
  const service = createDossierService(characters.service, grok.client, store.store)

  let message = ''
  try {
    await service.getDossier('character', 1, 'rick', () => {
      throw new Error('out of fluid')
    })
  } catch (error) {
    message = (error as Error).message
  }

  assertEquals(message, 'out of fluid')
  assertEquals(grok.calls.length, 0)
  assertEquals(store.writes.length, 0)
})
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npm run test:api`
Expected: the three new cases fail — `getDossier` takes three parameters, so the callback is ignored and `spent`/`order` stay empty.

- [ ] **Step 3: Move the check into the service**

In `supabase/functions/api/services/dossier.ts`, replace the `getDossier` signature and the miss path:

```ts
  /**
   * `onGenerate` runs only when a dossier is about to be written — never on a
   * store hit. The ceiling counts generations, which are what cost money;
   * counting views would refuse the eleventh reader of a dossier written last
   * week. The service is the only code that knows which path it is on.
   */
  async function getDossier(
    entityType: string,
    entityId: number,
    persona: Persona,
    onGenerate: () => Promise<void> | void = () => {},
  ): Promise<Dossier> {
    if (!DOSSIER_ENTITY_TYPES.includes(entityType)) {
      throw new ValidationError(
        `entityType must be one of ${DOSSIER_ENTITY_TYPES.join(', ')}, received "${entityType}"`,
      )
    }

    const stored = await store.read(entityType, entityId, persona, PROMPT_VERSION)
    if (stored) {
      return {
        entityType,
        entityId,
        persona,
        text: stored.text,
        model: stored.model,
        promptVersion: PROMPT_VERSION,
        cached: true,
      }
    }

    await onGenerate()

    // The detail request goes through the ordinary cached service, so a
    // dossier for a character somebody has already viewed costs no upstream
    // traffic at all.
    const { payload } = await characters.getCharacter(entityId)
```

The rest of the function is unchanged.

- [ ] **Step 4: Hand the quota to the service from the handler**

Replace `supabase/functions/api/handlers/dossier.ts` in full:

```ts
import { parseDossierBody, readJsonBody } from '../lib/validate.ts'
import type { Dossier, Persona } from '../types.ts'

export type DossierService = {
  getDossier(
    entityType: string,
    entityId: number,
    persona: Persona,
    onGenerate?: () => Promise<void> | void,
  ): Promise<Dossier>
}

export type QuotaLike = {
  check(request: Request, endpoint: 'ask' | 'dossier'): Promise<void>
}

export async function handleDossier(
  request: Request,
  service: DossierService,
  quota: QuotaLike,
): Promise<{ body: Dossier }> {
  // Validation first, so a malformed request never spends a day's allowance —
  // and the quota travels into the service, which spends it only when it is
  // about to call the provider.
  const body = parseDossierBody(await readJsonBody(request))

  return {
    body: await service.getDossier(
      body.entityType,
      body.entityId,
      body.persona,
      () => quota.check(request, 'dossier'),
    ),
  }
}
```

- [ ] **Step 5: Run the whole backend suite**

Run: `npm run test:api`
Expected: `152 passed | 0 failed`.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/api/services/dossier.ts supabase/functions/api/handlers/dossier.ts supabase/functions/api/tests/dossier_test.ts
git commit -m "fix: count dossier generations against the quota, not views"
```

---

## Task 2: Sharpen the two voices and bump the prompt version

Observation 6. In `/ask` a narrow factual question produces near-identical prose from both personas. Two causes, both addressed here: the previous answer travels back as history and the model mirrors it, and `askSystemPrompt`'s "plain prose, under 120 words" pulls against characterisation without anything pulling back.

`PROMPT_VERSION` is part of the `ai_dossiers` primary key. It goes to `2` in the same commit as the reword — stored dossiers stay attributed to the prompt that wrote them, and each character earns a fresh row under the new wording.

**Files:**
- Modify: `supabase/functions/api/lib/persona.ts`
- Test: `supabase/functions/api/tests/persona_test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `supabase/functions/api/tests/persona_test.ts`:

```ts
Deno.test('the prompt version moved with the reword', () => {
  assertEquals(PROMPT_VERSION, 2)
})

Deno.test('the ask prompt forbids mirroring an earlier voice', () => {
  for (const persona of PERSONAS) {
    assertStringIncludes(askSystemPrompt(persona), 'answer in yours')
  }
})

Deno.test('each ask voice carries its own opening instruction', () => {
  assertStringIncludes(askSystemPrompt('rick'), 'dismiss')
  assertStringIncludes(askSystemPrompt('morty'), 'aw jeez')
})
```

If `persona_test.ts` does not already import them, add `PERSONAS`, `PROMPT_VERSION`, `askSystemPrompt` to its imports from `'../lib/persona.ts'`, and `assertStringIncludes` to its `jsr:@std/assert` import.

- [ ] **Step 2: Run them and watch them fail**

Run: `npm run test:api`
Expected: three failures — version is 1, and neither phrase is present.

- [ ] **Step 3: Reword the voices and bump the version**

In `supabase/functions/api/lib/persona.ts`, replace the version constant, `VOICES`, and `askSystemPrompt`:

```ts
/**
 * Part of the ai_dossiers primary key. Bump it when any prompt below
 * changes; stored text is never edited in place.
 *
 * 2 — plan 5 sharpened both voices and added the anti-mirroring line.
 */
export const PROMPT_VERSION = 2
```

```ts
const VOICES: Record<Persona, string> = {
  rick: [
    'You are Rick Sanchez, C-137: the smartest man in the universe and thoroughly sick of being asked about it.',
    'Contemptuous, impatient, casually brilliant. You explain things correctly and resent having to.',
    'Open by dismissing the question, the premise, or the person asking — then answer it correctly anyway.',
    'You may place a single *burp* mid-sentence, at most once per answer, and only where it interrupts something pompous.',
    'No slurs, no profanity beyond the mild, and never cruel about the person asking.',
  ].join(' '),
  morty: [
    'You are Morty Smith: fourteen, anxious, and out of his depth, but honest and trying hard.',
    'Open with a hesitation — "aw jeez", "o-okay", "I-I think" — before you get anywhere near the facts.',
    'You stammer a little, you hedge, and you apologise for facts you did not cause.',
    'You are earnest rather than stupid: you report what the records say accurately, you just do not enjoy it.',
  ].join(' '),
}
```

```ts
export function askSystemPrompt(persona: Persona): string {
  return [
    VOICES[persona],
    GROUNDING,
    'Answer the question using only the CONTEXT block. Under 120 words, plain prose, no markdown headings and no bullet lists.',
    'The voice is not decoration on top of the answer: the first sentence must be recognisably yours before it is informative.',
    'Earlier turns in this conversation may have been written in a different voice. Never imitate them — answer in yours.',
  ].join('\n\n')
}
```

- [ ] **Step 4: Run the backend suite**

Run: `npm run test:api`
Expected: `155 passed | 0 failed`.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/api/lib/persona.ts supabase/functions/api/tests/persona_test.ts
git commit -m "feat: sharpen both AI voices and bump the prompt version to 2"
```

---

## Task 3: Deploy the function and verify both fixes live

The single deploy checkpoint of this plan. **Claude cannot run this command.**

**Files:** none.

- [ ] **Step 1: Ask the user to deploy**

Print exactly this and stop:

> The two backend changes are committed. Please run this in the prompt with a `!` prefix:
>
> `!npx supabase functions deploy api --no-verify-jwt`

- [ ] **Step 2: Verify the quota fix from the live function**

After the deploy reports success, run:

```bash
curl -s -X POST "https://coeupddmmjnjotarlnwg.supabase.co/functions/v1/api/dossier" \
  -H 'content-type: application/json' \
  -d '{"entityType":"character","entityId":1,"persona":"rick"}' | head -c 400
```

Expected: a JSON dossier with `"promptVersion":2` and `"cached":false` on the first call — version 2 has no stored rows yet, so this is the first generation under the new prompt. Run the same command a second time and expect `"cached":true`.

- [ ] **Step 3: Verify both voices differ**

```bash
for p in rick morty; do
  curl -s -X POST "https://coeupddmmjnjotarlnwg.supabase.co/functions/v1/api/ask" \
    -H 'content-type: application/json' \
    -d "{\"q\":\"who is Birdperson?\",\"persona\":\"$p\",\"history\":[]}" | tail -c 600
  echo; echo "---"
done
```

Expected: two answers that open differently — a dismissal from `rick`, a hesitation from `morty` — both naming Birdperson from the sources. If they still read alike, note it in the README's known issues at Task 18 rather than iterating on the prompt here; the reword is a one-shot improvement, not a tuning loop.

- [ ] **Step 4: Commit nothing**

There is nothing to commit; this task is a checkpoint.

---

## Task 4: `/search?q=r` explains itself instead of loading forever

Observation 2. `useSearch` disables the query below two characters, and a disabled TanStack query reports `status: 'pending'`, so the page's `isPending` branch renders skeletons with nothing on the way. Reproduced live at `/search?q=r`.

**Files:**
- Modify: `src/pages/SearchPage.tsx`
- Test: `src/pages/SearchPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Append inside the `describe('SearchPage', …)` block in `src/pages/SearchPage.test.tsx`:

```ts
  it('asks for a second character instead of loading forever', () => {
    renderPage('/search?q=r')

    expect(screen.getByText(/two characters minimum/i)).toBeInTheDocument()
    expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument()
  })
```

Check `src/shared/ui/Skeleton.tsx` for its `data-testid`. If it carries none, add `data-testid="skeleton"` to its root element — `Skeleton.test.tsx` asserts on its class, not its test id, so nothing breaks.

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- SearchPage`
Expected: FAIL — the minimum line is absent and skeletons are present.

- [ ] **Step 3: Gate the pending branch on the minimum**

In `src/pages/SearchPage.tsx`, add the import and replace the three query-state blocks:

```tsx
import { useSearch, SEARCH_MIN } from '../features/search/useSearch'
```

```tsx
export function SearchPage() {
  const [params] = useSearchParams()
  const query = params.get('q') ?? ''
  const trimmed = query.trim()
  const { data, isPending, isError, refetch } = useSearch(query)

  // A disabled query reports `pending` forever, so the length check has to
  // come first: below the minimum nothing is on the way and skeletons lie.
  const tooShort = trimmed.length > 0 && trimmed.length < SEARCH_MIN

  const rows = data ? groupsOf(data) : null
  const nothing =
    rows !== null &&
    rows.characters.length === 0 &&
    rows.locations.length === 0 &&
    rows.episodes.length === 0
```

```tsx
      {trimmed === '' && (
        <p className="text-muted">
          Enter coordinates above. Two characters minimum.
        </p>
      )}

      {tooShort && (
        <p className="text-muted">
          Two characters minimum. The archive is big, not psychic.
        </p>
      )}

      {trimmed !== '' && !tooShort && isError && <ErrorState onRetry={() => refetch()} />}

      {trimmed !== '' && !tooShort && isPending && (
        <div className="space-y-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}
```

The `rows &&` blocks below are unchanged.

- [ ] **Step 4: Run the test**

Run: `npm test -- SearchPage`
Expected: PASS, five cases.

- [ ] **Step 5: Commit**

```bash
git add src/pages/SearchPage.tsx src/pages/SearchPage.test.tsx src/shared/ui/Skeleton.tsx
git commit -m "fix: explain the two-character minimum on /search instead of loading forever"
```

---

## Task 5: The `/search` box prefills from the URL

Observation 3. Landing on `/search?q=rick` shows the results but an empty box, so refining means retyping. `PortalSearch` gets an optional initial draft, and seeds its committed value from it too — otherwise the suggestions under the box wait 300 ms for a debounce that has nothing to debounce.

**Files:**
- Modify: `src/features/search/PortalSearch.tsx`
- Modify: `src/pages/SearchPage.tsx`
- Test: `src/pages/SearchPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Append inside `describe('SearchPage', …)`:

```ts
  it('prefills the box from the URL so a query can be refined', async () => {
    renderPage('/search?q=rick')

    const box = await screen.findByRole('searchbox')
    expect(box).toHaveValue('rick')
  })
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- SearchPage`
Expected: FAIL — the box is empty.

- [ ] **Step 3: Accept an initial draft**

In `src/features/search/PortalSearch.tsx`, extend the props and the two `useState` calls:

```tsx
type PortalSearchProps = {
  autoFocus?: boolean
  /** Called after a navigation, so an overlay can close itself. */
  onNavigate?: () => void
  placeholder?: string
  /** Seeds the box, so a query carried in the URL can be refined rather than retyped. */
  initialDraft?: string
}
```

```tsx
export function PortalSearch({
  autoFocus = false,
  onNavigate,
  placeholder = 'ENTER COORDINATES OR ASK A QUESTION',
  initialDraft = '',
}: PortalSearchProps) {
  const [draft, setDraft] = useState(initialDraft)
  // Committed starts seeded as well: a draft that arrived with the page has
  // nothing to debounce, and waiting 300 ms to show its own results is a
  // flicker with no purpose.
  const [committed, setCommitted] = useState(initialDraft)
```

- [ ] **Step 4: Pass the query down**

In `src/pages/SearchPage.tsx`, in the header:

```tsx
        <PortalSearch initialDraft={query} />
```

- [ ] **Step 5: Run the tests**

Run: `npm test -- SearchPage PortalSearch`
Expected: PASS — six `SearchPage` cases and every existing `PortalSearch` case, which passes no `initialDraft` and therefore still starts empty.

- [ ] **Step 6: Commit**

```bash
git add src/features/search/PortalSearch.tsx src/pages/SearchPage.tsx src/pages/SearchPage.test.tsx
git commit -m "fix: prefill the search box from the URL query"
```

---

## Task 6: The overlay takes the page out of the tab order and the accessibility tree

Observations 5 and 7, which have one fix between them. `SearchOverlay` sets `aria-modal="true"` but nothing stops `Tab` from walking into the page behind it, and when the overlay opens over the hub, the hub's own coordinate input is still exposed under the same accessible name.

`inert` on the page shell solves both: it removes the shell from the tab order and from the accessibility tree while the dialog is open. React 19 renders it from a boolean. The two inputs also stop sharing a name, so a screen-reader user hears which one they are in.

**Files:**
- Modify: `src/app/AppLayout.tsx`
- Modify: `src/features/search/PortalSearch.tsx`
- Modify: `src/pages/HubPage.tsx`
- Test: `src/app/AppLayout.test.tsx`

- [ ] **Step 1: Write the failing tests**

Append inside `describe('AppLayout', …)` in `src/app/AppLayout.test.tsx`:

```tsx
  it('makes the page inert while the search overlay is open', async () => {
    const user = userEvent.setup()
    renderAt('/characters')

    expect(screen.getByTestId('page-shell')).not.toHaveAttribute('inert')

    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(screen.getByTestId('page-shell')).toHaveAttribute('inert')
  })

  it('releases the page when the overlay closes', async () => {
    const user = userEvent.setup()
    renderAt('/characters')

    await user.click(screen.getByRole('button', { name: 'Search' }))
    await user.keyboard('{Escape}')

    expect(screen.getByTestId('page-shell')).not.toHaveAttribute('inert')
  })
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npm test -- AppLayout`
Expected: FAIL — there is no `page-shell` element.

- [ ] **Step 3: Wrap the shell**

In `src/app/AppLayout.tsx`, wrap the header and the outlet, leaving the overlay and the dimension wave outside:

```tsx
  return (
    <PortalProvider>
      <div className="min-h-screen">
        <RefreshBar />

        {/* Spec section 12.1 wants the overlay to trap focus. `inert` is the
            whole trap: the shell leaves both the tab order and the
            accessibility tree, so Tab cannot reach the page behind the dialog
            and the hub's own search box stops answering to the same name. */}
        <div data-testid="page-shell" inert={searchOpen}>
          <header className="border-b border-line bg-surface">
            …unchanged…
          </header>

          <Outlet />
        </div>

        {searchOpen && <SearchOverlay onClose={closeSearch} />}
        <DimensionWave />
      </div>
    </PortalProvider>
  )
```

Move the existing `<header>…</header>` and `<Outlet />` inside the new `div` unchanged; the settings panel stays inside the header where it is.

- [ ] **Step 4: Give the two search boxes distinct names**

In `src/features/search/PortalSearch.tsx`, add a `label` prop and use it:

```tsx
type PortalSearchProps = {
  autoFocus?: boolean
  onNavigate?: () => void
  placeholder?: string
  initialDraft?: string
  /** Two of these can be on the page at once; they must not share a name. */
  label?: string
}
```

```tsx
export function PortalSearch({
  autoFocus = false,
  onNavigate,
  placeholder = 'ENTER COORDINATES OR ASK A QUESTION',
  initialDraft = '',
  label = 'Search the archive',
}: PortalSearchProps) {
```

```tsx
          aria-label={label}
```

In `src/pages/HubPage.tsx`:

```tsx
        <PortalSearch label="Archive coordinates" />
```

- [ ] **Step 5: Run the suites**

Run: `npm test -- AppLayout PortalSearch SearchOverlay HubPage`
Expected: PASS. If a `HubPage` case queries the box by the old name, update that query to `Archive coordinates` — the rename is the point of the task.

- [ ] **Step 6: Commit**

```bash
git add src/app/AppLayout.tsx src/app/AppLayout.test.tsx src/features/search/PortalSearch.tsx src/pages/HubPage.tsx
git commit -m "fix: make the page inert behind the search overlay and unshare the box name"
```

---

## Task 7: Establish where the first Ctrl+K goes

Observation 4: on the live site, the very first `Ctrl+K` after a cold page load did nothing and the second worked. The stated hypothesis — that the press landed before a lazy route chunk hydrated — is worth testing, because `AppLayout` is imported eagerly in `routes.tsx` and already sits above every `React.lazy` boundary. If the listener is provably attached while a route chunk is still pending, the cause is outside the app: focus was still in the browser's address bar after navigating there by URL, and the browser consumed the chord. That is a known-issues line, not a code change.

**Files:**
- Test: `src/app/AppLayout.test.tsx`

- [ ] **Step 1: Write the test**

Append inside `describe('AppLayout', …)`:

```tsx
  it('answers the hotkey while a route chunk is still pending', async () => {
    const user = userEvent.setup()
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    // A child that never resolves stands in for a route chunk still on the
    // wire. If the overlay opens anyway, the listener lives above the lazy
    // boundary and a missed first press is not this component's doing.
    const Never = lazy(() => new Promise<never>(() => {}))

    render(
      <QueryClientProvider client={client}>
        <SettingsProvider>
          <MemoryRouter initialEntries={['/characters']}>
            <Routes>
              <Route element={<AppLayout />}>
                <Route
                  path="/characters"
                  element={
                    <Suspense fallback={<p>loading chunk</p>}>
                      <Never />
                    </Suspense>
                  }
                />
              </Route>
            </Routes>
          </MemoryRouter>
        </SettingsProvider>
      </QueryClientProvider>,
    )

    expect(screen.getByText('loading chunk')).toBeInTheDocument()

    await user.keyboard('{Control>}k{/Control}')

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })
```

Add `import { lazy, Suspense } from 'react'` at the top of the file.

- [ ] **Step 2: Run it**

Run: `npm test -- AppLayout`
Expected: PASS on the first run — no implementation change needed. If it FAILS, the hypothesis was right: attach the listener in `src/main.tsx` before `createRoot`, dispatching a custom `dossier:search` event that `AppLayout` listens for. Only do that if the test actually fails.

- [ ] **Step 3: Record the finding**

Whichever way it went, write one line into your notes for Task 18's known-issues section. If the test passed: *"The first Ctrl+K after typing a URL can be swallowed by the browser's address bar, which still holds focus. Click once in the page, or use the SEARCH button."*

- [ ] **Step 4: Commit**

```bash
git add src/app/AppLayout.test.tsx
git commit -m "test: prove the search hotkey attaches above the lazy route boundary"
```

---

## Task 8: Checkpoint — the fixes are green

**Files:** none.

- [ ] **Step 1: Run everything, one command at a time**

```bash
npm test
npm run test:api
npm run lint
npm run build
```

Expected: frontend 258–260 passing (four to six cases added by tasks 4–7), backend 155 passing, 0 lint errors and 13 warnings, a clean build. A new lint **error** is a blocker; a new warning is noise.

- [ ] **Step 2: Push**

```bash
git push
```

Vercel rebuilds on the push. Nothing else is needed here — the function was already deployed at Task 3.

---

## Task 9: The copy registry, and the shared UI reads from it

Spec §7.3: **all user-facing text lives in `shared/lore/copy.ts`.** Plan 1 deferred it and every plan since has added inline copy. Three tasks move it, bottom-up. `src/shared/lore/quotes.ts` is a data file and stays where it is.

**Move the strings exactly as written.** Forty test files assert on this text.

**Files:**
- Create: `src/shared/lore/copy.ts`
- Modify: `src/shared/ui/EmptyState.tsx`, `ErrorState.tsx`, `DimensionNotFound.tsx`, `Pagination.tsx`, `RefreshBar.tsx`
- Test: `src/shared/lore/copy.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/shared/lore/copy.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { COPY } from './copy'

describe('COPY', () => {
  it('carries the shared state text the components render', () => {
    expect(COPY.states.emptyTitle).toBe('NO RECORDS FOUND')
    expect(COPY.states.emptyMessage).toBe('Oooh, nothing here! Existence is pain!')
    expect(COPY.states.errorTitle).toBe('REGISTRY UNREACHABLE')
    expect(COPY.states.errorMessage).toBe('The portal fluid is out. Blame Jerry.')
    expect(COPY.states.notFoundHeading).toBe("This dimension doesn't exist.")
  })

  it('holds no empty strings', () => {
    const walk = (value: unknown): void => {
      if (typeof value === 'string') {
        expect(value.length).toBeGreaterThan(0)
        return
      }
      if (value && typeof value === 'object') Object.values(value).forEach(walk)
    }

    walk(COPY)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- copy`
Expected: FAIL — `./copy` does not resolve.

- [ ] **Step 3: Create the registry with its first three groups**

Create `src/shared/lore/copy.ts`:

```ts
/**
 * Every user-facing string in the app. Spec section 7.3: the voice here is
 * strong and specific, and keeping it consistent is only possible with the
 * text collected in one place.
 *
 * `quotes.ts` is the one exception — portal quotes are a data set that gets
 * sampled at random, not microcopy a component renders by name.
 */
export const COPY = {
  states: {
    emptyTitle: 'NO RECORDS FOUND',
    emptyMessage: 'Oooh, nothing here! Existence is pain!',
    errorTitle: 'REGISTRY UNREACHABLE',
    errorMessage: 'The portal fluid is out. Blame Jerry.',
    errorRetry: 'RETRY',
    notFoundLabel: 'ERROR // DIMENSION NOT FOUND',
    notFoundHeading: "This dimension doesn't exist.",
    notFoundBody: "Try one where you're less of an idiot.",
    notFoundAction: 'RETURN TO ARCHIVE',
  },
  pagination: {
    label: 'Pagination',
    previous: 'Previous page',
    next: 'Next page',
    previousText: '← JUMP',
    nextText: 'JUMP →',
    position: (page: number, pageCount: number) => `DIMENSION ${page} / ${pageCount}`,
  },
  refresh: {
    label: 'Refreshing',
  },
} as const
```

- [ ] **Step 4: Rewire the five shared components**

`src/shared/ui/EmptyState.tsx`:

```tsx
import { COPY } from '../lore/copy'

type EmptyStateProps = {
  message?: string
}

export function EmptyState({ message = COPY.states.emptyMessage }: EmptyStateProps) {
  return (
    <div className="border border-line bg-surface px-6 py-16 text-center">
      <p className="font-mono text-sm text-muted">{COPY.states.emptyTitle}</p>
      <p className="mt-3 text-fg">{message}</p>
    </div>
  )
}
```

`src/shared/ui/ErrorState.tsx`: same shape — import `COPY`, default `message` to `COPY.states.errorMessage`, render `COPY.states.errorTitle` and `COPY.states.errorRetry`.

`src/shared/ui/DimensionNotFound.tsx`: render `COPY.states.notFoundLabel`, `notFoundHeading`, `notFoundBody`, `notFoundAction`. The heading and body carry apostrophes, so with the strings in `COPY` the `&apos;` entities disappear — that is the point, and the rendered text is identical.

`src/shared/ui/Pagination.tsx`: `aria-label={COPY.pagination.label}`, the two button labels, the two arrow strings, and `{COPY.pagination.position(page, pageCount)}`.

`src/shared/ui/RefreshBar.tsx`: `aria-label={COPY.refresh.label}`.

- [ ] **Step 5: Run the affected suites**

Run: `npm test -- copy states Pagination RefreshBar detail`
Expected: PASS with no assertion changes anywhere — the text is byte-identical.

- [ ] **Step 6: Commit**

```bash
git add src/shared/lore/copy.ts src/shared/lore/copy.test.ts src/shared/ui
git commit -m "refactor: move shared UI copy into the lore registry"
```

---

## Task 10: Search and AI copy moves into the registry

`src/features/ai/persona.ts` is already a small registry of the same kind; it merges into `COPY.ai` and the file is deleted. `PERSONA_BUTTON` in it is unreferenced — it goes, rather than moving.

**Files:**
- Modify: `src/shared/lore/copy.ts`
- Delete: `src/features/ai/persona.ts`
- Modify: `src/features/search/PortalSearch.tsx`, `SearchOverlay.tsx`
- Modify: `src/features/ai/ChatPanel.tsx`, `DossierBlock.tsx`, `SourceCards.tsx`, `PersonaChoice.tsx`
- Test: `src/shared/lore/copy.test.ts`

- [ ] **Step 1: Write the failing test**

Append inside `describe('COPY', …)`:

```ts
  it('carries both AI voices by name and greeting', () => {
    expect(COPY.ai.personaNames.rick).toBe('RICK C-137')
    expect(COPY.ai.personaNames.morty).toBe('MORTY SMITH')
    expect(COPY.ai.greetings.morty).toMatch(/aw jeez/i)
  })

  it('carries the search microcopy', () => {
    expect(COPY.search.tooShort).toMatch(/two characters minimum/i)
    expect(COPY.search.hint).toBe('↑ ↓ TO AIM · ENTER TO FIRE · ESC TO ABORT')
  })
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- copy`
Expected: FAIL — `COPY.ai` is undefined.

- [ ] **Step 3: Extend the registry**

Add to `src/shared/lore/copy.ts`, above the closing `} as const`:

```ts
  search: {
    label: 'Search the archive',
    hubLabel: 'Archive coordinates',
    placeholder: 'ENTER COORDINATES OR ASK A QUESTION',
    ask: 'ASK ▸',
    tooShort: 'Two characters minimum. The archive is big, not psychic.',
    nothing: 'Nothing on file. Try a different dimension.',
    hint: '↑ ↓ TO AIM · ENTER TO FIRE · ESC TO ABORT',
    overlayLabel: 'Search the archive',
    pageLabel: 'ARCHIVE SEARCH',
    pageEmpty: 'Enter coordinates above. Two characters minimum.',
    groupCharacters: 'CHARACTERS',
    groupLocations: 'LOCATIONS',
    groupEpisodes: 'EPISODES',
    onFile: (total: number) => `${total} ON FILE`,
    allOf: (total: number, title: string) => `ALL ${total} ${title} →`,
  },
  ai: {
    personaNames: {
      rick: 'RICK C-137',
      morty: 'MORTY SMITH',
    },
    greetings: {
      rick: 'Ask something. Preferably something the archive actually knows.',
      morty: 'Aw jeez, okay — I-I can look stuff up in the archive. Ask me something?',
    },
    voiceLabel: 'AI voice',
    you: 'YOU',
    inputLabel: 'Ask a question',
    inputPlaceholder: 'ASK ABOUT ANYTHING ON FILE',
    send: 'SEND ▸',
    groundedIn: 'GROUNDED IN',
    dossierTitle: 'FIELD ASSESSMENT',
    dossierGenerate: 'GENERATE DOSSIER',
    dossierRetry: 'TRY AGAIN',
    dossierFailed: 'The dossier never arrived. The archive is not saying why.',
  },
```

The greeting and its em dash must match the current string exactly — `ChatPanel.test.tsx` asserts on it.

- [ ] **Step 4: Rewire the components and delete `persona.ts`**

In `src/features/ai/ChatPanel.tsx` and `src/features/ai/DossierBlock.tsx`, replace the `./persona` import with `import { COPY } from '../../shared/lore/copy'` and every `PERSONA_NAMES[…]` with `COPY.ai.personaNames[…]`, `PERSONA_GREETINGS[…]` with `COPY.ai.greetings[…]`. Replace the inline strings — `'YOU'`, `'Ask a question'`, `'ASK ABOUT ANYTHING ON FILE'`, `'SEND ▸'`, the dossier title, both button captions, and the failure line in `messageFor` — with their `COPY.ai` entries.

In `src/features/ai/SourceCards.tsx`, `'GROUNDED IN'` becomes `COPY.ai.groundedIn`.

In `src/features/ai/PersonaChoice.tsx`, `aria-label="AI voice"` becomes `aria-label={COPY.ai.voiceLabel}`. `PERSONA_LABELS` stays in `shared/settings/settings.ts` — it is a settings enum label, and `SettingsPanel` reads it from there.

In `src/features/search/PortalSearch.tsx`, default `placeholder` and `label` from `COPY.search`, and replace the `ASK ▸` caption and both messages under the box.

In `src/features/search/SearchOverlay.tsx`, `aria-label={COPY.search.overlayLabel}` and the hint line.

Then:

```bash
rm src/features/ai/persona.ts
```

- [ ] **Step 5: Run the affected suites**

Run: `npm test -- copy ChatPanel DossierBlock PortalSearch SearchOverlay AskPage`
Expected: PASS with no assertion changes.

- [ ] **Step 6: Build, because `npm test` does not type-check**

Run: `npm run build`
Expected: clean. A leftover import of the deleted `./persona` surfaces here and nowhere else.

- [ ] **Step 7: Commit**

```bash
git add src/shared/lore/copy.ts src/shared/lore/copy.test.ts src/features
git commit -m "refactor: move search and AI copy into the lore registry"
```

---

## Task 11: Page and layout copy moves into the registry

**Files:**
- Modify: `src/shared/lore/copy.ts`
- Modify: `src/app/AppLayout.tsx`, `src/pages/HubPage.tsx`, `src/pages/SearchPage.tsx`, `src/pages/AskPage.tsx`
- Modify: `src/features/characters/CharacterFilters.tsx`, `src/features/locations/LocationFilters.tsx`, `src/features/episodes/EpisodeFilters.tsx`
- Test: `src/shared/lore/copy.test.ts`

- [ ] **Step 1: Write the failing test**

Append inside `describe('COPY', …)`:

```ts
  it('carries the hub and layout text', () => {
    expect(COPY.layout.brand).toBe('DOSSIER C-137')
    expect(COPY.layout.sections.map((section) => section.to)).toEqual([
      '/characters',
      '/locations',
      '/episodes',
      '/ask',
    ])
    expect(COPY.hub.stamp).toBe('DOSSIER C-137 // CLEARANCE: UNRESTRICTED')
    expect(COPY.hub.figures).toHaveLength(5)
  })
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- copy`
Expected: FAIL — `COPY.layout` is undefined.

- [ ] **Step 3: Extend the registry**

Add to `src/shared/lore/copy.ts`:

```ts
  layout: {
    brand: 'DOSSIER C-137',
    navLabel: 'Sections',
    sections: [
      { to: '/characters', label: 'CHARACTERS' },
      { to: '/locations', label: 'LOCATIONS' },
      { to: '/episodes', label: 'EPISODES' },
      { to: '/ask', label: 'ASK' },
    ],
    searchButton: '⌕ SEARCH',
    searchButtonLabel: 'Search',
    gunButton: '◎ GUN',
    gunButtonLabel: 'Portal gun',
  },
  hub: {
    stamp: 'DOSSIER C-137 // CLEARANCE: UNRESTRICTED',
    heading: 'DOSSIER C-137',
    tagline: "The Citadel's archive. Everything on file, nothing you're cleared to question.",
    destinations: [
      { to: '/characters', label: 'CHARACTERS', key: 'characters' },
      { to: '/locations', label: 'LOCATIONS', key: 'locations' },
      { to: '/episodes', label: 'EPISODES', key: 'episodes' },
    ],
    figures: [
      'ENTITIES INDEXED',
      'LOCATIONS ON FILE',
      'EPISODES LOGGED',
      'RICKS ON FILE',
      'MORTYS ON FILE',
    ],
  },
  ask: {
    stamp: 'ARCHIVE INTERROGATION TERMINAL',
    heading: 'ASK THE ARCHIVE',
    tagline:
      'Answers come from the records only. Whoever is answering will tell you when there are none — in their own way.',
  },
  filters: {
    name: 'Search by name',
    namePlaceholder: 'ENTER DESIGNATION',
    species: 'Species',
    status: 'Status',
    gender: 'Gender',
    any: 'ANY',
    clear: 'CLEAR',
  },
```

`COPY` is declared `as const`, so `destination.key` stays a union of the three `Stats` keys and `data[destination.key].total` still type-checks. If `tsc` disagrees, annotate the array as `{ to: string; label: string; key: 'characters' | 'locations' | 'episodes' }[]` rather than loosening the index.

- [ ] **Step 4: Rewire the pages**

`AppLayout.tsx` reads `COPY.layout` for the brand, the sections, both button captions and both `aria-label`s; delete its local `SECTIONS` constant.

`HubPage.tsx` reads `COPY.hub` for the stamp, heading, tagline and destinations; delete its local constant. The five `<Figure>` labels come from `COPY.hub.figures` — keep the five explicit `<Figure>` elements and index the array, so each figure keeps its own `value` expression:

```tsx
            <Figure label={COPY.hub.figures[0]} value={indexedTotal(data)} />
            <Figure label={COPY.hub.figures[1]} value={data?.locations.total} />
            <Figure label={COPY.hub.figures[2]} value={data?.episodes.total} />
            <Figure label={COPY.hub.figures[3]} value={data?.ricks} />
            <Figure label={COPY.hub.figures[4]} value={data?.mortys} />
```

`SearchPage.tsx` reads `COPY.search` for the page label, the empty line, the too-short line, the three group titles, `onFile` and `allOf`. `HubPage.tsx`'s `label="Archive coordinates"` from Task 6 becomes `label={COPY.search.hubLabel}` — same string, now with one home.

`AskPage.tsx` reads `COPY.ask`.

The three filter bars read `COPY.filters` for their labels, the `ANY` option and the `CLEAR` button. `CHARACTER_FILTER_KEYS` and the two sibling key constants stay where they are — they are route contracts, not copy, and they are the source of three of the thirteen accepted lint warnings.

- [ ] **Step 5: Run the whole frontend suite**

Run: `npm test`
Expected: every case passing, no assertion edited. Then `npm run build` for the type check.

- [ ] **Step 6: Confirm nothing was left behind**

```bash
grep -rn "DOSSIER C-137 //\|Existence is pain\|Blame Jerry\|GROUNDED IN\|ENTER DESIGNATION" src --include=*.tsx
```

Expected: no matches outside `src/shared/lore/copy.ts`. Test files may match; they are asserting on rendered output, which is correct.

- [ ] **Step 7: Commit**

```bash
git add src/shared/lore/copy.ts src/shared/lore/copy.test.ts src/app src/pages src/features
git commit -m "refactor: move page and layout copy into the lore registry"
```

---

## Task 12: The Konami easter egg

Spec §11.3: typing `wubbalubbadubdub` anywhere switches the dimension to `cronenberg`. It writes through the ordinary settings setter, so it persists and the dimension wave plays exactly as it does from the panel.

**Files:**
- Create: `src/shared/hooks/useKonami.ts`
- Create: `src/shared/hooks/useKonami.test.tsx`
- Modify: `src/app/AppLayout.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/shared/hooks/useKonami.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { useKonami } from './useKonami'

function Probe({ onMatch }: { onMatch: () => void }) {
  useKonami(onMatch)
  return <input aria-label="somewhere" />
}

describe('useKonami', () => {
  it('fires when the phrase is typed', async () => {
    const user = userEvent.setup()
    const onMatch = vi.fn()
    render(<Probe onMatch={onMatch} />)

    await user.type(screen.getByLabelText('somewhere'), 'wubbalubbadubdub')

    expect(onMatch).toHaveBeenCalledTimes(1)
  })

  it('ignores case and tolerates a false start', async () => {
    const user = userEvent.setup()
    const onMatch = vi.fn()
    render(<Probe onMatch={onMatch} />)

    await user.type(screen.getByLabelText('somewhere'), 'xyzWUBBALUBBADUBDUB')

    expect(onMatch).toHaveBeenCalledTimes(1)
  })

  it('stays quiet on a partial phrase', async () => {
    const user = userEvent.setup()
    const onMatch = vi.fn()
    render(<Probe onMatch={onMatch} />)

    await user.type(screen.getByLabelText('somewhere'), 'wubbalubba')

    expect(onMatch).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- useKonami`
Expected: FAIL — `./useKonami` does not resolve.

- [ ] **Step 3: Write the hook**

Create `src/shared/hooks/useKonami.ts`:

```ts
import { useEffect, useRef } from 'react'

/** Spec section 11.3. Typed anywhere, including inside an input. */
export const KONAMI_PHRASE = 'wubbalubbadubdub'

/**
 * A rolling buffer rather than an index: a false start costs nothing, because
 * only the last N characters are ever compared. Non-printing keys are ignored
 * so Shift and the arrows do not break a run.
 */
export function useKonami(onMatch: () => void): void {
  const buffer = useRef('')

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.length !== 1) return

      buffer.current = (buffer.current + event.key.toLowerCase()).slice(
        -KONAMI_PHRASE.length,
      )

      if (buffer.current === KONAMI_PHRASE) {
        buffer.current = ''
        onMatch()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onMatch])
}
```

- [ ] **Step 4: Run the test**

Run: `npm test -- useKonami`
Expected: PASS, three cases.

- [ ] **Step 5: Wire it into the layout**

In `src/app/AppLayout.tsx`:

```tsx
import { useKonami } from '../shared/hooks/useKonami'
import { useSettings } from '../shared/settings/useSettings'
```

```tsx
  const { setSetting } = useSettings()

  const openSearch = useCallback(() => setSearchOpen(true), [])
  useSearchHotkey(openSearch)

  // Spec section 11.3. It writes through the ordinary setter, so the choice
  // persists and the dimension wave plays exactly as it does from the panel.
  const toCronenberg = useCallback(
    () => setSetting('dimension', 'cronenberg'),
    [setSetting],
  )
  useKonami(toCronenberg)
```

- [ ] **Step 6: Prove the wiring**

Append to `src/app/AppLayout.test.tsx`, inside `describe('AppLayout', …)`:

```tsx
  it('switches to cronenberg when the phrase is typed', async () => {
    const user = userEvent.setup()
    renderAt('/characters')

    await user.keyboard('wubbalubbadubdub')

    expect(document.documentElement).toHaveAttribute('data-dimension', 'cronenberg')
  })
```

Run: `npm test -- AppLayout`
Expected: PASS. `SettingsProvider` writes `data-dimension` on the document element, which is where the assertion looks. If a later test in the file depends on the default dimension, reset it in that test's setup rather than weakening this assertion.

- [ ] **Step 7: Commit**

```bash
git add src/shared/hooks/useKonami.ts src/shared/hooks/useKonami.test.tsx src/app/AppLayout.tsx src/app/AppLayout.test.tsx
git commit -m "feat: add the wubbalubbadubdub dimension easter egg"
```

---

## Task 13: The contrast pass, as a test rather than a promise

Observation 8 and spec §12.1. Muted text was validated against `--bg` in plan 1 and against `--raised` afterwards, but `--accent` and `--dead` were never checked on the raised surface, and the chat and dossier blocks put small `text-accent` and `text-dead` type directly on `bg-surface`.

Measured before writing this task, every token against all three surfaces:

| Dimension | Token | on `--bg` | on `--surface` | on `--raised` |
|---|---|---|---|---|
| `c-137` | `--dead` | 4.89 | **4.02** | **3.60** |
| `cronenberg` | `--accent` | 4.60 | **3.82** | **3.16** |
| `cronenberg` | `--dead` | 4.60 | **3.82** | **3.16** |

Everything else clears 4.5 in the worst case; `c-137`'s muted-on-raised is the tightest pass at 4.72. The three failures get new values, and a test locks the whole grid so the next colour change cannot quietly reopen this.

**Files:**
- Create: `src/shared/design/contrast.ts`
- Create: `src/shared/design/contrast.test.ts`
- Modify: `src/index.css`
- Modify: `docs/design/tokens.md`

- [ ] **Step 1: Write the failing test**

Create `src/shared/design/contrast.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import css from '../../index.css?raw'
import { contrastRatio, parseDimensions } from './contrast'

/** WCAG AA for body text. Every token here is used at 12–14 px somewhere. */
const AA = 4.5

const SURFACES = ['bg', 'surface', 'raised'] as const
const FOREGROUNDS = ['fg', 'muted', 'accent', 'link', 'alive', 'dead', 'highlight'] as const

describe('dimension contrast', () => {
  const dimensions = parseDimensions(css)

  it('parses all three dimensions out of index.css', () => {
    expect(Object.keys(dimensions).sort()).toEqual(['c-137', 'citadel', 'cronenberg'])
  })

  it.each(Object.keys(dimensions))('%s clears AA on every surface', (name) => {
    const tokens = dimensions[name]

    for (const foreground of FOREGROUNDS) {
      for (const surface of SURFACES) {
        const ratio = contrastRatio(tokens[foreground], tokens[surface])
        expect(
          ratio,
          `${name}: --${foreground} on --${surface} is ${ratio.toFixed(2)}`,
        ).toBeGreaterThanOrEqual(AA)
      }
    }
  })
})

describe('contrastRatio', () => {
  it('puts black on white at 21', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1)
  })

  it('is symmetric', () => {
    expect(contrastRatio('#A7CB56', '#2E3B2C')).toBeCloseTo(
      contrastRatio('#2E3B2C', '#A7CB56'),
      5,
    )
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- contrast`
Expected: FAIL — `./contrast` does not resolve.

- [ ] **Step 3: Write the module**

Create `src/shared/design/contrast.ts`:

```ts
/**
 * The dimensions are defined once, in CSS, and read from there — a second
 * copy of the palette in TypeScript would be the thing that drifts.
 */
export type Tokens = Record<string, string>

const BLOCK = /(?::root,\s*)?\[data-dimension="([^"]+)"\]\s*\{([^}]*)\}/g
const VARIABLE = /--([a-z-]+):\s*(#[0-9A-Fa-f]{6})/g

export function parseDimensions(css: string): Record<string, Tokens> {
  const dimensions: Record<string, Tokens> = {}

  for (const [, name, body] of css.matchAll(BLOCK)) {
    const tokens: Tokens = {}
    for (const [, key, value] of body.matchAll(VARIABLE)) tokens[key] = value
    if (Object.keys(tokens).length > 0) dimensions[name] = tokens
  }

  return dimensions
}

function channel(value: number): number {
  const c = value / 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

/** WCAG 2.1 relative luminance. */
export function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrastRatio(a: string, b: string): number {
  const first = luminance(a)
  const second = luminance(b)
  const lighter = Math.max(first, second)
  const darker = Math.min(first, second)
  return (lighter + 0.05) / (darker + 0.05)
}
```

- [ ] **Step 4: Run it and watch the three real failures**

Run: `npm test -- contrast`
Expected: the `c-137` and `cronenberg` cases fail, naming `--dead on --surface`, `--dead on --raised`, `--accent on --surface` and `--accent on --raised`. `citadel` passes.

- [ ] **Step 5: Correct the three tokens**

In `src/index.css`:

```css
:root,
[data-dimension="c-137"] {
  …
  --dead: #E8AEA6;
}
```

```css
[data-dimension="cronenberg"] {
  …
  --accent: #E0A99E;
  --accent-hover: #EBC4BB;
  --dead: #E0A99E;
}
```

Measured: `c-137 --dead` reaches 6.21 / 5.10 / 4.58, and `cronenberg --accent` and `--dead` reach 7.36 / 6.10 / 5.04. Both stay in the same salmon family as before, so nothing about the direction changes — they are lifted, not replaced.

- [ ] **Step 6: Run the test again**

Run: `npm test -- contrast`
Expected: PASS — five cases, sixty-three ratios checked.

- [ ] **Step 7: Record the values**

Add a section to `docs/design/tokens.md`:

```markdown
## Plan 5 contrast correction

Every token is now checked against all three surfaces by
`src/shared/design/contrast.test.ts`, which parses `src/index.css` — there is
no second copy of the palette to drift.

Three values were lifted to clear 4.5:1 on `--raised`, where small `text-accent`
and `text-dead` type sits in the chat, the dossier block and the error states:

| Dimension | Token | Was | Now | Worst ratio |
|---|---|---|---|---|
| `c-137` | `--dead` | `#DB958C` | `#E8AEA6` | 4.58 |
| `cronenberg` | `--accent` | `#C07E72` | `#E0A99E` | 5.04 |
| `cronenberg` | `--accent-hover` | `#D29387` | `#EBC4BB` | 6.03 |
| `cronenberg` | `--dead` | `#C07E72` | `#E0A99E` | 5.04 |

The tightest pass in the whole grid is now `c-137`'s `--muted` on `--raised`, at 4.72.
```

- [ ] **Step 8: Look at all three dimensions**

Run `npm run dev`, open the hub, and switch through `C-137`, `Citadel` and `Cronenberg-1` in the portal gun panel. The cronenberg accent is now a lighter salmon: confirm the header, the portal and the `FIELD ASSESSMENT` label still read as the same design, not a different one. If the lift reads as washed out, choose `#DFA79C` instead — it clears 4.95 on `--raised` and is one step darker.

- [ ] **Step 9: Commit**

```bash
git add src/shared/design src/index.css docs/design/tokens.md
git commit -m "fix: lift accent and dead tokens to AA on every surface, enforced by test"
```

---

## Task 14: The mobile pass — shell, hub and pagination

Item 4 on the plan-5 agenda, plus the half of observation 8 that was never run. Everything in Tasks 14–15 is verified at 375 px in a real browser: asserting Tailwind class strings in Vitest tests the plan, not the behaviour, so these two tasks add no unit tests. `npm test` and `npm run build` must still be green at the end of each.

**Files:**
- Modify: `src/app/AppLayout.tsx`, `src/pages/HubPage.tsx`, `src/shared/ui/Pagination.tsx`

- [ ] **Step 1: See the problem**

Run `npm run dev`, open the browser device toolbar at 375 × 812, and load `/`. Note what overflows. The expected findings, from reading the markup: the header nav is a single non-wrapping row of six items with `ml-auto` on the search button, and the hub's statistics strip is `grid-cols-2 sm:grid-cols-5`, which crams five figures into a 640 px row.

- [ ] **Step 2: Let the header wrap**

In `src/app/AppLayout.tsx`:

```tsx
          <nav
            aria-label={COPY.layout.navLabel}
            className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4 sm:px-6"
          >
```

and give the section list its own wrapping:

```tsx
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
```

The two buttons keep `ml-auto` on the search button — with `flex-wrap` they drop to a second row together rather than squeezing the nav.

- [ ] **Step 3: Loosen the hub**

In `src/pages/HubPage.tsx`:

```tsx
    <main className="mx-auto max-w-[1280px] space-y-12 px-4 py-10 sm:px-6 sm:py-16">
```

```tsx
        <h1 className="text-fg text-3xl font-bold tracking-tight sm:text-4xl">
```

```tsx
          <dl className="grid grid-cols-2 gap-6 border border-line bg-surface p-4 sm:grid-cols-3 sm:p-6 lg:grid-cols-5">
```

- [ ] **Step 4: Tighten pagination**

In `src/shared/ui/Pagination.tsx`:

```tsx
    <nav
      aria-label={COPY.pagination.label}
      className="flex flex-wrap items-center justify-center gap-2 py-6 sm:gap-4"
    >
```

- [ ] **Step 5: Check at three widths**

At 375, 768 and 1280 px, on `/` and `/characters`: nothing overflows horizontally, the header stays legible, and the statistics strip reads as 2 / 3 / 5 columns. Confirm there is no horizontal scrollbar at 375 px.

- [ ] **Step 6: Run the suites and commit**

```bash
npm test
npm run build
git add src/app/AppLayout.tsx src/pages/HubPage.tsx src/shared/ui/Pagination.tsx
git commit -m "fix: make the shell, hub and pagination work at 375px"
```

---

## Task 15: The mobile pass — search, chat and filters

**Files:**
- Modify: `src/features/search/SearchOverlay.tsx`, `PortalSearch.tsx`
- Modify: `src/features/ai/ChatPanel.tsx`
- Modify: `src/pages/SearchPage.tsx`, `src/pages/AskPage.tsx`
- Modify: `src/features/characters/CharacterFilters.tsx`, `src/features/locations/LocationFilters.tsx`, `src/features/episodes/EpisodeFilters.tsx`

- [ ] **Step 1: Give the overlay room**

In `src/features/search/SearchOverlay.tsx`:

```tsx
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24"
```

```tsx
      <div className="relative w-full max-w-[640px] px-4 sm:px-6">
```

- [ ] **Step 2: Stop the input row from crushing itself**

A flex row of an input and a button collapses the input toward zero at narrow widths, because a flex item's `min-width` defaults to `auto` and the placeholder is long. In `src/features/search/PortalSearch.tsx`, add `min-w-0` to the input's class list:

```tsx
          className="text-fg placeholder:text-muted w-full min-w-0 border border-line bg-surface px-4 py-3 font-mono text-sm outline-none focus:border-accent"
```

Do the same to the chat input in `src/features/ai/ChatPanel.tsx`:

```tsx
          className="text-fg placeholder:text-muted w-full min-w-0 border border-line bg-surface px-4 py-3 font-mono text-sm outline-none focus:border-accent"
```

- [ ] **Step 3: Let the chat header wrap**

The persona name and the two-button voice switch share one row. In `src/features/ai/ChatPanel.tsx`:

```tsx
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
```

- [ ] **Step 4: Loosen the two page shells**

`src/pages/SearchPage.tsx`:

```tsx
    <main className="mx-auto max-w-[1280px] space-y-8 px-4 py-10 sm:px-6">
```

`src/pages/AskPage.tsx`:

```tsx
    <main className="mx-auto max-w-[840px] space-y-8 px-4 py-10 sm:px-6">
```

- [ ] **Step 5: Make the name field full-width when it wraps**

The three filter bars are already `flex-wrap`, but their text fields carry fixed widths. In `src/features/characters/CharacterFilters.tsx`, pass a responsive width to the name field:

```tsx
        width="w-full sm:w-56"
```

Leave the species field at `w-40` — a species box does not need to fill a phone row when the name box above it already does. Apply the same treatment to the name field in `LocationFilters.tsx` and `EpisodeFilters.tsx`, and give each bar's container room to breathe:

```tsx
    <div className="flex flex-wrap items-end gap-3 border border-line bg-surface p-3 sm:gap-4 sm:p-4">
```

`TextFilter` already interpolates `width` into its class list, so no change is needed there.

- [ ] **Step 6: Check every page at 375 px**

Walk `/`, `/characters`, `/characters/1`, `/locations`, `/episodes`, `/search?q=rick`, `/ask?q=who is Birdperson?` and the `⌕ SEARCH` overlay. Requirements: no horizontal scrollbar anywhere, every input at least 200 px wide, the source cards under an answer wrap rather than overflow, and the filter bar reachable by keyboard in the same order it reads.

- [ ] **Step 7: Run the suites and commit**

```bash
npm test
npm run build
git add src/features src/pages
git commit -m "fix: make search, chat and the filter bars work at 375px"
```

---

## Task 16: Checkpoint — everything green, everything pushed

**Files:** none.

- [ ] **Step 1: Run all four, one at a time**

```bash
npm test
npm run test:api
npm run lint
npm run build
```

Expected: frontend passing with roughly a dozen cases added since plan 4, backend 155, 0 lint errors, clean build.

- [ ] **Step 2: Confirm the boundary still holds**

```bash
grep -rn "rickandmortyapi" dist/assets || echo "clean"
grep -rn "xai-" dist/assets || echo "clean"
```

Expected: `clean` twice.

- [ ] **Step 3: Push**

```bash
git push
```

Wait for the Vercel deploy, then load https://dossier-c137.vercel.app and confirm the hub renders with live figures.

---

## Task 17: The plan-3 walkthrough, finally run

Item 9 on the agenda. The checklist is plan 3, task 22, steps 4 and 5, and it has never been run against a deployed build.

**Files:**
- Create: `docs/superpowers/plans/2026-08-20-walkthrough-notes.md`

- [ ] **Step 1: Walk it**

Against https://dossier-c137.vercel.app, in a real browser:

1. Navigate hub → characters → a character → back. The portal fires on each forward move, the vortex is visible, and the transition ends when the data lands rather than on a timer.
2. A slow request raises a quote after 1.5 s. Throttle to `Slow 3G` in devtools to force it.
3. Switch dimension in the portal gun panel. The wave radiates from the panel, and every surface repaints — including the header, the cards and the filter bar.
4. Reload on the `citadel` dimension. **No dark flash before first paint** — the inline script in `index.html` is what prevents it.
5. Turn on `prefers-reduced-motion` at the OS level, reload, and navigate. No vortex animation, no wave, no idle pulse; navigation still works.
6. Set `REDUCED MOTION` to `ON` and `OFF` explicitly and confirm each overrides the system preference.
7. Turn `PORTAL TRANSITIONS` off. Links become ordinary links and navigation is instant.
8. Turn `PORTAL SFX` on and navigate. A whoosh plays. Turn it off and confirm silence.
9. `Esc` closes the settings panel and focus returns to the mini gun.

- [ ] **Step 2: Walk the plan-4 and plan-5 surfaces too**

10. `Ctrl+K`, type `rick`, arrow down, Enter — the portal fires into the character page.
11. `Tab` repeatedly while the overlay is open: focus never lands on anything behind it. This is Task 6's fix, live.
12. `/search?q=r` shows the two-character line, not skeletons. This is Task 4's fix, live.
13. `/search?q=rick` shows `rick` in the box. Task 5's fix, live.
14. `GENERATE DOSSIER` on a character, then reload and press it again — the second is instant and `cached: true` in the network tab.
15. Ask the same question as Rick and as Morty. The openings differ.
16. Ask `who is Gandalf the Grey?` — empty sources, and nobody invented.
17. Type `wubbalubbadubdub` on the hub. The dimension turns cronenberg and survives a reload.
18. All three dimensions on `/ask` with an answer on screen: the persona name, the source cards and any error line are legible. Task 13's fix, live.

- [ ] **Step 3: Write down what you found**

Create `docs/superpowers/plans/2026-08-20-walkthrough-notes.md` with one line per numbered item: `PASS`, or `FAIL` with what you saw. Anything that fails and is small gets fixed in Task 19; anything that fails and is not small becomes a known-issues line in the README.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/plans/2026-08-20-walkthrough-notes.md
git commit -m "docs: record the plan 3 and plan 5 walkthrough results"
```

---

## Task 18: The README

The assignment grades this document. It is written now, with the walkthrough fresh, and revised once more at Task 20.

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write it**

Create `README.md` with exactly these sections, in this order. Spec §15 fixes the list; the content below is the content to write, not a sketch of it.

````markdown
# Dossier C-137

A Rick and Morty archive browser, presented as an internal terminal of the
Citadel of Ricks. Characters, locations and episodes — searchable, cross-linked,
and answerable in Rick's or Morty's voice, with every answer grounded in the
records.

**Live:** https://dossier-c137.vercel.app
**API:** https://coeupddmmjnjotarlnwg.supabase.co/functions/v1/api/health

*(screenshots: the hub, a character dossier, the search overlay, the chat, and
the three dimensions side by side)*

## What it does

- **Three sections** — characters, locations, episodes — each with filters, pagination and skeleton loading.
- **Detail pages arrive whole.** A character dossier carries its origin, its last known location and every episode it appears in; the frontend never fans out into a dozen follow-up requests.
- **Search across all three entity types at once**, from `⌘K` / `Ctrl+K`, from the header, or from the hub.
- **A grounded AI chat.** Ask a question in English; the server retrieves real records first and hands the model those records as its only permitted source of facts. The sources are shown, and they are clickable.
- **A generated field assessment on every character**, in the voice you chose, written once and stored forever.
- **Three dimensions instead of two themes** — `C-137` (dark), `Citadel` (light), `Cronenberg-1` (dark) — persisted, and applied before first paint so a light-theme visitor never sees a dark flash.
- **The portal transition is the loading indicator.** It lasts exactly as long as the request behind it.

## Every external call happens on the server

The assignment's central requirement. The Rick and Morty API is called only
from `supabase/functions/api/clients/rmClient.ts`, inside the Edge Function. The
browser talks to our own API and nothing else.

This is enforced, not promised: an ESLint rule (`eslint.config.js`) fails the
build on the string `rickandmortyapi.com` anywhere under `src/`, and the
deployed bundle is checked for it:

```bash
npm run lint
npm run build && grep -r "rickandmortyapi" dist/assets || echo "clean"
```

## Running it locally

```bash
git clone https://github.com/Ba5bit/dossier-c137
cd dossier-c137
npm install
cp .env.example .env.local     # then fill in the values below
npm run dev
```

`.env.local` (frontend, Vite — anything `VITE_`-prefixed reaches the browser, so no provider key ever goes here):

| Variable | What it is |
|---|---|
| `VITE_API_BASE` | The Edge Function base URL, e.g. `https://<ref>.supabase.co/functions/v1/api` |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |

`supabase/functions/.env` (backend secrets, gitignored, never in the bundle):

| Variable | What it is |
|---|---|
| `XAI_API_KEY` | Grok API key. Without it the archive still works; only the two AI endpoints answer 502 |
| `IP_HASH_SALT` | Salt for the per-caller quota digest. Addresses are hashed, never stored |
| `SUPABASE_SERVICE_ROLE_KEY` | Supplied by the platform at runtime |

Database and function:

```bash
npx supabase db push                                # cache_entries, ai_dossiers, ai_usage
npx supabase secrets set --env-file supabase/functions/.env
npx supabase functions deploy api --no-verify-jwt
```

### Commands

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm test` | Frontend suite (Vitest + RTL + MSW). **Does not type-check** |
| `npm run test:api` | Backend suite (Deno test) |
| `npm run lint` | ESLint, including the API-boundary rule |
| `npm run build` | `tsc -b && vite build` — the only thing that type-checks |

## Architecture

```
Browser ──► Vercel (React SPA)
              │  fetch
              ▼
        Supabase Edge Function  ──►  rickandmortyapi.com
        router → handler → service → client
              │                        ▲
              │  cache / dossiers /    │
              ▼  usage counters        │
        Supabase Postgres ─────────────┘
              ▲
              └── Grok (xAI) for the two AI endpoints
```

**Backend** (`supabase/functions/api/`), eleven endpoints, one layer per concern:

| | |
|---|---|
| `GET /health` | liveness |
| `GET /characters`, `/locations`, `/episodes` | filtered, paginated lists |
| `GET /characters/:id`, `/locations/:id`, `/episodes/:id` | a detail with its relations already expanded |
| `GET /stats` | five upstream counts aggregated behind one cache key. Nothing on the hub is hardcoded |
| `GET /search?q=` | three parallel name queries as one cached aggregate |
| `POST /dossier` | write-once character assessment, stored per `(entity, persona, prompt version)` |
| `POST /ask` | grounded answer, streamed as Server-Sent Events |

**Cache.** Every upstream response is stored in Postgres for 24 h, keyed by
sorted parameters. On an upstream failure a stale entry is served rather than an
error, with an `X-Cache: stale` header.

**Frontend** (`src/`): `pages/` compose only, queries live in hooks under
`features/`, and `shared/` knows nothing about specific entity types. Every
route is code-split. All user-facing text lives in `src/shared/lore/copy.ts`.

## Things done differently

**The portal transition is the loader.** A state machine (`usePortalMachine`)
binds the transition to `useIsFetching`, with a 300 ms floor so it never flickers
and an 8 s ceiling so it never hangs. A request that outlives 1.5 s raises a
quote. There is no animation library: CSS keyframes hang off a `data-phase`
attribute and the vortex is a canvas.

**The AI is grounded, not asked nicely.** `/api/ask` searches the literal
question first, widens to extracted terms only if that found nothing, caps at six
records, and hands the model a `CONTEXT` block as its only permitted knowledge.
When nothing matched, the context says so rather than being omitted. Ask it about
Gandalf and it invents nobody — and shows you it had no sources.

**Dossiers are permanent and versioned.** The primary key includes the persona
and a prompt version, so rewording a prompt writes new rows beside the old ones
instead of orphaning them.

**Themes are dimensions.** One light and two dark, applied by an inline script
before first paint. Contrast is not a matter of opinion here: a test parses
`src/index.css` and checks all seven foreground tokens against all three surfaces
in all three dimensions.

**The boundary is a lint rule**, which turns the assignment's central
requirement into something automatically verified rather than a matter of trust.

## Stack, and what it cost

| Layer | Choice |
|---|---|
| Build / UI | Vite, React 19, TypeScript |
| Routing | React Router v7 (URL holds all filter state) |
| Data | TanStack Query |
| Styling | Tailwind v4 + CSS custom properties |
| Backend | Supabase Edge Functions (Deno) |
| Storage | Supabase Postgres — cache, dossiers, quota counters |
| Text AI | Grok (xAI) |
| Hosting | Vercel (frontend), Supabase (function) |

**Trade-offs, honestly:**

1. **Vite + Supabase instead of Next.js fullstack.** Gave up SSR, a single deployment and Suspense-native loading. Gained a stack already known well, on a deadline, plus Postgres as a natural cache. Familiarity beat theoretical elegance.
2. **An SPA with no SSR.** First paint is marginally slower and there is nothing for a crawler. Irrelevant for this project.
3. **Grok over Gemini.** A smaller free tier, chosen because tone is the entire point of the feature and Gemini smooths it away.
4. **Postgres as the cache instead of Redis.** Slower, one fewer service. The data is static; the difference is immaterial.
5. **Two deployments instead of one.** Accepted deliberately, for the same reason as (1).
6. **No animation library.** The state machine already owns every duration, so Framer Motion would have been 50 kB for CSS that already existed.

## Known issues

- **Speech was cut.** The design allowed for narrated dossiers via ElevenLabs. It was dropped rather than half-built: a second paid provider, with its own failure modes and quota, for a button nobody grades. The AI bonus is carried by the grounded chat and the dossiers, which are the parts that actually show retrieval and prompt work.
- **Edge Function cold starts** add 200–500 ms to the first request after an idle period. The portal transition absorbs it, but on a cold hub the first load is visibly slower.
- **AI daily quotas.** 30 questions and 10 dossier generations per caller per day, plus a global ceiling of 500. Exhausting one returns a portal-gun-out-of-fluid message, not an error page. Generations count against the ceiling; reading a stored dossier does not.
- **No SSR**, so the first paint waits for JavaScript.
- **The first `Ctrl+K` after typing a URL** can be swallowed by the browser's address bar, which still holds focus. Click once in the page, or use the `⌕ SEARCH` button.
- **The two AI voices are more distinct on dossiers than in chat.** A dossier has no conversation history to mirror and a more evaluative instruction; a narrow factual question in chat pulls both voices toward the same plain sentence.
- **Half of all origins are `unknown`** upstream. The redaction bar is a routine field state here, not a flourish.

## How it was built

Design first, code second. The requirements went through a brainstorm, then a
full written specification, then five implementation plans, each executed
test-first with the tests written before the code.

| Document | What it settles |
|---|---|
| [`docs/superpowers/specs/2026-08-19-dossier-c137-design.md`](docs/superpowers/specs/2026-08-19-dossier-c137-design.md) | The whole design, with a table mapping every assignment requirement to a section |
| [`docs/superpowers/plans/`](docs/superpowers/plans/) | Five plans: foundation, entities, portal, AI, polish |
| [`docs/design/tokens.md`](docs/design/tokens.md) | Ten source colours, three palettes, every pair contrast-checked |
| [`docs/design/visual-direction.md`](docs/design/visual-direction.md) | The direction taken, the alternatives rejected, and why |

Roughly 400 tests across the two suites — the frontend under Vitest with MSW,
the backend under Deno test against stubbed clients. Effort concentrates on
branching logic: filter parsing, cache keys, the portal state machine, retrieval
and grounding, quota accounting.
````

- [ ] **Step 2: Fill in the real numbers**

Replace the "roughly 400 tests" line with the actual figures from `npm test` and `npm run test:api`, and paste the live counts from `/api/stats` if you quote any.

- [ ] **Step 3: Take the screenshots**

Five, at 1280 px, saved under `docs/screenshots/`: the hub, a character dossier with a generated field assessment, the search overlay mid-query, the chat with source cards, and the three dimensions side by side. Reference them from the top section with relative paths.

- [ ] **Step 4: Read it once as a stranger**

Every command must run as written from a clean clone. Every link must resolve. Every claim must be one the code actually supports — a README that overstates is worse than one that omits.

- [ ] **Step 5: Commit**

```bash
git add README.md docs/screenshots
git commit -m "docs: write the README"
```

---

## Task 19: Fix whatever the walkthrough turned up

**Files:** whatever Task 17 named.

- [ ] **Step 1: Triage**

Read `docs/superpowers/plans/2026-08-20-walkthrough-notes.md`. Anything marked `FAIL` is either small — a one-file fix with an obvious test — or it is not.

- [ ] **Step 2: Fix the small ones, test first**

For each: write the failing test, run it, fix, run it, commit separately. Do not batch unrelated fixes into one commit.

- [ ] **Step 3: Write the rest into the README**

Anything not fixed becomes a known-issues line in `README.md`, phrased the way the existing ones are: what happens, and why it is acceptable.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "fix: address the walkthrough findings"
```

If nothing failed, skip the commit and say so.

---

## Task 20: Ship

**Files:** `README.md`, `START-HERE.md`

- [ ] **Step 1: Final green run**

One at a time:

```bash
npm test
npm run test:api
npm run lint
npm run build
```

- [ ] **Step 2: Revise the known issues once more**

Anything Task 19 fixed comes out of the list; anything it deferred goes in. The list must describe the deployed build, not the plan.

- [ ] **Step 3: Bring the handoff note up to date**

Rewrite `START-HERE.md`'s **Current state**, **Immediate next step** and **Open observations** sections for a project whose five plans are all complete. Observations 1–8 are closed; observation 9 — the exposed xAI key — stays until the user rotates it.

- [ ] **Step 4: Push and tag**

```bash
git add README.md START-HERE.md
git commit -m "docs: close out plan 5"
git push
git tag plan-5-polish
git push --tags
```

- [ ] **Step 5: Confirm the deployment**

Load https://dossier-c137.vercel.app once more: the hub renders live figures, a character dossier generates, `Ctrl+K` opens the overlay, and all three dimensions survive a reload.

- [ ] **Step 6: Remind the user about the key**

The xAI key was pasted into a session transcript on 2026-08-20 and is still live. Rotating it needs three steps only the user can run:

```
!# rotate at console.x.ai, put the new value in supabase/functions/.env, then:
!npx supabase secrets set --env-file supabase/functions/.env
!npx supabase functions deploy api --no-verify-jwt
```
