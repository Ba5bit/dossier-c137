import { PortalLink } from '../../shared/portal/PortalLink'
import { BurpText } from './BurpText'
import type { AskSource } from '../../shared/api/types'

const SECTIONS: Record<AskSource['type'], string> = {
  character: 'characters',
  location: 'locations',
  episode: 'episodes',
}

/**
 * The answer cites the records it leaned on as [#47]. Each one is a page on
 * this site, so the citation is rendered as the link to it rather than as
 * punctuation the visitor has to copy into the search box.
 *
 * A number is only a link if this answer actually retrieved that record: the
 * model can produce a bracket for something it half-remembers, and a link to
 * a page that is not what the sentence meant is worse than plain text.
 */
type AnswerTextProps = {
  text: string
  sources: AskSource[]
  /** Records named inside the focused dossier: linkable, but not chips. */
  citable?: AskSource[]
}

export function AnswerText({ text, sources, citable = [] }: AnswerTextProps) {
  const parts = text.split(/(\[#\d+\])/g)
  const known = [...sources, ...citable]

  return (
    <>
      {parts.map((part, index) => {
        const cited = /^\[#(\d+)\]$/.exec(part)
        const source = cited
          ? known.find((candidate) => candidate.id === Number(cited[1]))
          : undefined

        if (cited && !source) return null
        if (!cited) return <BurpText key={index} text={part} />

        return (
          <PortalLink
            key={index}
            to={`/${SECTIONS[source!.type]}/${source!.id}`}
            variant="short"
            className="ml-1 font-mono text-xs text-link underline decoration-dotted underline-offset-4 transition-colors hover:text-accent"
          >
            #{source!.id}
          </PortalLink>
        )
      })}
    </>
  )
}
