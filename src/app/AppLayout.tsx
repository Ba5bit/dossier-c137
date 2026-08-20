import { useCallback, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { PortalProvider } from '../shared/portal/PortalProvider'
import { PortalLink } from '../shared/portal/PortalLink'
import { SettingsPanel } from '../shared/settings/SettingsPanel'
import { DimensionWave } from '../shared/settings/DimensionWave'
import { RefreshBar } from '../shared/ui/RefreshBar'
import { SearchOverlay } from '../features/search/SearchOverlay'
import { useSearchHotkey } from '../features/search/useSearchHotkey'

const SECTIONS = [
  { to: '/characters', label: 'CHARACTERS' },
  { to: '/locations', label: 'LOCATIONS' },
  { to: '/episodes', label: 'EPISODES' },
  { to: '/ask', label: 'ASK' },
]

export function AppLayout() {
  const { pathname } = useLocation()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const gunRef = useRef<HTMLButtonElement | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLButtonElement | null>(null)

  const openSearch = useCallback(() => setSearchOpen(true), [])
  useSearchHotkey(openSearch)

  function closeSearch() {
    setSearchOpen(false)
    searchRef.current?.focus()
  }

  function closeSettings() {
    setSettingsOpen(false)
    gunRef.current?.focus()
  }

  return (
    <PortalProvider>
      <div className="min-h-screen">
        <RefreshBar />

        <header className="border-b border-line bg-surface">
          <nav
            aria-label="Sections"
            className="mx-auto flex max-w-[1280px] items-center gap-6 px-6 py-4"
          >
            <PortalLink
              to="/"
              className="font-mono text-xs tracking-widest text-accent"
            >
              DOSSIER C-137
            </PortalLink>

            <ul className="flex items-center gap-4">
              {SECTIONS.map((section) => {
                const active = pathname.startsWith(section.to)

                return (
                  <li key={section.to}>
                    <PortalLink
                      to={section.to}
                      aria-current={active ? 'page' : undefined}
                      className={`font-mono text-xs transition-colors hover:text-accent ${
                        active ? 'text-accent' : 'text-muted'
                      }`}
                    >
                      {section.label}
                    </PortalLink>
                  </li>
                )
              })}
            </ul>

            <button
              ref={searchRef}
              type="button"
              aria-label="Search"
              onClick={openSearch}
              className="ml-auto border border-line px-3 py-1 font-mono text-xs text-muted transition-colors hover:border-accent hover:text-accent"
            >
              &#8981; SEARCH
            </button>

            <button
              ref={gunRef}
              type="button"
              aria-label="Portal gun"
              aria-expanded={settingsOpen}
              onClick={() => setSettingsOpen((open) => !open)}
              className="border border-line px-3 py-1 font-mono text-xs text-muted transition-colors hover:border-accent hover:text-accent"
            >
              &#9678; GUN
            </button>
          </nav>

          {settingsOpen && (
            <div className="mx-auto flex max-w-[1280px] justify-end px-6 pb-4">
              <SettingsPanel onClose={closeSettings} />
            </div>
          )}
        </header>

        {searchOpen && <SearchOverlay onClose={closeSearch} />}

        <Outlet />
        <DimensionWave />
      </div>
    </PortalProvider>
  )
}
