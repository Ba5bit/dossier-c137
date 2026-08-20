import { useState } from 'react'
import { useStats } from '../features/stats/useStats'
import { PortalGun } from '../shared/portal/PortalGun'
import { PortalSearch } from '../features/search/PortalSearch'
import { PortalLink } from '../shared/portal/PortalLink'
import { SettingsPanel } from '../shared/settings/SettingsPanel'
import { Skeleton } from '../shared/ui/Skeleton'
import { ErrorState } from '../shared/ui/ErrorState'
import { COPY } from '../shared/lore/copy'
import type { Stats } from '../shared/api/types'

type FigureProps = {
  label: string
  value: number | undefined
}

function Figure({ label, value }: FigureProps) {
  return (
    <div className="text-center">
      <dt className="font-mono text-xs tracking-widest text-muted">{label}</dt>
      <dd className="text-fg mt-2 text-2xl font-bold">
        {value === undefined ? (
          <Skeleton className="mx-auto h-7 w-16" />
        ) : (
          value
        )}
      </dd>
    </div>
  )
}

function indexedTotal(stats: Stats | undefined): number | undefined {
  if (!stats) return undefined
  return stats.characters.total + stats.locations.total + stats.episodes.total
}

export function HubPage() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { data, isError, refetch } = useStats()

  return (
    <main className="mx-auto max-w-[1280px] space-y-12 px-4 py-10 sm:px-6 sm:py-16">
      <header className="space-y-3 text-center">
        <p className="font-mono text-xs text-muted">
          {COPY.hub.stamp}
        </p>
        <h1 className="text-fg text-3xl font-bold tracking-tight sm:text-4xl">
          {COPY.hub.heading}
        </h1>
        <p className="text-muted">
          {COPY.hub.tagline}
        </p>
      </header>

      <PortalGun onOpenSettings={() => setSettingsOpen(true)} />

      <div className="mx-auto w-full max-w-[640px]">
        <PortalSearch label={COPY.search.hubLabel} inputId="hub-search" />
      </div>

      {settingsOpen && (
        <div className="flex justify-center">
          <SettingsPanel onClose={() => setSettingsOpen(false)} />
        </div>
      )}

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {COPY.hub.destinations.map((destination) => (
              <li key={destination.to}>
                <PortalLink
                  to={destination.to}
                  className="block border border-line bg-surface p-6 text-center transition-colors hover:border-accent"
                >
                  <span className="block font-mono text-xs tracking-widest text-muted">
                    {destination.label}
                  </span>
                  <span className="mt-3 block text-3xl font-bold text-link">
                    {data ? (
                      data[destination.key].total
                    ) : (
                      <Skeleton className="mx-auto h-8 w-20" />
                    )}
                  </span>
                </PortalLink>
              </li>
            ))}
          </ul>

          <dl className="grid grid-cols-1 gap-6 border border-line bg-surface p-4 sm:grid-cols-3 sm:p-6">
            <Figure label={COPY.hub.figures[0]} value={indexedTotal(data)} />
            <Figure label={COPY.hub.figures[1]} value={data?.ricks} />
            <Figure label={COPY.hub.figures[2]} value={data?.mortys} />
          </dl>
        </>
      )}
    </main>
  )
}
