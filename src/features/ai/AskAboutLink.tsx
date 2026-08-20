import { PortalLink } from '../../shared/portal/PortalLink'
import { COPY } from '../../shared/lore/copy'
import type { AskFocus } from '../../shared/api/types'

const SECTIONS: Record<AskFocus['type'], string> = {
  character: 'characters',
  location: 'locations',
  episode: 'episodes',
}

/**
 * The header's ASK AI already carries the open record with it, but silently:
 * nothing on the page said the questions would be about this one. This says
 * it, next to the record it means.
 */
export function AskAboutLink({ focus }: { focus: AskFocus }) {
  return (
    <PortalLink
      to={`/ask?focus=${SECTIONS[focus.type]}/${focus.id}`}
      className="tap-target inline-flex shrink-0 border border-accent bg-accent/10 px-3 py-2 font-mono text-xs tracking-widest text-accent transition-colors hover:bg-accent/20"
    >
      {COPY.ai.askAbout}
    </PortalLink>
  )
}
