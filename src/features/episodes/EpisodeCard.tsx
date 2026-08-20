import { PortalLink } from '../../shared/portal/PortalLink'
import type { Episode } from '../../shared/api/types'

type EpisodeCardProps = {
  episode: Episode
}

export function EpisodeCard({ episode }: EpisodeCardProps) {
  return (
    <PortalLink
      to={`/episodes/${episode.id}`}
      variant="short"
      className="block border border-line bg-surface p-4 transition-colors hover:border-accent"
    >
      <span className="inline-block border border-line px-2 py-1 font-mono text-xs text-accent">
        {episode.episode}
      </span>

      <h3 className="text-fg mt-3 font-medium leading-tight">{episode.name}</h3>

      <dl className="mt-4 space-y-1 font-mono text-xs">
        <div className="flex justify-between gap-2">
          <dt className="text-muted">AIRED</dt>
          <dd className="text-fg truncate">{episode.airDate}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted">PERSONNEL</dt>
          <dd className="text-fg">{episode.characterCount}</dd>
        </div>
      </dl>
    </PortalLink>
  )
}
