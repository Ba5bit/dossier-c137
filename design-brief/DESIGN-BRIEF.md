# Citadel Archive — Design Brief

## How to use this brief

Work in two steps. **Do not skip to step 2.**

**Step 1 — the design system.** Produce a single screen containing the complete design system: all three dimension palettes, the type scale, the spacing scale, and one instance of every component listed in §8, in every state. Then stop and wait for approval.

**Step 2 — the screens.** After the system is approved, produce screens one at a time, each time reusing the approved system without introducing new colors or new components.

Design for **desktop at 1440px** throughout. Mobile adaptation is a separate later step; do not attempt it now.

---

## 1. What this is

A web application for browsing characters, episodes, and locations from *Rick and Morty*.

It is presented not as a fan site but as an **internal terminal of the Citadel of Ricks archive**. The user is an archive operator. Search is entering coordinates into a portal gun. Moving between sections is a portal jump. Switching themes is switching dimensions.

The metaphor lives in presentation and wording. The navigation beneath it is entirely conventional: tabs, filters, pagination, ordinary links.

---

## 2. The governing principle

**Restrained and dense layout; wildness confined to named locations.**

Expressiveness belongs in exactly these places and nowhere else:

- The portal transition
- The boot sequence
- Empty states and error states
- The `TERMINATED` stamp on deceased characters
- The settings panel styled as a portal gun housing

Everywhere else the interface behaves like a serious tool. A grid of twenty cards must be calm enough to read. **At rest, only the status indicator animates** — everything else activates on hover.

This project is judged partly on being a *usable interface*. A beautiful screen that is exhausting to scan fails.

---

## 3. Hard constraints

### Never produce

- Purple-to-blue gradients
- Glassmorphism, frosted panels, translucent blurred cards
- Floating 3D objects, blobs, orbs
- A centered landing-page hero with two buttons
- Gradient-filled circular icons
- Border radius above 12px
- Drop shadows used as decoration
- Starfield or space-photo backgrounds
- Photographic background images of any kind
- Pixel art, 8-bit fonts, Windows 95 chrome
- Illustrations of characters — every character image comes from the API at runtime
- Large slabs of bright green

### The green rule

**This must not be a green website.** The fastest way to reduce this project to a generic "portal-green themed site" is to let the accent take over surfaces.

Portal green appears where something **activates, opens, is selected, or is in progress**. Nowhere else.

Color distribution budget:

| Share | Role |
|---|---|
| 55–65% | Background and its derived surfaces |
| 15–20% | Off-white text and Citadel teal |
| 8–12% | Portal green |
| 5–8% | Rick blue and Morty yellow |
| under 5% | Cronenberg flesh and special accents |

### Reading the terminal references

Five of the seven references in `references/` are green phosphor on black. **Take chrome, density, and typographic treatment from them. Never take their surface color.** Surfaces come from the palettes in §4.

Every layout must also hold up in the light `citadel` dimension. A design that only works dark is a failed design here.

---

## 4. Color

Ten source colors sampled from the show. **No hue outside this list may be introduced.** Borders, muted text, hover states, raised surfaces, and glows are all produced by mixing these with the background or the primary text color.

| Name | Hex | Origin |
|---|---|---|
| portal-core | `#A7CB56` | Bright lime center of the portal |
| portal-deep | `#228D44` | Deep green of the rim |
| title-dark | `#2E3B2C` | Near-black green-grey |
| labcoat | `#EAE9EA` | Rick's coat, cool off-white |
| rick-hair | `#A2D0E4` | Icy blue |
| morty-shirt | `#F3EF7C` | Dirty yellow, not neon |
| cronen-moss | `#49573D` | Rotting moss green |
| cronen-flesh | `#A7635B` | Diseased red |
| citadel-cool | `#577B80` | Grey-teal architecture |
| citadel-warm | `#CBCA78` | Faded sci-fi gold |

Three dimensions. Contrast ratios are computed and must be preserved.

### `c-137` — dark, default

```
--bg               #2E3B2C
--surface          #3A4838
--surface-raised   #414F3D
--border           #4E5C4A
--text-primary     #EAE9EA    9.75:1  AAA
--text-secondary   #BAC1B4    6.40:1  AA (4.72:1 on surface-raised)
--accent           #A7CB56    6.37:1  AA
--accent-hover     #B8D96D    7.40:1  AAA
--accent-deep      #228D44    2.60:1  fills and glows only, never text
--link             #A2D0E4    7.13:1  AAA
--highlight        #F3EF7C    9.81:1  AAA
```

### `citadel` — light

```
--bg               #E8EAEA
--surface          #F2F3F3
--surface-raised   #FBFBFB
--border           #C3CCCC
--text-primary     #22302C   11.90:1  AAA
--text-secondary   #5A6663    5.90:1  AA
--accent           #3E5A5E    6.13:1  AA
--accent-hover     #2E4649    8.20:1  AAA
--accent-portal    #4C6520    5.44:1  AA — darkened green, for green TEXT
--fill-portal      #A7CB56    1.53:1  FILL ONLY, always dark text on top
--fill-warm        #CBCA78    1.41:1  FILL ONLY, never text
```

Bright portal green **cannot carry text** on this background. Use `--fill-portal` as a background with `--text-primary` over it, or `--accent-portal` when green text is genuinely required.

### Contrast is surface-aware

Validate every color against the surface it actually lands on, not only against `--bg`. Muted text on a raised panel is the case that fails most often. The `--text-secondary` values above already pass on all three surfaces; anything you derive must do the same.

`citadel-cool` `#577B80` carrying off-white text measures 3.81:1 and fails. When the teal must sit behind text, use `#3E5A5E` (6.13:1). Otherwise restrict `#577B80` to borders, icons, and decorative panels.


### `cronenberg` — dark, easter egg

```
--bg               #23291C
--surface          #2F3726
--surface-raised   #3A4430
--border           #49573D
--text-primary     #E4E2DA   11.50:1  AAA
--text-secondary   #B4B0A3    6.89:1  AA (4.72:1 on surface-raised)
--accent           #C07E72    4.60:1  AA
--accent-hover     #D29387    5.60:1  AA
--link             #A2D0E4    9.90:1  AAA
```

### Status colors

Status is **never conveyed by color alone** — a text label always accompanies the indicator.

| Token | c-137 | citadel | cronenberg |
|---|---|---|---|
| status-alive | `#A7CB56` | `#4C6520` | `#A7CB56` |
| status-dead | `#DB958C` | `#8E4A42` | `#C07E72` |
| status-unknown | `#BAC1B4` | `#6B7370` | `#B4B0A3` |

---

## 5. Typography

Three faces, three jobs. Three is the ceiling.

**Get Schwifty** — supplied in `typeface/`. **Display only: the wordmark and page-level `h1`.** Large, rare.

Look at `typeface/specimen-11px-ILLEGIBLE-NEVER-DO-THIS.png`. That is this face at 11px, and it is unreadable. Never set interface text, labels, buttons, or body copy in it. `typeface/specimen-display-size-CORRECT-USE.png` shows its correct use, including the show's characteristic treatment: blue fill, green outer glow, soft pink drop shadow.

**Space Grotesk** — all interface text. Cards, filters, buttons, descriptions, navigation.

**JetBrains Mono** — IDs, coordinates, page numbers, episode codes, counts, status labels. This face sells the archive-terminal metaphor more than any other single decision. Use it wherever a value reads as *data*.

Spacing follows an 8px scale. Container max width 1280px.

---

## 6. Reference weighting

References are **not equal**. Weight them as follows.

### Primary — these drive the design

| File | Take from it |
|---|---|
| `01-PRIMARY-dossier-case-file-template.jpg` | **The strongest reference.** Header block of name/aliases/status, two-column label:value grid, angled `CLASSIFIED` stamp, photo zone, free-text remarks field. The detail page maps onto this almost element for element |
| `02-PRIMARY-redacted-document-bars.jpg` | Black bars struck through mid-sentence. The treatment for unknown fields and for boot-sequence text |
| `03-PRIMARY-terminal-openvms-amber-crt.jpg` | A real terminal: frames drawn from characters, section headers as inverted bars, numerals right-aligned |
| `04-PRIMARY-pipboy-tabbar-and-status-strip.jpg` | Tab bar with an underline rule, persistent bottom status strip, scanlines, phosphor bloom |
| `05-PRIMARY-dense-list-label-value-pairs.jpg` | Label:value pairs, ID codes shaped like `#01D-46(AB+)-2-1`, a packed list with a per-row action control |

### Secondary — constrained

| File | Take | Ignore |
|---|---|---|
| `06-STRUCTURE-ONLY-...-IGNORE-ALL-COLORS.jpg` | The skeleton: statistics row, data table, side rail, filter bar with a primary action | **Every color.** Its pastel palette is hostile to this project |
| `07-IDEA-ONLY-device-housing-for-settings-panel.jpg` | One idea only: a physical device housing framing a screen, for the settings panel | Everything else. It is generated pixel art |

### What is missing

None of these demonstrate contemporary interface density at the level of Linear or Vercel. Compensate deliberately: row heights of 48–56px, card padding of 16–20px, list gutters of 8–12px. Aim for a screen that holds a lot without feeling cramped.

---

## 7. Real data — design against this, not against placeholders

`data/` holds four live API responses. Use real values in every mockup. Never write "Character Name" or lorem ipsum.

Facts that must shape the layout:

**Half of all origins are `unknown`.** Ten of twenty characters on page one. The redaction bar is a routine field state, not a rare flourish. Show what a grid looks like when half its cards carry one.

**A character can appear in 51 episodes.** Rick Sanchez appears in all of them. The relation list on a detail page must survive 51 chips — design the collapse or scroll behavior deliberately.

**Longest real strings:**

| Field | Longest | Example |
|---|---|---|
| Character name | 25 | Abadango Cluster Princess |
| Location name | 29 | Earth (Replacement Dimension) |
| Dimension | 26 | Post-Apocalyptic Dimension |
| Episode name | 39 | Interdimensional Cable 2: Tempting Fate |

**Live counts:** 826 characters / 42 pages, 126 locations / 7 pages, 51 episodes / 3 pages.

**Species includes `Poopybutthole`** — one character, the sole member of that species. It earns its own badge in the filter list.

---

## 8. Component inventory — required in step 1

Every component below, in every state listed.

| Component | States required |
|---|---|
| Character card | alive, dead, unknown status; hover; with redacted origin |
| Location card | default, hover |
| Episode card | default, hover |
| Status indicator | alive (pulsing dot), dead (flat line), unknown (interference) |
| Button | primary, secondary, ghost, disabled, loading |
| Filter chip | default, active, disabled |
| Text input | empty, focused, filled, error |
| Select / dropdown | closed, open |
| Pagination | first page, middle, last page |
| Skeleton | card skeleton, text skeleton, detail-page skeleton |
| Empty state | with copy |
| Error state | with copy and retry |
| Badge | status, species, dimension variants |
| Stamp | `TERMINATED`, rotated −12° |
| Redaction bar | over an inline field value |
| Tab bar | three tabs, one active |
| Settings panel | open, in portal gun housing |
| Search input | empty, typing, with grouped results |
| Toast | info, error |

Show each in the `c-137` dimension, then show the card and the button in all three dimensions to prove the palettes work.

---

## 9. Screens — step 2, one at a time

1. **Hub** (`/`) — the portal gun, the coordinate input as hero, archive statistics, the settings entry point
2. **Search results** (`/search`) — three grouped result sections, plus an AI answer block with streaming text and source cards beneath it
3. **Character list** (`/characters`) — filter bar, card grid, pagination
4. **Character detail** (`/characters/:id`) — the dossier. Driven by reference 01
5. **Location list and detail**
6. **Episode list and detail**
7. **404** — "This dimension doesn't exist"
8. **Boot sequence** — terminal typing `CITADEL ARCHIVE v1.37 // INITIALIZING…`

---

## 10. The portal

Reference: `palette-sources/portal-primary-reference.webp`.

Five properties, all required:

1. **Concentric bands, not a gradient.** Six to eight alternating light and dark green layers of uneven width following the outline. A smooth radial gradient produces a neon doughnut and is wrong
2. **An irregular outline.** Soft lobes from low-frequency noise on the radius. This is what reads as a *portal*; a clean circle reads as a *ring*
3. **A separate core vortex.** Spiral arms, lighter and yellower, rotating faster than the outer bands. The differential rate conveys depth
4. **Rim sparks.** Eight to ten white specular points of varying size, flaring independently
5. **Core grit.** Small brown flecks near the center, preserving the hand-painted quality

Colors: bands `#A7CB56` and `#228D44`, core `#D6E88A`, sparks `#FFFFFF`, grit `#7A6033`.

Opening is a rapid scale-up with slight overshoot. The portal does not change shape as it opens — the edge churns continuously throughout.

---

## 11. Backgrounds

Procedural only, built from the tokens so they recolor with the theme:

- Fine grain overlaid at low opacity
- Scanlines via repeating gradient — `c-137` and `cronenberg` only, never `citadel`
- A barely perceptible terminal grid
- Vignette from the edges
- Portal glow as a radial gradient from the accent, used to direct focus

No photographs. No starfields.

---

## 12. Microcopy

The voice is a bureaucratic archive terminal that has absorbed the show's cynicism. Dry where it is functional, sharp where it has room.

- Header stamp: `CITADEL ARCHIVE // CLEARANCE: UNRESTRICTED`
- IDs: `REGISTRY #001 · C-137`
- Pagination: `DIMENSION 3 / 42`, with `← JUMP` and `JUMP →`
- Episode lists: `PERSONNEL PRESENT`
- Location residents: `REGISTERED RESIDENTS`
- Episode dates: `BROADCAST:`
- Seasons: `SEASON 1 — DIMENSION LOGS`
- Empty: `Oooh, nothing here! Existence is pain!`
- 404: `This dimension doesn't exist. Try one where you're less of an idiot.`
- Network error: `The portal fluid is out. Blame Jerry.`
- Search placeholder: `Ask Rick. He won't be nice about it.`
- Settings header: `PORTAL GUN SETTINGS`

Settings panel contents:

```
DIMENSION            ● C-137   ○ Citadel   ○ Cronenberg-1
PORTAL SFX           [ OFF ]
PORTAL TRANSITIONS   [ ON  ]
REDUCED MOTION       [ AUTO ]
```

---

## 13. Deliverable for step 1

One screen, 1440px wide, containing:

1. The three palettes as labeled swatches with their hex values
2. The type scale, showing all three faces at their intended sizes
3. The 8px spacing scale
4. Every component from §8 in every listed state
5. The card and the button repeated across all three dimensions

Then stop. Screens follow after approval.
