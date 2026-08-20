import { Link } from 'react-router-dom'
import { COPY } from '../lore/copy'

export function DimensionNotFound() {
  return (
    <div className="px-6 py-24 text-center">
      <p className="font-mono text-xs text-muted">{COPY.states.notFoundLabel}</p>
      <h1 className="text-fg mt-4 text-3xl font-bold">
        {COPY.states.notFoundHeading}
      </h1>
      <p className="mt-2 text-muted">{COPY.states.notFoundBody}</p>
      {/* A portal on the way out of a dead end is theatre, so this one link
          stays a plain Link. */}
      <Link
        to="/characters"
        className="mt-8 inline-block border border-line px-4 py-2 font-mono text-xs text-fg transition-colors hover:border-accent hover:text-accent"
      >
        {COPY.states.notFoundAction}
      </Link>
    </div>
  )
}
