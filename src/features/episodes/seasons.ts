/**
 * Episode codes arrive as `S01E01`. The season is the only grouping the show
 * itself uses, so it is the one the archive filters and pages by.
 *
 * The list is fixed rather than derived: a select needs its options before
 * any episode has been fetched, and the registry holds five seasons.
 */
export const SEASONS = ['S01', 'S02', 'S03', 'S04', 'S05'] as const

export function seasonOf(code: string): string {
  const match = /^S(\d+)/i.exec(code)
  return match ? `S${match[1]}` : 'UNSORTED'
}

export function groupBySeason<T extends { episode: string }>(
  items: T[],
): { season: string; items: T[] }[] {
  const groups = new Map<string, T[]>()

  for (const item of items) {
    const season = seasonOf(item.episode)
    const bucket = groups.get(season)
    if (bucket) bucket.push(item)
    else groups.set(season, [item])
  }

  return [...groups.entries()]
    .map(([season, seasonItems]) => ({ season, items: seasonItems }))
    .sort((left, right) => left.season.localeCompare(right.season))
}
