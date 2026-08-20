import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="mx-auto max-w-[1280px] px-6 py-24 text-center">
      <p className="font-mono text-xs text-muted">ERROR // DIMENSION NOT FOUND</p>
      <h1 className="text-fg mt-4 text-3xl font-bold">
        This dimension doesn&apos;t exist.
      </h1>
      <p className="mt-2 text-muted">Try one where you&apos;re less of an idiot.</p>
      <Link
        to="/characters"
        className="mt-8 inline-block border border-line px-4 py-2 font-mono text-xs text-fg transition-colors hover:border-accent hover:text-accent"
      >
        RETURN TO ARCHIVE
      </Link>
    </main>
  )
}
