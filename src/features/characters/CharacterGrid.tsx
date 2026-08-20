import { CharacterCard } from './CharacterCard'
import { Skeleton } from '../../shared/ui/Skeleton'
import { EmptyState } from '../../shared/ui/EmptyState'
import { ErrorState } from '../../shared/ui/ErrorState'
import type { Character } from '../../shared/api/types'

type CharacterGridProps = {
  characters: Character[]
  isPending: boolean
  isError: boolean
  onRetry: () => void
}

const GRID = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'
const SKELETON_COUNT = 20

export function CharacterGrid({
  characters,
  isPending,
  isError,
  onRetry,
}: CharacterGridProps) {
  if (isError) return <ErrorState onRetry={onRetry} />

  if (isPending) {
    return (
      <div className={GRID}>
        {Array.from({ length: SKELETON_COUNT }, (_, index) => (
          // The skeleton mirrors the card geometry exactly — a square image
          // above a fixed content block — so nothing shifts on swap.
          <div key={index} className="border border-line bg-surface">
            <Skeleton className="aspect-square w-full rounded-none" />
            <div className="space-y-2 p-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (characters.length === 0) return <EmptyState />

  return (
    <div className={GRID}>
      {characters.map((character) => (
        <CharacterCard key={character.id} character={character} />
      ))}
    </div>
  )
}
