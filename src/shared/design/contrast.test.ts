import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { contrastRatio, parseDimensions } from './contrast'

// `?raw` returns an empty string here: Vitest disables CSS processing, and
// Vite's CSS pipeline claims the file before the raw plugin sees it. Reading
// from disk is the only way to assert against the palette that actually ships.
// Vitest runs from the project root, so this path is stable.
const css = readFileSync('src/index.css', 'utf8')

/** WCAG AA for body text. Every token here is used at 12–14 px somewhere. */
const AA = 4.5

const SURFACES = ['bg', 'surface', 'raised'] as const
const FOREGROUNDS = [
  'fg',
  'muted',
  'accent',
  'link',
  'alive',
  'dead',
  'highlight',
] as const

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
