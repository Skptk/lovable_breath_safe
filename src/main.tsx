import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import './index.css'
import Profiler from './devtools/Profiler'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // lower RAM footprint
      gcTime: 2 * 60 * 1000,       // Garbage collect after 2 min (v4 name)
      staleTime: 60 * 1000,        // 1 min is enough for AQI/Weather
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
    },
    mutations: {
      retry: 1,
    }
  }
});

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    {import.meta.env.DEV && <Profiler />}
    <App />
  </QueryClientProvider>
);
