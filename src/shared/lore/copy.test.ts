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
