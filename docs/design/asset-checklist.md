# Asset Gathering Checklist

Everything needed before the first Claude Design session. The goal is not inspiration — it is constraint. Design tools drift when given a mood and hold their line when given exact values, concrete structural references, and explicit prohibitions.

Assets live in `references/` at the repository root. Derived values live in `docs/design/tokens.md`.

---

## Status

| Item | State |
|---|---|
| Color extraction | **Done** — ten source colors recorded and expanded into three palettes in `tokens.md` |
| Display typeface | **Done** — `references/get_schwifty.ttf` |
| Typeface specimens | **Done** — `title_font_example-1.png` (display size), `font-size-11px.png` (small size) |
| Portal reference | **Done** — `references/portal.webp`, `references/portal_2.jpg` |
| Character color sources | **Done** — `Rick.webp`, `Morty.webp`, `Cronenberg_Tone_1.webp`, `Cronenberg_Tone_2.webp` |
| Structural UI references | **Done** — seven in `references/`, assessed and weighted in `visual-direction.md` |
| Anti-references | **Waived** — skipped for time; a written stop list substitutes |
| Real API data | **Done** — four live responses in `references/data/` |

---

## 1. Structural UI references (5–8) — outstanding

**Screenshots of interfaces, not of the show.** This is the single most misunderstood item on the list. Feeding a design tool only frames from the source material produces illustration: hand-drawn shapes, cartoon linework, character art. What is needed is a well-built interface that then gets painted in the show's colors.

Direction and rationale live in `visual-direction.md`. Gather these six:

- [ ] **Severance — the Lumon MDR interface.** The primary reference: retro-corporate, dense, near-monochrome
- [ ] **Alien — the MU-TH-UR / Nostromo terminal.** Phosphor-green monospace, character-drawn frames
- [ ] **Fallout — the Pip-Boy terminal.** Green CRT, scanlines, soft bloom
- [ ] **SCP Foundation document formatting.** Clearance headers and redaction bars, serving spec §11.3
- [ ] **Linear — the issue list.** Density and dark-surface hierarchy
- [ ] **Vercel dashboard.** A card grid beneath a filter bar

Save to `references/ui/`.

The accompanying prompt instruction: *structure and density come from these references; color and character come from the token palette; do not draw character illustrations — images arrive from the API at runtime.*

---

## 2. Anti-references (2–3) — outstanding

Unexpectedly effective. An explicit prohibition outperforms a positive description, because it rules out the exact attractor the model would otherwise fall into.

- [ ] Two or three screenshots of generic AI-generated landing pages — purple-to-blue gradients, glassmorphism panels, floating 3D blobs, a centered hero with two buttons
- [ ] **Existing Rick and Morty fan projects.** Already collected. Acid-green slabs, starfield backgrounds, the lifted show logo, three cards per screen. See `visual-direction.md` for why these are the strongest anti-reference available

Save to `references/anti/`. These ship with the label **"not this"** alongside a written stop list: no purple-to-blue gradients, no glassmorphism, no floating 3D objects, no centered landing-page heroes, no gradient-filled circular icons, no border radius above 12px.

---

## 3. Real API data — outstanding

Routinely skipped, and it repays the effort more than anything else here. A layout built on `Character Name` placeholders and three cards looks flawless and falls apart on live data.

- [ ] `references/data/characters-page1.json` — `https://rickandmortyapi.com/api/character?page=1`
- [ ] `references/data/locations-page1.json` — `https://rickandmortyapi.com/api/location?page=1`
- [ ] `references/data/episodes-page1.json` — `https://rickandmortyapi.com/api/episode?page=1`
- [ ] `references/data/character-detail.json` — `https://rickandmortyapi.com/api/character/1`

The awkward cases matter most: long names, `unknown` origins, `Poopybutthole` as a species value, characters appearing in fifty-one episodes.

---

## 4. Typeface findings

`references/font-size-11px.png` renders *Dossier C-137* in Get Schwifty at 11px, and the result is barely legible — confirming the rule in spec §11.1. This specimen ships with the design prompt specifically so the tool sees the failure for itself rather than being told about it.

`references/title_font_example-1.png` shows the same words at display size with the show's characteristic treatment: blue fill, green outer glow, soft pink drop shadow. This is the wordmark direction for the `DOSSIER C-137` lockup.

The application is named **Dossier C-137**, not *Rick and Morty*. The show's own logo is deliberately not used — the wordmark is typeset in Get Schwifty instead, which avoids shipping a trademarked lockup and yields something that belongs to the project.

---

## 5. Portal findings

Additional stills of the opening and closing stages proved unnecessary. The portal does not morph as it opens; it scales up rapidly while its edge keeps churning. One clear frame of the fully open portal carries everything the animation needs.

The structural breakdown derived from the reference lives in spec §8.5. In short: concentric bands rather than a gradient, an irregular lobed outline, a faster-rotating core vortex, rim sparks, and brown grit near the center.

---

## 6. Not needed

Listed so time is not spent on it:

- Character portraits — served by the API at runtime
- Icon sets — the design step specifies icons by name
- A favicon — derived from the portal artwork afterward
- Space Grotesk and JetBrains Mono files — loaded from Google Fonts
- Show logo artwork — see §4
- Photographic backgrounds — rejected in `visual-direction.md`; backgrounds are procedural and built from tokens
- Y2K or pixel-art UI kits — rejected in `visual-direction.md`
- A Citadel interior still — the palette already carries `citadel-cool` and `citadel-warm`

---

## Definition of done

Gathering completes when `references/ui/` holds five to eight structural references, `references/anti/` holds two to three anti-references, and `references/data/` holds four JSON files.

At that point the design prompt has everything it needs and nothing is left to invention.
