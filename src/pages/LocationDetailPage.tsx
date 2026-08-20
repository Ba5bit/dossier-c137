import { useParams } from 'react-router-dom'
import { useLocation } from '../features/locations/useLocation'
import { LocationDossier } from '../features/locations/LocationDossier'
import { ApiError } from '../shared/api/client'
import { DetailSkeleton } from '../shared/ui/DetailSkeleton'
import { DimensionNotFound } from '../shared/ui/DimensionNotFound'
import { ErrorState } from '../shared/ui/ErrorState'

export function LocationDetailPage() {
  const { id } = useParams()
  const { data, isPending, isError, error, refetch } = useLocation(Number(id))

  return (
    <main className="mx-auto max-w-[1280px] space-y-6 px-6 py-10">
      <p className="font-mono text-xs text-muted">
        DOSSIER C-137 // CLEARANCE: UNRESTRICTED
      </p>

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
