import { describe, it, expect } from 'vitest'
import { QUOTES, pickQuote } from './quotes'

describe('quotes', () => {
  it('carries several lines, none of them empty', () => {
    expect(QUOTES.length).toBeGreaterThanOrEqual(6)
    for (const quote of QUOTES) {
      expect(quote.trim().length).toBeGreaterThan(0)
    }
  })

  it('picks a line from the list', () => {
    expect(QUOTES).toContain(pickQuote())
  })

  it('is deterministic for a given random source', () => {
    expect(pickQuote(() => 0)).toBe(QUOTES[0])
    expect(pickQuote(() => 0.999999)).toBe(QUOTES[QUOTES.length - 1])
  })
})
