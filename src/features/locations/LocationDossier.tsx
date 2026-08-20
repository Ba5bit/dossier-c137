import { RedactionBar } from '../../shared/ui/RedactionBar'
import { RosterGrid } from '../characters/RosterGrid'
import type { LocationDetail } from '../../shared/api/types'

type LocationDossierProps = {
  detail: LocationDetail
}

export function LocationDossier({ detail }: LocationDossierProps) {
  const { location, residents } = detail
  const dimensionUnknown = location.dimension.toLowerCase() === 'unknown'

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <p className="font-mono text-xs text-muted">
          REGISTRY #{String(location.id).padStart(3, '0')}
        </p>
        <h1 className="text-fg text-3xl font-bold leading-tight">{location.name}</h1>

        <dl className="max-w-md">
          <div className="flex justify-between gap-4 border-b border-line py-2">
            <dt className="font-mono text-xs text-muted">TYPE</dt>
            <dd className="text-fg text-sm">{location.type}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-line py-2">
            <dt className="font-mono text-xs text-muted">DIMENSION</dt>
            <dd className="text-fg text-sm">
              {dimensionUnknown ? (
                <RedactionBar label="Dimension redacted" />
              ) : (
                location.dimension
              )}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-line py-2">
            <dt className="font-mono text-xs text-muted">RESIDENTS</dt>
            <dd className="text-fg text-sm">{location.residentCount}</dd>
          </div>
        </dl>
      </div>

      <RosterGrid title="REGISTERED RESIDENTS" people={residents} />
    </div>
  )
}
