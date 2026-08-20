import { NavLink, Outlet } from 'react-router-dom'

const SECTIONS = [
  { to: '/characters', label: 'CHARACTERS' },
  { to: '/locations', label: 'LOCATIONS' },
  { to: '/episodes', label: 'EPISODES' },
]

// A plain bar for now. Plan 3 replaces it with the header that carries the
// mini portal gun and the settings panel.
export function AppLayout() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-surface">
        <nav
          aria-label="Sections"
          className="mx-auto flex max-w-[1280px] items-center gap-6 px-6 py-4"
        >
          <span className="font-mono text-xs tracking-widest text-accent">
            DOSSIER C-137
          </span>

          <ul className="flex items-center gap-4">
            {SECTIONS.map((section) => (
              <li key={section.to}>
                <NavLink
                  to={section.to}
                  className={({ isActive }) =>
                    `font-mono text-xs transition-colors hover:text-accent ${
                      isActive ? 'text-accent' : 'text-muted'
                    }`
                  }
                >
                  {section.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <Outlet />
    </div>
  )
}
