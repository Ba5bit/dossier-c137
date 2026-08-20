import { useCallback, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { PortalProvider } from '../shared/portal/PortalProvider'
import { PortalLink } from '../shared/portal/PortalLink'
import { SettingsPanel } from '../shared/settings/SettingsPanel'
import { DimensionWave } from '../shared/settings/DimensionWave'
import { HistoryNav } from '../shared/ui/HistoryNav'
import { RefreshBar } from '../shared/ui/RefreshBar'
import { SearchOverlay } from '../features/search/SearchOverlay'
import { useSearchHotkey } from '../features/search/useSearchHotkey'
import { useScrollToTop } from '../shared/hooks/useScrollToTop'
import { useKonami } from '../shared/hooks/useKonami'
import { useSettings } from '../shared/settings/useSettings'
import { COPY } from '../shared/lore/copy'

/** Cmd on Apple hardware, Ctrl on everything else. */
function isApplePlatform(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent)
}

export function AppLayout() {
  const { pathname } = useLocation()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const gunRef = useRef<HTMLButtonElement | null>(null)
  const controlsRef = useRef<HTMLDivElement | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLButtonElement | null>(null)

  const { setSetting } = useSettings()

  const openSearch = useCallback(() => setSearchOpen(true), [])
  useSearchHotkey(openSearch)
  useScrollToTop()

  // Spec section 11.3. It writes through the ordinary setter, so the choice
  // persists and the dimension wave plays exactly as it does from the panel.
  const toCronenberg = useCallback(
    () => setSetting('dimension', 'cronenberg'),
    [setSetting],
  )
  useKonami(toCronenberg)

  // The panel is a popover now, so a click anywhere else has to dismiss it —
  // that is what a popover means, and Escape alone is a keyboard-only escape.
  useEffect(() => {
    if (!settingsOpen) return

    function onPointerDown(event: MouseEvent) {
      if (!controlsRef.current?.contains(event.target as Node)) {
        setSettingsOpen(false)
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [settingsOpen])

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
          <header className="sticky top-0 z-30 border-b border-line bg-surface">
            <nav
              aria-label={COPY.layout.navLabel}
              className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6"
            >
              <PortalLink
                to="/"
                className="tap-target font-mono text-xs tracking-widest text-accent"
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
                        className={`tap-target font-mono text-xs transition-colors hover:text-accent ${
                          active ? 'text-accent' : 'text-muted'
                        }`}
                      >
                        {section.label}
                      </PortalLink>
                    </li>
                  )
                })}
              </ul>

              {/* Search and ask are the two ways into the archive that are not
                  a registry, so they travel together and take the room they
                  need — full width on a phone, a wide field on a desktop. */}
              <div
                ref={controlsRef}
                className="relative order-last ml-auto flex w-full items-center gap-2 sm:order-none sm:w-auto"
              >
                <button
                  ref={searchRef}
                  type="button"
                  aria-label={COPY.layout.searchButtonLabel}
                  onClick={openSearch}
                  className="tap-target flex min-w-0 flex-1 items-center gap-2 border border-line bg-bg px-3 py-2 font-mono text-xs text-muted transition-colors hover:border-accent hover:text-accent sm:w-52 sm:flex-none md:w-64"
                >
                  <span aria-hidden="true">⌕</span>
                  <span className="truncate sm:hidden">
                    {COPY.layout.searchButtonShort}
                  </span>
                  <span className="hidden truncate sm:inline">
                    {COPY.layout.searchButton}
                  </span>
                  <span
                    aria-hidden="true"
                    className="ml-auto hidden shrink-0 border border-line px-1 text-[10px] md:inline"
                  >
                    {isApplePlatform()
                      ? COPY.layout.searchHintApple
                      : COPY.layout.searchHint}
                  </span>
                </button>

                <PortalLink
                  to="/ask"
                  aria-label={COPY.layout.askButtonLabel}
                  aria-current={pathname.startsWith('/ask') ? 'page' : undefined}
                  className="tap-target shrink-0 border border-accent bg-accent/10 px-3 py-2 font-mono text-xs tracking-widest text-accent transition-colors hover:bg-accent/20"
                >
                  {COPY.layout.askButton}
                </PortalLink>

                <button
                  ref={gunRef}
                  type="button"
                  aria-label={COPY.layout.gunButtonLabel}
                  aria-expanded={settingsOpen}
                  onClick={() => setSettingsOpen((open) => !open)}
                  className="tap-target shrink-0 border border-line px-3 py-2 font-mono text-xs text-muted transition-colors hover:border-accent hover:text-accent"
                >
                  {COPY.layout.gunButton}
                </button>

                {settingsOpen && (
                  // Anchored to the controls rather than laid into the header
                  // flow: opening it used to push the whole page down.
                  <div className="absolute right-0 top-full z-40 mt-2">
                    <SettingsPanel onClose={closeSettings} />
                  </div>
                )}
              </div>
            </nav>
          </header>

          <HistoryNav />

          <Outlet />
        </div>

        {searchOpen && <SearchOverlay onClose={closeSearch} />}
        <DimensionWave />
      </div>
    </PortalProvider>
  )
}
