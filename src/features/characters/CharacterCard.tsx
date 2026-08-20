import { Link } from 'react-router-dom'
import { StatusIndicator } from './StatusIndicator'
import type { Character } from '../../shared/api/types'
import { RedactionBar } from '../../shared/ui/RedactionBar'

type CharacterCardProps = {
  character: Character
}

function registryId(id: number): string {
  return `REGISTRY #${String(id).padStart(3, '0')}`
}

export function CharacterCard({ character }: CharacterCardProps) {
  const deceased = character.status.toLowerCase() === 'dead'
  const originUnknown = character.origin.id === null

  return (
    <Link
      to={`/characters/${character.id}`}
      data-deceased={deceased}
      className="group block border border-line bg-surface transition-colors hover:border-accent data-[deceased=true]:opacity-80"
    >
      <img
        src={character.image}
        alt={character.name}
        width={300}
        height={300}
        loading="lazy"
        className="aspect-square w-full object-cover"
      />

      <div className="space-y-2 p-4">
        <p className="font-mono text-xs text-muted">{registryId(character.id)}</p>

        <h3 className="text-fg font-medium leading-tight">{character.name}</h3>

        <StatusIndicator status={character.status} />

        <dl className="space-y-1 font-mono text-xs">
          <div className="flex justify-between gap-2">
            <dt className="text-muted">SPECIES</dt>
            <dd className="text-fg truncate">{character.species}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted">ORIGIN</dt>
            <dd className="text-fg truncate">
              {originUnknown ? (
                <RedactionBar label="Origin redacted" testId="redacted-origin" />
              ) : (
                character.origin.name
              )}
            </dd>
          </div>
        </dl>
      </div>
    </Link>
  )
}
