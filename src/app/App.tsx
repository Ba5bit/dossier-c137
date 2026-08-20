import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { router } from './routes'
import { SettingsProvider } from '../shared/settings/SettingsProvider'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <RouterProvider router={router} />
      </SettingsProvider>
    </QueryClientProvider>
  )
}
