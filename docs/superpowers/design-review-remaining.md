# Design review — findings and what closed them

Two passes, both run against the dev server at 1280px and 375px with the live
API behind it. Every finding below is closed; the evidence is kept so a later
session can tell a deliberate decision from an accident.

## Pass one — 2026-08-20, findings 001–005

| ID | Finding | Commit |
|---|---|---|
| 001 | Header tap targets were 16–26px; `ASK` was 22×16. Now 44×44 under `(pointer: coarse), (max-width: 640px)` | `b28cb03` |
| 002 | The ask page opened on an empty void. Four grounded opener questions now teach the interaction | `7ea8a46` |
| 003 | The hub printed LOCATIONS 126 and EPISODES 51 twice on one screen | `b950ccd` |
| 004 | Character field list had no measure cap; label at x=348, value at x=1256 | `ba3b911` |
| 005 | The AI field assessment sat below 51 episode rows | `ba3b911` |

## Pass two — 2026-08-20, findings 006–012

| ID | Finding | What closed it |
|---|---|---|
| 006 | Both pagination buttons read `JUMP`, and the disabled one was invisible at 40% opacity | `← PREV` / `NEXT →`, and the disabled state keeps its border and takes `--muted` instead of fading out |
| 007 | Filter labels were sentence-case Space Grotesk beside uppercase mono placeholders | Every filter label is uppercase mono with the same tracking as the rest of the site |
| 008 | The hub rendered in six colours, three of them green, and used neither `--link` nor `--highlight` | The three registry counts on the hub are `--link` |
| 009 | The hub search and the ask input had a placeholder and no visible label | Both carry a printed label that survives typing |
| 010 | Two source cards both read `Birdperson` (ids 47 and 599) | Source chips print the registry number beside the name |
| 011 | Cards redacted an empty value with a bar; detail pages used an em dash | One treatment: `REDACTED` for a withheld value, `NOT ON FILE` for one that was never held |
| 012 | `unknown` sat lowercase beside `Alive` and `Dead` | Normalised at the display layer |

## Same pass — reported from use rather than from measurement

| Finding | What closed it |
|---|---|
| A solid bar of `--fg` read as a broken image, not as a censored field — a black rectangle in the light dimension, a white one in the dark | `RedactionBar` is a word inside a dashed outline |
| The search overlay floated on a translucent scrim, so the page headline read straight through its hint text | The dialog owns an opaque panel; the scrim is `--bg` at 85% with a blur |
| The settings panel printed five settings at once, tall enough to cover the page, and was laid into the header flow so opening it pushed the page down | Three tabs — dimension, AI voice, motion — in a popover anchored to the header controls, dismissed by Escape or a click outside |
| The portal transition took the whole viewport for the length of every navigation | A 132px badge over a light blurred scrim |
| `⌘K` printed on the search control is a key a Windows visitor does not have | `CTRL K`, with the Mac glyph only on Apple platforms |
| The header gave the search control the leftovers of a nav row, and `ASK` was the fourth link in a row of registries | Search is a wide field and ask is an accent-bordered control beside it; on a phone the pair takes a full-width row of its own |
| Fifty-one episode rows on a character dossier, a hundred residents on a location | One carousel: a slide per season for episodes, pages of eight for a roster. Arrows on a desktop, swipe on a phone |
| Fifty-one episodes were reachable only by paging | A season chip row on the episodes page, on top of the title and code fields |
| A new page opened wherever the last one was scrolled to | Every route change, pagination included, starts at the top |
| Navigation depended on the browser's own back button | An in-page back/forward bar with a trail, under the header on every route but the hub |
| Portal SFX | Removed outright, along with its setting and its module |

## Not a finding, but worth knowing

`npm run dev` reports `domParse` around 7.9s because Vite serves unbundled
modules. That number is a dev-server artifact and says nothing about
production; measure the Vercel deployment if you want a real LCP.
