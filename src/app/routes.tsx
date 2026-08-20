import { createBrowserRouter, Navigate } from 'react-router-dom'
import { CharactersPage } from '../pages/CharactersPage'
import { NotFoundPage } from '../pages/NotFoundPage'

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/characters" replace /> },
  { path: '/characters', element: <CharactersPage /> },
  { path: '*', element: <NotFoundPage /> },
])
