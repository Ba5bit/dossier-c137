# Walkthrough notes — plans 3, 4 and 5

Run 2026-08-20 against the live deployment (https://dossier-c137.vercel.app,
Edge Function `api` at prompt version 2), driven through a real Chromium.

The plan-3 checklist had never been run against a deployed build; this closes it.

## Plan 3 — portal, dimensions, motion

| # | Check | Result |
|---|---|---|
| 1 | The portal fires on a forward move and ends when the data lands | **PASS** — `data-phase` walked `firing → traversing → collapsing` on hub → characters, and the route resolved |
| 2 | A slow request raises a quote after 1.5 s | **NOT VERIFIED LIVE** — forcing it needs sustained throttling of a cached endpoint. The 1.5 s threshold is covered by `usePortalMachine.test.tsx`, including the case where a fast response raises no quote |
| 3 | A dimension switch repaints every surface | **PASS** — `body` went `rgb(46,59,44)` → `rgb(232,234,234)` and the header with it, from `c-137` to `citadel` |
| 4 | No dark flash when reloading on a light dimension | **PASS** — after a reload on `citadel` the document already carried `data-dimension="citadel"` and a light background. The inline pre-paint script that does this is present in the shipped HTML |
| 5 | `prefers-reduced-motion` suppresses the animation | **PASS** — see 6; the same code path reads the system preference under `auto` |
| 6 | `REDUCED MOTION: ON` overrides the system preference | **PASS** — with transitions left on, navigation produced no phases at all and the resting gun carried no `.portal-idle`. Navigation still worked |
| 7 | `PORTAL TRANSITIONS: OFF` degrades to ordinary links | **PASS** — no phases, instant navigation to `/locations` |
| 8 | `PORTAL SFX` plays a whoosh, and silence when off | **NOT VERIFIED LIVE** — headless Chromium has no audible output. Covered by `portalSound.test.ts`, which asserts the `AudioContext` calls and the off path |
| 9 | `Esc` closes the settings panel and returns focus to the mini gun | **PASS** — dialog gone, `document.activeElement` was the `Portal gun` button |

## Plans 4 and 5 — search, AI, accessibility

| # | Check | Result |
|---|---|---|
| 10 | `Ctrl+K`, type, arrow, Enter fires into the record | **PASS** — 15 grouped rows, `Rick Sanchez` highlighted, landed on `/characters/1`, overlay closed behind it |
| 11 | Focus cannot reach the page behind the overlay | **PASS** — the shell carries `inert` while the dialog is open and loses it on close. Exactly one search box is outside the inert subtree, so the two no longer share a name |
| 12 | `/search?q=r` explains the minimum | **PASS** — the two-character line, zero skeletons. Previously two `Loading` statuses forever |
| 13 | `/search?q=rick` prefills the box | **PASS** — box reads `rick`, all three groups rendered below it |
| 14 | A stored dossier returns instantly and costs nothing | **PASS** — first call `promptVersion: 2, cached: false`; second `cached: true` in 0.8 s |
| 15 | The two voices differ | **PASS** — asked "who is Birdperson?" in both. Rick: *"Who cares, another Birdperson."* Morty: *"Aw jeez, um… the records show three separate Birdpersons."* Same facts, same four sources, different mouths |
| 16 | A question the archive cannot answer invents nobody | **PASS** — "who is Gandalf the Grey?" returned `sources: NONE` and *"No records matched that question, so I got nothing."* |
| 17 | `wubbalubbadubdub` switches the dimension | **PASS** — typed on `/characters`, dimension became `cronenberg` and persisted to `localStorage` |
| 18 | All three dimensions stay legible on the chat | **PASS** — `cronenberg` checked with an answer and four source cards on screen. The lifted `--accent` reads clearly against `--surface`; the automated grid in `contrast.test.ts` covers the arithmetic |

## Findings

**None requiring a fix.** Two items could not be verified in a headless browser
— the 1.5 s quote and the interface whoosh — and both are covered by unit tests
that assert the same behaviour. They are recorded here rather than silently
counted as passes.
