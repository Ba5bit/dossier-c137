import { Link } from 'react-router-dom'
import { RedactionBar } from '../../shared/ui/RedactionBar'
import type { Location } from '../../shared/api/types'

type LocationCardProps = {
  location: Location
}

export function LocationCard({ location }: LocationCardProps) {
  const dimensionUnknown = location.dimension.toLowerCase() === 'unknown'

  return (
    <Link
      to={`/locations/${location.id}`}
      className="block border border-line bg-surface p-4 transition-colors hover:border-accent"
    >
      <p className="font-mono text-xs text-muted">
        REGISTRY #{String(location.id).padStart(3, '0')}
      </p>

      <h3 className="text-fg mt-2 font-medium leading-tight">{location.name}</h3>

      <dl className="mt-4 space-y-1 font-mono text-xs">
        <div className="flex justify-between gap-2">
          <dt className="text-muted">TYPE</dt>
          <dd className="text-fg truncate">{location.type}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted">DIMENSION</dt>
          <dd className="text-fg truncate">
            {dimensionUnknown ? (
              <RedactionBar label="Dimension redacted" testId="redacted-dimension" />
            ) : (
              location.dimension
            )}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted">RESIDENTS</dt>
          <dd className="text-fg">{location.residentCount}</dd>
        </div>
      </dl>
    </Link>
  )
}
