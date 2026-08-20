import type { ReactNode } from 'react'
import { PortalLink } from '../../shared/portal/PortalLink'
import { StatusIndicator } from './StatusIndicator'
import { NotOnFile, RedactionBar } from '../../shared/ui/RedactionBar'
import { Stamp } from '../../shared/ui/Stamp'
import { Carousel } from '../../shared/ui/Carousel'
import type { CarouselPage } from '../../shared/ui/Carousel'
import { groupBySeason } from '../episodes/seasons'
import type { CharacterDetail, RelationRef } from '../../shared/api/types'

type CharacterDossierProps = {
  detail: CharacterDetail
  /**
   * Rendered between the field list and the episode roll. The AI assessment
   * goes here: appended after the episodes it sat below fifty rows of links,
   * which on a phone is ten screens of scrolling before the reader meets the
   * one part of the page that was written for them.
   */
  children?: ReactNode
}

function Relation({ relation }: { relation: RelationRef }) {
  if (!relation.resolved) {
    return <RedactionBar label={`${relation.name} — redacted`} />
  }

  return (
    <PortalLink
      to={`/locations/${relation.id}`}
      variant="short"
      className="text-link underline-offset-4 hover:underline"
    >
      {relation.name}
    </PortalLink>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line py-2">
      <dt className="font-mono text-xs text-muted">{label}</dt>
      <dd className="text-fg text-right text-sm">{children}</dd>
    </div>
  )
}

export function CharacterDossier({ detail, children }: CharacterDossierProps) {
  const { character, origin, location, episodes } = detail
  const deceased = character.status.toLowerCase() === 'dead'

  const seasonPages: CarouselPage[] = groupBySeason(episodes).map((group) => ({
    key: group.season,
    label: group.season,
    content: (
      <ul className="grid grid-cols-1 gap-2 pr-px sm:grid-cols-2">
        {group.items.map((episode) => (
          <li key={episode.id}>
            <PortalLink
              to={`/episodes/${episode.id}`}
              variant="short"
              className="flex items-center justify-between gap-3 border border-line bg-surface px-3 py-2 transition-colors hover:border-accent"
            >
              <span className="text-fg truncate text-sm">{episode.name}</span>
              <span className="font-mono text-xs text-muted">{episode.episode}</span>
            </PortalLink>
          </li>
        ))}
      </ul>
    ),
  }))

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-[300px_1fr]">
        <div className="relative">
          <img
            src={character.image}
            alt={character.name}
            width={300}
            height={300}
            className="aspect-square w-full border border-line object-cover"
          />
          {deceased && (
            <Stamp tone="dead" className="absolute bottom-6 left-4 bg-bg">
              TERMINATED
            </Stamp>
          )}
        </div>

        <div className="space-y-4">
          <p className="font-mono text-xs text-muted">
            REGISTRY #{String(character.id).padStart(3, '0')}
          </p>
          <h1 className="text-fg text-3xl font-bold leading-tight">
            {character.name}
          </h1>
          <StatusIndicator status={character.status} />

          <dl className="max-w-md">
            <Field label="SPECIES">{character.species}</Field>
            <Field label="TYPE">
              {character.type || <NotOnFile label="Type not on file" />}
            </Field>
            <Field label="GENDER">{character.gender}</Field>
            <Field label="ORIGIN">
              <Relation relation={origin} />
            </Field>
            <Field label="LAST KNOWN LOCATION">
              <Relation relation={location} />
            </Field>
          </dl>
        </div>
      </div>

      {children}

      {/* Fifty-one rows of links used to sit under every dossier. The same
          records, one season per slide: arrows on a desktop, swipe on a
          phone, and the season code says which slice you are looking at. */}
      <Carousel
        title="EPISODES ON RECORD"
        pages={seasonPages}
        empty={
          <p className="border border-line bg-surface px-4 py-8 text-center font-mono text-xs text-muted">
            NO EPISODES ON RECORD
          </p>
        }
      />
    </div>
  )
}
