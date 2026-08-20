import { EpisodeCard } from './EpisodeCard'
import { Skeleton } from '../../shared/ui/Skeleton'
import { EmptyState } from '../../shared/ui/EmptyState'
import { ErrorState } from '../../shared/ui/ErrorState'
import type { Episode } from '../../shared/api/types'

type EpisodeGridProps = {
  episodes: Episode[]
  isPending: boolean
  isError: boolean
  onRetry: () => void
}

const GRID = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'
const SKELETON_COUNT = 20

export function EpisodeGrid({
  episodes,
  isPending,
  isError,
  onRetry,
}: EpisodeGridProps) {
  if (isError) return <ErrorState onRetry={onRetry} />

  if (isPending) {
    return (
      <div className={GRID}>
        {Array.from({ length: SKELETON_COUNT }, (_, index) => (
          // Same geometry as the card: a code chip, a title, two field rows.
          <div key={index} className="space-y-2 border border-line bg-surface p-4">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    )
  }

  if (episodes.length === 0) return <EmptyState />

  return (
    <div className={GRID}>
      {episodes.map((episode) => (
        <EpisodeCard key={episode.id} episode={episode} />
      ))}
    </div>
  )
}
