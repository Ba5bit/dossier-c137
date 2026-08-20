import { describe, expect, it } from 'vitest'
import { parseFocus } from './AskPage'
import { askHref } from '../app/AppLayout'

describe('parseFocus', () => {
  it('reads the dossier route the visitor came from', () => {
    expect(parseFocus('characters/35')).toEqual({ type: 'character', id: 35 })
    expect(parseFocus('locations/3')).toEqual({ type: 'location', id: 3 })
    expect(parseFocus('episodes/12')).toEqual({ type: 'episode', id: 12 })
  })

  it('drops anything it cannot read rather than failing the question', () => {
    expect(parseFocus(null)).toBeUndefined()
    expect(parseFocus('dimensions/3')).toBeUndefined()
    expect(parseFocus('characters/none')).toBeUndefined()
    expect(parseFocus('characters/0')).toBeUndefined()
    expect(parseFocus('characters')).toBeUndefined()
  })
})

describe('askHref', () => {
  it('carries an open dossier into the ask page', () => {
    expect(askHref('/locations/3')).toBe('/ask?focus=locations/3')
    expect(askHref('/characters/35')).toBe('/ask?focus=characters/35')
  })

  it('carries nothing from a list, the hub or the ask page itself', () => {
    expect(askHref('/')).toBe('/ask')
    expect(askHref('/characters')).toBe('/ask')
    expect(askHref('/ask')).toBe('/ask')
  })
})
