import { useState } from 'react'
import { useStats } from '../features/stats/useStats'
import { PortalGun } from '../shared/portal/PortalGun'
import { PortalSearch } from '../features/search/PortalSearch'
import { PortalLink } from '../shared/portal/PortalLink'
import { SettingsPanel } from '../shared/settings/SettingsPanel'
import { Skeleton } from '../shared/ui/Skeleton'
import { ErrorState } from '../shared/ui/ErrorState'
import type { Stats } from '../shared/api/types'

const DESTINATIONS = [
  { to: '/characters', label: 'CHARACTERS', key: 'characters' },
  { to: '/locations', label: 'LOCATIONS', key: 'locations' },
  { to: '/episodes', label: 'EPISODES', key: 'episodes' },
] as const

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
    <main className="mx-auto max-w-[1280px] space-y-12 px-6 py-16">
      <header className="space-y-3 text-center">
        <p className="font-mono text-xs text-muted">
          DOSSIER C-137 // CLEARANCE: UNRESTRICTED
        </p>
        <h1 className="text-fg text-4xl font-bold tracking-tight">
          DOSSIER C-137
        </h1>
        <p className="text-muted">
          The Citadel&apos;s archive. Everything on file, nothing you&apos;re
          cleared to question.
        </p>
      </header>

      <PortalGun onOpenSettings={() => setSettingsOpen(true)} />

      <div className="mx-auto w-full max-w-[640px]">
        <PortalSearch label="Archive coordinates" />
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
            {DESTINATIONS.map((destination) => (
              <li key={destination.to}>
                <PortalLink
                  to={destination.to}
                  className="block border border-line bg-surface p-6 text-center transition-colors hover:border-accent"
                >
                  <span className="block font-mono text-xs tracking-widest text-muted">
                    {destination.label}
                  </span>
                  <span className="text-fg mt-3 block text-3xl font-bold">
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

          <dl className="grid grid-cols-2 gap-6 border border-line bg-surface p-6 sm:grid-cols-5">
            <Figure label="ENTITIES INDEXED" value={indexedTotal(data)} />
            <Figure label="LOCATIONS ON FILE" value={data?.locations.total} />
            <Figure label="EPISODES LOGGED" value={data?.episodes.total} />
            <Figure label="RICKS ON FILE" value={data?.ricks} />
            <Figure label="MORTYS ON FILE" value={data?.mortys} />
          </dl>
        </>
      )}
    </main>
  )
}
