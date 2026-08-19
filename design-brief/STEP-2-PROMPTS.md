# Step 2 — Per-Screen Prompts

The design system is approved. Each screen is now produced separately, reusing that system without introducing new colors or new components.

## Before every prompt

Attach, in this order:

1. The approved design system — either selected in the **Design system** dropdown, or attached as the exported `Design System.dc.html`
2. `DESIGN-BRIEF.md`
3. The reference images relevant to that screen, named per screen below
4. The matching JSON from `data/`

**Re-export the design system after any correction.** Attaching a stale export reintroduces the very values that were fixed.

## Preamble — prepend to every screen prompt

```
Use the approved design system exactly as it stands. Introduce no new
colours, no new components, and no new type sizes. If a screen seems to
need something the system does not have, say so instead of inventing it.

Desktop at 1440px, container max width 1280px. Use the real data in the
attached JSON — no placeholder names, no lorem ipsum.
```

---

## Recommended order

The brief lists screens in narrative order. Build them in this order instead.

**Start with the character list, not the hub.** The list is the densest, most data-driven screen in the product and the one plan 1 implements. Building it first tests the design system against real density while there is still room to adjust. The hub is the flashiest screen but the least structural — if the system has a weakness, the hub will hide it and the list will expose it.

1. Character list
2. Character detail
3. Search results
4. Hub
5. Location list and detail
6. Episode list and detail
7. 404
8. Boot sequence

---

## 1. Character list — `/characters`

**Attach:** `05-PRIMARY-dense-list-label-value-pairs.jpg`, `06-STRUCTURE-ONLY-dashboard-skeleton-IGNORE-ALL-COLORS.jpg`, `data/characters-page1.json`

```
Design the character list screen.

Layout, top to bottom:
- Header: the CITADEL ARCHIVE // CLEARANCE: UNRESTRICTED stamp line, the
  page title, and the live count from the data (826 entities, 42 pages)
- Filter bar: name search, status select, species input, gender select,
  and a clear control that appears only when a filter is active
- A four-column card grid
- Pagination reading DIMENSION 1 / 42 with JUMP controls

Requirements:
- Show twenty real characters from the attached JSON, in order
- Ten of those twenty have origin "unknown" — render every one of them
  with the redaction bar. This is the normal case, not a flourish, and
  the grid must stay readable with half its cards carrying one
- Include all three status states across the visible cards
- At rest, only the status indicator animates. Show one card in its
  hover state to demonstrate the difference
- Reference 06 contributes its skeleton only: a filter bar above a grid.
  Ignore its colours entirely

Also produce the loading state of this same screen, with skeletons in
place of the cards. The skeleton must mirror the card geometry exactly —
the same square image area, the same number of text lines, the same
padding — so that nothing shifts when real content replaces it.
```

---

## 2. Character detail — `/characters/:id`

**Attach:** `01-PRIMARY-dossier-case-file-template.jpg`, `02-PRIMARY-redacted-document-bars.jpg`, `data/character-detail.json`

```
Design the character detail screen as an archive dossier. Reference 01
is the primary source for this layout and should drive it closely.

Use Rick Sanchez from the attached JSON. He appears in 51 episodes —
design the episode relation list to survive that count deliberately,
whether by collapsing, scrolling, or truncating with a count. Do not
show a layout that only works for a character with three episodes.

Structure, following reference 01:
- A clearance stamp header
- The character portrait in a bordered photo area
- A two-column label:value grid: status, species, gender, origin,
  location, episode count. Labels in monospace, values right-aligned
- Origin and location are links when resolvable, and a redaction bar
  when the value is unknown
- An episode list headed EPISODES. PERSONNEL PRESENT is the episode
  screen's heading and does not belong here
- A remarks panel reserved for the AI dossier, shown in three states:
  a generate button, a text skeleton while generating, and finished text

Then produce a second version of the same screen for a deceased
character, carrying the TERMINATED stamp rotated -12 degrees over the
portrait.
```

---

## 3. Search results — `/search`

**Attach:** `03-PRIMARY-terminal-openvms-amber-crt.jpg`, `05-PRIMARY-dense-list-label-value-pairs.jpg`

```
Design the search results screen.

- A search input at the top holding the submitted query
- An AI answer panel above the results, shown mid-stream: partial text
  with a blinking cursor, and source cards beneath it for the entities
  the answer draws on
- Three grouped result sections beneath: Characters, Locations,
  Episodes, each with its own count and its own pagination
- A group with no results collapses to a single quiet line rather than
  a full empty state — only a search with nothing at all shows the
  empty state

Reference 03 contributes its section headers as inverted bars and its
right-aligned numerals. Take no colour from it.

Also produce the state where the AI provider has failed: the answer
panel shows an error while the three result groups remain fully usable
beneath it.
```

---

## 4. Hub — `/`

**Attach:** `palette-sources/portal-primary-reference.webp`, `07-IDEA-ONLY-device-housing-for-settings-panel.jpg`, `typeface/specimen-display-size-CORRECT-USE.png`

```
Design the hub screen — the entry point to the archive.

- The wordmark, using the attached rendered image
- The portal gun as the central object, with the coordinate input beside
  it as the hero element
- Three destinations: Characters, Locations, Episodes, each with its
  live count from the data
- Archive statistics: entities indexed, dimensions, episodes, plus a
  counter for how many Ricks and how many Mortys are on file
- A prominent entry point to the portal gun settings

The portal itself: concentric bands of uneven width rather than a smooth
gradient, an irregular lobed outline rather than a circle, a lighter and
yellower core, eight to ten white sparks on the rim, and a scattering of
brown flecks near the centre. A clean neon ring is wrong.

This is the one screen permitted real visual drama, but the colour
budget still holds — green stays at 8 to 12 percent of the surface.

Reference 07 contributes exactly one idea: a physical housing framing a
screen, for the settings panel. Take nothing else from it; it is
generated pixel art.
```

---

## 5. Location list and detail

**Attach:** `data/locations-page1.json`

```
Design the location list and the location detail screen.

List: the same filter-bar-above-grid structure as the character list,
filtering by name, type, and dimension. 126 locations across 7 pages.

Detail: the dossier treatment, with the dimension string rendered as
terminal coordinates and the resident roster headed REGISTERED
RESIDENTS. Residents appear as compact rows carrying name and status.

The longest real dimension string is "Post-Apocalyptic Dimension" at 26
characters and the longest name is "Earth (Replacement Dimension)" at
29. Design against those, not against short values.
```

---

## 6. Episode list and detail

**Attach:** `data/episodes-page1.json`

```
Design the episode list and the episode detail screen.

List: 51 episodes across 3 pages, grouped by season with headers reading
SEASON 1 — DIMENSION LOGS. Air dates are labelled BROADCAST: and set in
monospace. Episode codes such as S01E01 are monospace throughout.

Detail: the dossier treatment, with the participating characters headed
PERSONNEL PRESENT and shown as a portrait grid.

The longest real episode name is "Interdimensional Cable 2: Tempting
Fate" at 39 characters. It must not truncate in the list.
```

---

## 7. 404

```
Design the not-found screen.

Headline: "This dimension doesn't exist."
Sub-line: "Try one where you're less of an idiot."
A route back into the archive.

The portal appears here broken — the bands fractured, the outline torn,
the core dark. Restrained, not comedic: this is a serious tool
delivering bad news in a specific voice.
```

---

## 8. Boot sequence

```
Design the boot sequence shown on first visit.

A terminal types CITADEL ARCHIVE v1.37 // INITIALIZING... line by line
before the hub assembles. Show three frames: early, mid-typing, and the
moment before the hub resolves.

Include the skip affordance. This plays once per session, is disabled by
the portal transitions toggle, and never plays under reduced motion —
so it must read as optional rather than as a gate.
```

---

## After each screen

Check three things before moving on. These are the failures that survive review most often.

1. **Skeleton geometry.** Does the loading state match the loaded state exactly — same image area, same line count, same padding? A mismatched skeleton causes a visible jump on swap and is the most common defect in generated designs.
2. **The light dimension.** Does the screen hold up in `citadel`? Ask for it explicitly if unsure. A design that only works dark fails the assignment's light-theme requirement.
3. **The green budget.** Is portal green still under roughly 12 percent of the surface? It creeps upward screen by screen, because each individual use looks justified in isolation.
