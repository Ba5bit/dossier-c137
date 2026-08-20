import { describe, expect, it } from 'vitest'
import { isQuestion } from './question'

describe('isQuestion', () => {
  it('treats anything ending in a question mark as a question', () => {
    expect(isQuestion('birdperson?')).toBe(true)
    expect(isQuestion('  who dis?  ')).toBe(true)
  })

  it('treats an interrogative opening as a question', () => {
    expect(isQuestion('who is Birdperson')).toBe(true)
    expect(isQuestion('WHY did Rick leave')).toBe(true)
    expect(isQuestion('tell me about the Citadel')).toBe(true)
  })

  it('treats a bare name as a lookup, not a question', () => {
    expect(isQuestion('morty')).toBe(false)
    expect(isQuestion('Citadel of Ricks')).toBe(false)
  })

  it('treats nothing as nothing', () => {
    expect(isQuestion('')).toBe(false)
    expect(isQuestion('   ')).toBe(false)
  })
})
