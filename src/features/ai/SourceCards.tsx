import { PortalLink } from '../../shared/portal/PortalLink'
import { COPY } from '../../shared/lore/copy'
import type { AskSource } from '../../shared/api/types'

const SECTIONS: Record<AskSource['type'], string> = {
  character: 'characters',
  location: 'locations',
  episode: 'episodes',
}

/**
 * The answer is only as good as what it stands on, so what it stands on is
 * clickable. Spec section 10.2.
 */
export function SourceCards({ sources }: { sources: AskSource[] }) {
  if (sources.length === 0) return null

  return (
    <div className="mt-3 space-y-2">
      <p className="font-mono text-xs tracking-widest text-muted">{COPY.ai.groundedIn}</p>
      <ul className="flex flex-wrap gap-2">
        {sources.map((source) => (
          <li key={`${source.type}/${source.id}`}>
            <PortalLink
              to={`/${SECTIONS[source.type]}/${source.id}`}
              variant="short"
              className="text-fg inline-flex items-baseline gap-2 border border-line px-3 py-1 font-mono text-xs transition-colors hover:border-accent hover:text-accent"
            >
              <span>{source.name}</span>
              {/* Two records can carry the same name — Birdperson is both 47
                  and 599 — and a pair of identical chips is not a citation. */}
              <span className="text-muted">#{source.id}</span>
            </PortalLink>
          </li>
        ))}
      </ul>
    </div>
  )
}
