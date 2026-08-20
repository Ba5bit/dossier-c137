import { useCallback, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { PortalProvider } from '../shared/portal/PortalProvider'
import { PortalLink } from '../shared/portal/PortalLink'
import { SettingsPanel } from '../shared/settings/SettingsPanel'
import { DimensionWave } from '../shared/settings/DimensionWave'
import { RefreshBar } from '../shared/ui/RefreshBar'
import { SearchOverlay } from '../features/search/SearchOverlay'
import { useSearchHotkey } from '../features/search/useSearchHotkey'
import { useKonami } from '../shared/hooks/useKonami'
import { useSettings } from '../shared/settings/useSettings'
import { COPY } from '../shared/lore/copy'

export function AppLayout() {
  const { pathname } = useLocation()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const gunRef = useRef<HTMLButtonElement | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLButtonElement | null>(null)

  const { setSetting } = useSettings()

  const openSearch = useCallback(() => setSearchOpen(true), [])
  useSearchHotkey(openSearch)

  // Spec section 11.3. It writes through the ordinary setter, so the choice
  // persists and the dimension wave plays exactly as it does from the panel.
  const toCronenberg = useCallback(
    () => setSetting('dimension', 'cronenberg'),
    [setSetting],
  )
  useKonami(toCronenberg)

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

        {/* Spec section 12.1 wants the overlay to trap focus. `inert` is the
            whole trap: the shell leaves both the tab order and the
            accessibility tree, so Tab cannot reach the page behind the dialog
            and the hub's own search box stops answering to the same name. */}
        <div data-testid="page-shell" inert={searchOpen}>
          <header className="border-b border-line bg-surface">
            <nav
              aria-label={COPY.layout.navLabel}
              className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4 sm:px-6"
            >
              <PortalLink
                to="/"
                className="font-mono text-xs tracking-widest text-accent"
              >
                {COPY.layout.brand}
              </PortalLink>

              <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {COPY.layout.sections.map((section) => {
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
                aria-label={COPY.layout.searchButtonLabel}
                onClick={openSearch}
                className="ml-auto border border-line px-3 py-1 font-mono text-xs text-muted transition-colors hover:border-accent hover:text-accent"
              >
                {COPY.layout.searchButton}
              </button>

              <button
                ref={gunRef}
                type="button"
                aria-label={COPY.layout.gunButtonLabel}
                aria-expanded={settingsOpen}
                onClick={() => setSettingsOpen((open) => !open)}
                className="border border-line px-3 py-1 font-mono text-xs text-muted transition-colors hover:border-accent hover:text-accent"
              >
                {COPY.layout.gunButton}
              </button>
            </nav>

            {settingsOpen && (
              <div className="mx-auto flex max-w-[1280px] justify-end px-6 pb-4">
                <SettingsPanel onClose={closeSettings} />
              </div>
            )}
          </header>

          <Outlet />
        </div>

        {searchOpen && <SearchOverlay onClose={closeSearch} />}
        <DimensionWave />
      </div>
    </PortalProvider>
  )
}
