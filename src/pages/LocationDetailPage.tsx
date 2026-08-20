import { useParams } from 'react-router-dom'
import { useLocation } from '../features/locations/useLocation'
import { LocationDossier } from '../features/locations/LocationDossier'
import { ApiError } from '../shared/api/client'
import { DetailSkeleton } from '../shared/ui/DetailSkeleton'
import { DimensionNotFound } from '../shared/ui/DimensionNotFound'
import { ErrorState } from '../shared/ui/ErrorState'
import { AskAboutLink } from '../features/ai/AskAboutLink'
import { BackLink } from '../shared/ui/BackLink'
import { COPY } from '../shared/lore/copy'

export function LocationDetailPage() {
  const { id } = useParams()
  const { data, isPending, isError, error, refetch } = useLocation(Number(id))

  return (
    <main className="mx-auto max-w-[1280px] space-y-6 px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <BackLink />
        <div className="flex items-center gap-3">
          <p className="hidden font-mono text-xs text-muted sm:block">
            {COPY.clearanceStamp}
          </p>
          {data && <AskAboutLink focus={{ type: 'location', id: data.location.id }} />}
        </div>
      </div>

      {isPending && <DetailSkeleton />}

      {isError &&
        (error instanceof ApiError && error.code === 'NOT_FOUND' ? (
          <DimensionNotFound />
        ) : (
          <ErrorState onRetry={() => refetch()} />
        ))}

      {data && <LocationDossier detail={data} />}
    </main>
  )
}
