# Design Tokens

Source colors sampled from the reference material in `references/`, expanded into the three dimension palettes defined in the design spec (§9).

Every foreground/background pair below carries a computed WCAG 2.1 contrast ratio. Pairs are annotated **AAA** (≥7:1), **AA** (≥4.5:1), **UI** (≥3:1 — permitted for large text, icons, borders, and controls but not body copy), or **decorative** (below 3:1 — fills and ornament only, never text).

---

## Source colors

Extracted from the show. These ten are the only hues in the system; everything else is derived by mixing them with the background or the primary text color.

| Name | Hex | Source |
|---|---|---|
| `portal-core` | `#A7CB56` | Bright lime center of the portal |
| `portal-deep` | `#228D44` | Deep green of the rim and swirl |
| `title-dark` | `#2E3B2C` | Near-black green-grey from Citadel shadows |
| `labcoat` | `#EAE9EA` | Rick's coat, a cool off-white |
| `rick-hair` | `#A2D0E4` | The signature icy blue |
| `morty-shirt` | `#F3EF7C` | A slightly dirty yellow, not neon |
| `cronen-moss` | `#49573D` | Dark rotting moss green |
| `cronen-flesh` | `#A7635B` | Muted diseased red |
| `citadel-cool` | `#577B80` | Grey-teal architecture |
| `citadel-warm` | `#CBCA78` | Faded sci-fi gold |

**The governing rule: the site must not be green.** The fastest way to reduce this project to a generic "portal-green themed website" is to let the accent take over surfaces. Portal green appears where something activates, opens, is selected, or is in progress — nowhere else.

### Color distribution budget

| Share | Role |
|---|---|
| 55–65% | Background and its derived surfaces |
| 15–20% | Labcoat white / Citadel teal |
| 8–12% | Portal green |
| 5–8% | Rick blue + Morty yellow |
| <5% | Cronenberg flesh and other special accents |

---

## Dimension: `c-137` (dark, default)

The canonical look. The palette above works here essentially unmodified.

| Token | Hex | Contrast on `--bg` | Grade |
|---|---|---|---|
| `--bg` | `#2E3B2C` | — | — |
| `--surface` | `#3A4838` | — | — |
| `--surface-raised` | `#414F3D` | — | — |
| `--border` | `#4E5C4A` | 1.4:1 | decorative |
| `--text-primary` | `#EAE9EA` | **9.75:1** | AAA |
| `--text-secondary` | `#BAC1B4` | **6.40:1** | AA — 4.72:1 on `--surface-raised`, the worst case |
| `--accent` | `#A7CB56` | **6.37:1** | AA |
| `--accent-hover` | `#B8D96D` | 7.4:1 | AAA |
| `--accent-deep` | `#228D44` | 2.6:1 | decorative — fills and glows only |
| `--link` | `#A2D0E4` | **7.13:1** | AAA |
| `--highlight` | `#F3EF7C` | **9.81:1** | AAA |

---

## Dimension: `citadel` (light)

Satisfies the assignment's light-theme requirement. Built on the labcoat white with the Citadel teal darkened until it passes for body text — the raw `#577B80` reaches only 3.81:1 on this background and fails AA.

| Token | Hex | Contrast on `--bg` | Grade |
|---|---|---|---|
| `--bg` | `#E8EAEA` | — | — |
| `--surface` | `#F2F3F3` | — | — |
| `--surface-raised` | `#FBFBFB` | — | — |
| `--border` | `#C3CCCC` | 1.5:1 | decorative |
| `--text-primary` | `#22302C` | **11.9:1** | AAA |
| `--text-secondary` | `#5A6663` | **5.9:1** | AA |
| `--accent` | `#3E5A5E` | **6.13:1** | AA |
| `--accent-hover` | `#2E4649` | 8.2:1 | AAA |
| `--accent-portal` | `#4C6520` | **5.44:1** | AA — the darkened portal green for text and CTA labels |
| `--fill-portal` | `#A7CB56` | 1.53:1 | decorative — fills only, always with dark text on top |
| `--fill-warm` | `#CBCA78` | 1.41:1 | decorative — badge and panel tint only, never text |

**Note on this dimension.** Bright portal green cannot carry text on a light background — the ratio is 1.53:1. Use `--fill-portal` as a background with `--text-primary` on top, or `--accent-portal` when green text is genuinely required.

---

## Dimension: `cronenberg` (dark, easter egg)

The moss green from the source is too light to serve as a background — it works as a border instead. The base is darkened accordingly.

| Token | Hex | Contrast on `--bg` | Grade |
|---|---|---|---|
| `--bg` | `#23291C` | — | — |
| `--surface` | `#2F3726` | — | — |
| `--surface-raised` | `#3A4430` | — | — |
| `--border` | `#49573D` | 1.8:1 | decorative |
| `--text-primary` | `#E4E2DA` | **11.5:1** | AAA |
| `--text-secondary` | `#B4B0A3` | **6.89:1** | AA — 4.72:1 on `--surface-raised`, the worst case |
| `--accent` | `#C07E72` | **4.60:1** | AA — the diseased flesh, lightened to pass |
| `--accent-hover` | `#D29387` | 5.6:1 | AA |
| `--link` | `#A2D0E4` | **9.9:1** | AAA |

---

## Semantic tokens

Character status must never be conveyed by color alone (spec §12.1) — a text label always accompanies the indicator. These values exist so the indicator reinforces the label rather than replacing it.

| Token | `c-137` | `citadel` | `cronenberg` | Meaning |
|---|---|---|---|---|
| `--status-alive` | `#A7CB56` | `#4C6520` | `#A7CB56` | Portal green — living |
| `--status-dead` | `#DB958C` | `#8E4A42` | `#C07E72` | Diseased red — terminated |
| `--status-unknown` | `#BAC1B4` | `#6B7370` | `#B4B0A3` | Muted — unrecorded |

`--status-dead` in `c-137` is the Cronenberg flesh lightened to `#DB958C`, reaching 4.89:1. The raw `#A7635B` sits at 2.57:1 on the dark background and is unusable for text or for a status dot.

---

## Derivation rule

No hue outside the ten source colors may be introduced. Borders, muted text, hover states, elevated surfaces, and glows are all produced by mixing a source color with `--bg` or `--text-primary`.

This constraint is what keeps the design coherent as it grows, and it is the single most useful instruction to hand to a design tool.

---

## Surface-aware contrast

Muted text sits on cards and raised panels, not only on the page background. Validating it against `--bg` alone is insufficient — the earlier `#A6ADA0` and `#A39F92` values measured 5.12:1 and 5.40:1 on the background but fell to **3.78:1** and **3.87:1** on `--surface-raised`, failing AA where they are most often used.

The current values are chosen so the **worst** case across all three surfaces still passes:

| Dimension | `--text-secondary` | on `--bg` | on `--surface` | on `--surface-raised` |
|---|---|---|---|---|
| `c-137` | `#BAC1B4` | 6.40 | 5.26 | 4.72 |
| `citadel` | `#5A6663` | 4.95 | 5.37 | 5.77 |
| `cronenberg` | `#B4B0A3` | 6.89 | 5.71 | 4.72 |

**Rule for any new color:** validate against every surface it can land on, not just the page background.

### `citadel-cool` as a fill

`#577B80` carrying `#EAE9EA` text measures **3.81:1** and fails AA. When the teal must be a fill behind text, use `#3E5A5E` instead, which reaches 6.13:1. `#577B80` is otherwise limited to borders, icons, and decorative panels.

---

## Portal rendering colors

Sampled from `references/portal.webp` and `references/portal_2.jpg` for the canvas implementation (spec §8.5). The bands alternate between these, never blending into a smooth gradient.

| Token | Hex | Role |
|---|---|---|
| `--portal-band-light` | `#A7CB56` | The bright bands |
| `--portal-band-dark` | `#228D44` | The dark bands |
| `--portal-core` | `#D6E88A` | The lighter, yellower center vortex |
| `--portal-spark` | `#FFFFFF` | Rim specular points |
| `--portal-grit` | `#7A6033` | Brown flecks near the core |
