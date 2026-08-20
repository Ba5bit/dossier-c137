import { describe, expect, it } from 'vitest'
import { COPY } from './copy'

describe('COPY', () => {
  it('carries the shared state text the components render', () => {
    expect(COPY.states.emptyTitle).toBe('NO RECORDS FOUND')
    expect(COPY.states.emptyMessage).toBe('Oooh, nothing here! Existence is pain!')
    expect(COPY.states.errorTitle).toBe('REGISTRY UNREACHABLE')
    expect(COPY.states.errorMessage).toBe('The portal fluid is out. Blame Jerry.')
    expect(COPY.states.notFoundHeading).toBe("This dimension doesn't exist.")
  })

  it('carries both AI voices by name and greeting', () => {
    expect(COPY.ai.personaNames.rick).toBe('RICK C-137')
    expect(COPY.ai.personaNames.morty).toBe('MORTY SMITH')
    expect(COPY.ai.greetings.morty).toMatch(/aw jeez/i)
  })

  it('carries the search microcopy', () => {
    expect(COPY.search.tooShort).toMatch(/two characters minimum/i)
    expect(COPY.search.hint).toBe('↑ ↓ TO AIM · ENTER TO FIRE · ESC TO ABORT')
  })

  it('carries the hub and layout text', () => {
    expect(COPY.layout.brand).toBe('DOSSIER C-137')
    expect(COPY.layout.sections.map((section) => section.to)).toEqual([
      '/characters',
      '/locations',
      '/episodes',
      '/ask',
    ])
    expect(COPY.hub.stamp).toBe('DOSSIER C-137 // CLEARANCE: UNRESTRICTED')
    expect(COPY.hub.figures).toHaveLength(5)
  })

  it('holds no empty strings', () => {
    const walk = (value: unknown): void => {
      if (typeof value === 'string') {
        expect(value.length).toBeGreaterThan(0)
        return
      }
      if (value && typeof value === 'object') Object.values(value).forEach(walk)
    }

    walk(COPY)
  })
})
