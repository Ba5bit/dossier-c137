import { useParams } from 'react-router-dom'
import { useEpisode } from '../features/episodes/useEpisode'
import { EpisodeDossier } from '../features/episodes/EpisodeDossier'
import { ApiError } from '../shared/api/client'
import { DetailSkeleton } from '../shared/ui/DetailSkeleton'
import { DimensionNotFound } from '../shared/ui/DimensionNotFound'
import { ErrorState } from '../shared/ui/ErrorState'
import { COPY } from '../shared/lore/copy'

export function EpisodeDetailPage() {
  const { id } = useParams()
  const { data, isPending, isError, error, refetch } = useEpisode(Number(id))

  return (
    <main className="mx-auto max-w-[1280px] space-y-6 px-4 py-10 sm:px-6">
      <p className="font-mono text-xs text-muted">
        {COPY.clearanceStamp}
      </p>

      {isPending && <DetailSkeleton />}

      {isError &&
        (error instanceof ApiError && error.code === 'NOT_FOUND' ? (
          <DimensionNotFound />
        ) : (
          <ErrorState onRetry={() => refetch()} />
        ))}

      {data && <EpisodeDossier detail={data} />}
    </main>
  )
}
