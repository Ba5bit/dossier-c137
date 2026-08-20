# Design review — what is fixed and what is left

Run 2026-08-20 against the dev server at 1280px and 375px, with the live API
behind it. Five findings fixed and committed; the rest are recorded here with
the evidence, so the next session can pick them up without re-measuring.

## Fixed

| ID | Finding | Commit |
|---|---|---|
| 001 | Header tap targets were 16–26px; `ASK` was 22×16. Now 44×44 under `(pointer: coarse), (max-width: 640px)` | `b28cb03` |
| 002 | The ask page opened on an empty void. Four grounded opener questions now teach the interaction | `7ea8a46` |
| 003 | The hub printed LOCATIONS 126 and EPISODES 51 twice on one screen | `b950ccd` |
| 004 | Character field list had no measure cap; label at x=348, value at x=1256 | `ba3b911` |
| 005 | The AI field assessment sat below 51 episode rows | `ba3b911` |

## Left, in impact order

**FINDING-006 — pagination buttons are both called "JUMP" (medium).**
`src/shared/ui/Pagination.tsx`. Previous and next read `← JUMP` and `JUMP →`,
so direction lives entirely in an arrow glyph, and the disabled previous
button is near-invisible against the surface. Give them distinct labels and
raise the disabled contrast.

**FINDING-007 — the filter bar mixes two type systems (medium).**
`CharacterFilters.tsx`, `LocationFilters.tsx`, `EpisodeFilters.tsx`. Labels
render sentence-case in Space Grotesk ("Search by name", "Status") while every
other label on the site is uppercase JetBrains Mono. The placeholders inside
those same fields are uppercase mono. Pick one, and it should be the mono.

**FINDING-008 — the site is green, which its own tokens forbid (medium).**
`docs/design/tokens.md` states the governing rule "the site must not be green"
and budgets 5–8% for Rick blue and Morty yellow. Measured on the hub, the
whole page renders in six colours, three of them green, and neither `--link`
nor `--highlight` appears at all. FINDING-002 put the first blue on the ask
page. The hub still needs it: the figures, the registry numbers, or the
active nav item are the natural candidates.

**FINDING-009 — placeholder is the only visible label (medium).**
The hub search and the ask input carry `aria-label` but no visible label, so
the prompt disappears the moment the visitor types. Screen readers are fine;
sighted users lose the context.

**FINDING-010 — duplicate source cards are indistinguishable (polish).**
Asking "Who is Birdperson?" returns two cards both reading `Birdperson`
(ids 47 and 599). Add the registry number or the species to disambiguate.

**FINDING-011 — two empty-value treatments (polish).**
Character cards use a redaction bar for an unresolved origin; the detail page
uses an em dash for an empty type. One of them should win.

**FINDING-012 — "unknown" is lowercase beside "Alive" and "Dead" (polish).**
Upstream casing, rendered raw. Normalise at the display layer.

## Not a finding, but worth knowing

`npm run dev` reports `domParse` around 7.9s because Vite serves unbundled
modules. That number is a dev-server artifact and says nothing about
production; measure the Vercel deployment if you want a real LCP.
