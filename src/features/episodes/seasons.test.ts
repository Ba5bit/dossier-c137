import { describe, it, expect } from 'vitest'
import { SEASONS, groupBySeason, seasonOf } from './seasons'

describe('seasonOf', () => {
  it('reads the season out of an episode code', () => {
    expect(seasonOf('S01E11')).toBe('S01')
    expect(seasonOf('S04E03')).toBe('S04')
  })

  it('accepts a bare season code', () => {
    expect(seasonOf('S02')).toBe('S02')
  })

  it('names anything it cannot parse rather than dropping it', () => {
    expect(seasonOf('')).toBe('UNSORTED')
    expect(seasonOf('pilot')).toBe('UNSORTED')
  })
})

describe('groupBySeason', () => {
  it('groups in season order regardless of input order', () => {
    const groups = groupBySeason([
      { episode: 'S02E01' },
      { episode: 'S01E02' },
      { episode: 'S01E01' },
    ])

    expect(groups.map((group) => group.season)).toEqual(['S01', 'S02'])
    expect(groups[0].items).toHaveLength(2)
  })

  it('returns nothing for an empty roll', () => {
    expect(groupBySeason([])).toEqual([])
  })
})

describe('SEASONS', () => {
  it('covers the five seasons the registry holds', () => {
    expect(SEASONS).toEqual(['S01', 'S02', 'S03', 'S04', 'S05'])
  })
})
