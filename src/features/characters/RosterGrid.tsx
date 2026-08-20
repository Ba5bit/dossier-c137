import { Link } from 'react-router-dom'
import { StatusIndicator } from './StatusIndicator'
import type { CharacterSummary } from '../../shared/api/types'

type RosterGridProps = {
  title: string
  people: CharacterSummary[]
}

export function RosterGrid({ title, people }: RosterGridProps) {
  return (
    <section className="space-y-3">
      <h2 className="font-mono text-xs tracking-widest text-muted">{title}</h2>

      {people.length === 0 ? (
        <p className="border border-line bg-surface px-4 py-8 text-center font-mono text-xs text-muted">
          NO ONE ON RECORD
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {people.map((person) => (
            <li key={person.id}>
              <Link
                to={`/characters/${person.id}`}
                className="flex items-center gap-3 border border-line bg-surface p-2 transition-colors hover:border-accent"
              >
                <img
                  src={person.image}
                  alt={person.name}
                  width={48}
                  height={48}
                  loading="lazy"
                  className="h-12 w-12 object-cover"
                />
                <span className="min-w-0">
                  <span className="text-fg block truncate text-sm">{person.name}</span>
                  <StatusIndicator status={person.status} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
