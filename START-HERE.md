# Start Here

Handoff note for a fresh session. Written 2026-08-20, after design and planning, before any code exists.

## What this project is

**Citadel Archive** — a Rick and Morty archive browser, submitted as a course-entry test assignment. Characters, locations, and episodes, searchable and browsable, presented as an internal terminal of the Citadel of Ricks.

The assignment requires a public GitHub repository, a thorough README, and that **every external API is called from the server**. Bonus credit for a light/dark theme with persistence, an AI integration, and skeleton loading states. All are in scope.

## Read these, in order

| Document | What it settles |
|---|---|
| `docs/superpowers/specs/2026-08-19-citadel-archive-design.md` | The full design. Architecture, endpoints, component tree, error handling, deployment. Includes a requirements traceability table mapping every assignment requirement to a section |
| `docs/superpowers/plans/2026-08-20-citadel-archive-foundation.md` | Plan 1 of 5. Twenty-three TDD tasks with complete code in every step |
| `docs/design/tokens.md` | Ten source colors expanded into three palettes, every pair contrast-checked |
| `docs/design/visual-direction.md` | The direction, the rejected alternatives, and why each reference was weighted as it was |
| `design-brief/STEP-2-PROMPTS.md` | Per-screen layout descriptions, detailed enough to build from directly |

## Current state

Nothing is built. The repository holds documents, references, and a design brief. Three commits on `main`.

- **No `src/`.** The Vite project has not been scaffolded
- **No Supabase project.** Not created, not linked
- **No GitHub remote.** `git init` was run locally; nothing has been pushed
- **No `.env`.** No keys obtained yet

## Immediate next step

Execute plan 1 starting at task 1. It scaffolds the project, builds the backend, and deploys both halves.

**Task 12 is a hard gate.** It deploys the Edge Function and the frontend, and nothing past it proceeds until a public URL answers. This is deliberate: a deferred deployment turns into CORS and environment debugging under deadline pressure.

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
