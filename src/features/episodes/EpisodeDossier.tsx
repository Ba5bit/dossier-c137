import { RosterGrid } from '../characters/RosterGrid'
import type { EpisodeDetail } from '../../shared/api/types'

type EpisodeDossierProps = {
  detail: EpisodeDetail
}

export function EpisodeDossier({ detail }: EpisodeDossierProps) {
  const { episode, characters } = detail

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <span className="inline-block border border-line px-2 py-1 font-mono text-xs text-accent">
          {episode.episode}
        </span>
        <h1 className="text-fg text-3xl font-bold leading-tight">{episode.name}</h1>

        <dl className="max-w-md">
          <div className="flex justify-between gap-4 border-b border-line py-2">
            <dt className="font-mono text-xs text-muted">AIRED</dt>
            <dd className="text-fg text-sm">{episode.airDate}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-line py-2">
            <dt className="font-mono text-xs text-muted">PERSONNEL</dt>
            <dd className="text-fg text-sm">{episode.characterCount}</dd>
          </div>
        </dl>
      </div>

      <RosterGrid title="PERSONNEL PRESENT" people={characters} />
    </div>
  )
}
