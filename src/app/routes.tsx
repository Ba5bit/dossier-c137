import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from './AppLayout'
import { DetailSkeleton } from '../shared/ui/DetailSkeleton'

// Spec section 12.2: routes are code-split. The hub carries a canvas and the
// detail pages carry their own dossier bodies; there is no reason for a
// visitor who only reads the character list to download any of it.
const HubPage = lazy(() =>
  import('../pages/HubPage').then((module) => ({ default: module.HubPage })),
)
const CharactersPage = lazy(() =>
  import('../pages/CharactersPage').then((module) => ({
    default: module.CharactersPage,
  })),
)
const CharacterDetailPage = lazy(() =>
  import('../pages/CharacterDetailPage').then((module) => ({
    default: module.CharacterDetailPage,
  })),
)
const LocationsPage = lazy(() =>
  import('../pages/LocationsPage').then((module) => ({
    default: module.LocationsPage,
  })),
)
const LocationDetailPage = lazy(() =>
  import('../pages/LocationDetailPage').then((module) => ({
    default: module.LocationDetailPage,
  })),
)
const EpisodesPage = lazy(() =>
  import('../pages/EpisodesPage').then((module) => ({
    default: module.EpisodesPage,
  })),
)
const EpisodeDetailPage = lazy(() =>
  import('../pages/EpisodeDetailPage').then((module) => ({
    default: module.EpisodeDetailPage,
  })),
)
const NotFoundPage = lazy(() =>
  import('../pages/NotFoundPage').then((module) => ({
    default: module.NotFoundPage,
  })),
)

// A chunk that is still downloading is a load like any other, so it gets the
// same skeleton geometry rather than a spinner.
function lazyRoute(element: React.ReactNode) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-[1280px] px-6 py-10">
          <DetailSkeleton />
        </main>
      }
    >
      {element}
    </Suspense>
  )
}

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: lazyRoute(<HubPage />) },
      { path: '/characters', element: lazyRoute(<CharactersPage />) },
      { path: '/characters/:id', element: lazyRoute(<CharacterDetailPage />) },
      { path: '/locations', element: lazyRoute(<LocationsPage />) },
      { path: '/locations/:id', element: lazyRoute(<LocationDetailPage />) },
      { path: '/episodes', element: lazyRoute(<EpisodesPage />) },
      { path: '/episodes/:id', element: lazyRoute(<EpisodeDetailPage />) },
      { path: '*', element: lazyRoute(<NotFoundPage />) },
    ],
  },
])
