# Visual Direction

The named direction: **a declassified archive terminal**. Not a retro toy, and not a fan poster — a working instrument that carries traces of its era.

This document records what to search for, what was deliberately rejected, and why. It exists because the rejections are as load-bearing as the choices: every one of them names an attractor the design would otherwise fall into.

---

## Named references

Search these by name. Each is included for one specific property, listed alongside it.

| Reference | What to take from it |
|---|---|
| **Severance — the Lumon MDR interface** | The strongest reference available. Retro-corporate, dense, near-monochrome, quietly unsettling. An archive somebody actually works inside |
| **Alien — the MU-TH-UR / Nostromo terminal** | Phosphor-green text, monospace throughout, frames drawn from characters |
| **Fallout — the Pip-Boy terminal** | Green CRT with scanlines and a soft bloom |
| **SCP Foundation document formatting** | Dossiers with clearance headers and redaction bars — directly serving spec §11.3 |
| **Linear — the issue list** | Density and dark-surface hierarchy; the contemporary baseline |
| **Vercel dashboard** | A card grid sitting beneath a filter bar |

## Search terms

```
cassette futurism ui
crt terminal interface design
dossier / case file ui dribbble
redacted document design
swiss brutalist dashboard
diegetic ui film
```

The last one covers interfaces built to exist inside their fiction — precisely the metaphor this project runs on.

---

## Rejected: Y2K and pixel-art UI kits

Considered and turned down for three reasons.

**They are asset packs, not layouts.** They supply drawn buttons, icons, and window chrome. They carry no structure — no element placement, no density, no grid. A design tool takes from them exactly what is visible: pixel buttons and Windows 95 frames, which collide with Space Grotesk, an 8px scale, and everything else the spec settles.

**Y2K pixel art is not this show.** It is a separate meme aesthetic. *Rick and Morty* is hand-drawn wobbling line work and flat fills, with no pixelation anywhere in it. Combining them yields a site about Windows 98 with green bolted on.

**Pixel art breaks on real data.** Names like *Armothy*, long species strings, and fifty-one-episode lists do not survive pixel fonts and single-pixel borders.

**One idea is retained:** the monochrome green windowed terminal. Not the pixels — the phosphor CRT principle, which maps onto the Dossier C-137 terminal exactly. The principle, not the execution.

---

## Rejected: existing Rick and Morty fan projects

Collected, then reclassified as anti-references. Four failures repeat across every example:

- **Acid-green slabs covering half the viewport.** The exact failure the color budget in `tokens.md` guards against — the "portal-green themed website" outcome
- **A starfield background.** Present in effectively every Rick and Morty portfolio project in existence
- **The show's own logo, lifted unmodified**
- **Near-zero information density.** Three cards per screen, enormous gutters, rounded white containers

A reviewer has seen this arrangement many times. These screenshots ship to the design step labeled **"not this"**, which constrains the output more effectively than any written prohibition.

Store them in `references/anti/`.

---

## Rejected: photographic background images

Turned down for four reasons, and the first is decisive.

**They break the three-dimension system.** A starfield cannot be recolored into the light Citadel theme. Supporting it would mean maintaining three separate background images, and the light theme would still look forced.

**Weight.** A high-quality background runs to megabytes and loads ahead of content — directly undermining the skeletons and lazy loading the spec calls for.

**A starfield is the single most generic move available in this subject.** See the fan projects above.

**They destroy the contrast guarantees.** The ratios in `tokens.md` were computed against flat `#2E3B2C`. Over an image, none of those numbers hold.

### Use instead: procedural backgrounds

All of these are built from the design tokens, so they recolor with the theme automatically and cost nothing to ship.

| Technique | Implementation |
|---|---|
| Grain | One tileable 128×128 PNG, roughly 2 KB, overlaid at low opacity |
| Scanlines | CSS `repeating-linear-gradient`; enabled only in `c-137` and `cronenberg` |
| Terminal grid | A barely perceptible graph-paper rule |
| Vignette | `radial-gradient` inward from the edges |
| Portal glow | `radial-gradient` from the accent color, applied where focus is wanted |

The grain PNG is the only binary asset in this list, and it is the sole exception to the no-background-images rule.

---

## Collected references, assessed

Seven references were gathered in `references/`. Their value is uneven, and the prompt must weight them accordingly rather than presenting them as a flat set.

### Primary — drive the design

| File | Contributes |
|---|---|
| `UI_Ref_Exmp_4.jpg` | A case-file template. The strongest reference held: a NAME/ALIASES/STATUS header block, a two-column label:value grid, an angled `CLASSIFIED` stamp, a photo zone with a paperclip, and a free-text REMARKS field. Maps onto the detail page almost element for element |
| `UI_Ref_Exmp_5.jpg` | A redacted document — black bars struck through mid-sentence. The treatment for `origin: unknown`, and the texture for boot-sequence text |
| `UI_Ref_Exmp_2.jpg` | OpenVMS on an amber CRT. A genuine terminal rather than a stylization: frames drawn from characters, section headers as inverted bars, numerals right-aligned |
| `UI_Ref_Exmp_7.jpg` | Fallout Pip-Boy. A tab bar with an underline rule, a persistent bottom status strip, scanlines, phosphor bloom, and a physical housing around the screen |
| `UI_Ref_Exmp_1.jpg` | A dense game interface. The best structural reference: label:value pairs, ID codes in the shape of `#01D-46(AB+)-2-1`, and a packed list carrying a per-row action control |

### Secondary — take structure only

| File | Contributes | Constraint |
|---|---|---|
| `UI_Ref_Exmp_6.jpg` | A dashboard skeleton: a statistics row, a data table, a side rail, a filter bar paired with a primary action | Its pastel palette is actively hostile to this project. Skeleton only; ignore every color |
| `UI_Ref_Exmp_3.jpg` | The notion of a physical device housing framing a screen — useful for the settings panel as a portal gun casing | Generated pixel art. Contributes the idea and nothing else |

### The hazard in this set

**Five of the seven references are green phosphor on black.** Handed over unqualified, they push the design toward a uniform green CRT, which collides with two commitments at once: the color budget in `tokens.md` that caps portal green at 8–12%, and the light `citadel` dimension required by the assignment.

The design prompt must carry an explicit counterweight — the terminal references supply *chrome, density, and typographic treatment*, never the surface color. Surfaces come from the token palette, and every layout must hold up in the light dimension.

### Gap

Nothing in the set demonstrates contemporary interface density at the level of Linear. `UI_Ref_Exmp_1.jpg` and `UI_Ref_Exmp_6.jpg` cover part of it. The prompt compensates in prose: explicit spacing scale, explicit card dimensions, explicit row heights.

### Anti-references: waived

Collection was skipped for time. The written stop list in the prompt does that work instead. This is a weaker instrument than paired images — a stated prohibition constrains a design tool less reliably than a labeled example — and the trade is deliberate.

---

## Findings from the real data

Pulled live into `references/data/`. Three results change design decisions.

**Half of all origins are unknown.** Ten of the twenty characters on page one carry `origin: "unknown"`. The redaction bar is therefore not a rare easter egg but a routine field state, and must be designed as one — including how a grid reads when half its cards show it.

**A character can appear in fifty-one episodes.** Rick Sanchez appears in all of them. A relation list on a detail page has to survive fifty-one chips without destroying the layout.

**Real string lengths**, to design against rather than guess at:

| Field | Longest observed |
|---|---|
| Character name | 25 characters — *Abadango Cluster Princess* |
| Location name | 29 characters — *Earth (Replacement Dimension)* |
| Dimension | 26 characters — *Post-Apocalyptic Dimension* |
| Episode name | 39 characters — *Interdimensional Cable 2: Tempting Fate* |

**Entity counts, live:** 826 characters across 42 pages, 126 locations across 7, 51 episodes across 3. The forty-two-page coincidence is real at present — and, per spec §11.3, must still be rendered conditionally, since the source data grows.
