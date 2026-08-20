import { PortalLink } from '../../shared/portal/PortalLink'
import { StatusIndicator } from './StatusIndicator'
import { Carousel } from '../../shared/ui/Carousel'
import type { CarouselPage } from '../../shared/ui/Carousel'
import type { CharacterSummary } from '../../shared/api/types'

type RosterGridProps = {
  title: string
  people: CharacterSummary[]
}

/** Two rows of four on a desktop; the same eight records swipe on a phone. */
const PER_PAGE = 8

function chunk<T>(items: T[], size: number): T[][] {
  const pages: T[][] = []
  for (let start = 0; start < items.length; start += size) {
    pages.push(items.slice(start, start + size))
  }
  return pages
}

function Person({ person }: { person: CharacterSummary }) {
  return (
    <PortalLink
      to={`/characters/${person.id}`}
      variant="short"
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
    </PortalLink>
  )
}

export function RosterGrid({ title, people }: RosterGridProps) {
  const pages: CarouselPage[] = chunk(people, PER_PAGE).map((group, index) => ({
    key: String(index),
    content: (
      <ul className="grid grid-cols-1 gap-3 pr-px sm:grid-cols-2 lg:grid-cols-4">
        {group.map((person) => (
          <li key={person.id}>
            <Person person={person} />
          </li>
        ))}
      </ul>
    ),
  }))

  return (
    <Carousel
      title={title}
      pages={pages}
      empty={
        <p className="border border-line bg-surface px-4 py-8 text-center font-mono text-xs text-muted">
          NO ONE ON RECORD
        </p>
      }
    />
  )
}
