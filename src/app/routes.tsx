import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from './AppLayout'
import { CharactersPage } from '../pages/CharactersPage'
import { CharacterDetailPage } from '../pages/CharacterDetailPage'
import { LocationsPage } from '../pages/LocationsPage'
import { LocationDetailPage } from '../pages/LocationDetailPage'
import { EpisodesPage } from '../pages/EpisodesPage'
import { EpisodeDetailPage } from '../pages/EpisodeDetailPage'
import { NotFoundPage } from '../pages/NotFoundPage'

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <Navigate to="/characters" replace /> },
      { path: '/characters', element: <CharactersPage /> },
      { path: '/characters/:id', element: <CharacterDetailPage /> },
      { path: '/locations', element: <LocationsPage /> },
      { path: '/locations/:id', element: <LocationDetailPage /> },
      { path: '/episodes', element: <EpisodesPage /> },
      { path: '/episodes/:id', element: <EpisodeDetailPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
