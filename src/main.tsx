// Import error tracker first
import './utils/errorTracker'

import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import './index.css'
import Profiler from './devtools/Profiler'
import { AuthProvider } from './contexts/AuthContext'
import { RealtimeProvider } from './contexts/RealtimeContext'
import { LocationProvider } from './contexts/LocationContext'
import { SupabaseErrorBoundary } from './components/SupabaseErrorBoundary'

// Track module loading order
console.log('🚀 [MODULE] main.tsx loading at:', new Date().toISOString())

// Wrap all imports with try-catch and logging
const safeImport = async (moduleName: string, importFn: () => Promise<any>) => {
  try {
    console.log(`📦 [IMPORT] Loading ${moduleName}...`)
    const module = await importFn()
    console.log(`✅ [IMPORT] Successfully loaded ${moduleName}`)
    return module
  } catch (error) {
    console.error(`❌ [IMPORT] Failed to load ${moduleName}:`, error)
    throw error
  }
}

// Reference helper to keep it available during debugging sessions
void safeImport

// Global error handling for unhandled promise rejections
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Global unhandled promise rejection:', {
      reason: event.reason,
      promise: event.promise,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    });

    // Prevent the default browser behavior
    event.preventDefault();

    // Log additional context for debugging
    if (event.reason instanceof Error) {
      console.error('Promise rejection error details:', {
        message: event.reason.message,
        stack: event.reason.stack,
        name: event.reason.name
      });
    }

    // You could send this to an error reporting service here
    // Example: Sentry, LogRocket, etc.
  });

  // Global error handler for other errors
  window.addEventListener('error', (event) => {
    console.error('Global error:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
      timestamp: new Date().toISOString(),
      url: window.location.href
    });
  });
}

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
  <SupabaseErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RealtimeProvider>
          <LocationProvider>
            {import.meta.env.DEV && <Profiler />}
            <App />
          </LocationProvider>
        </RealtimeProvider>
      </AuthProvider>
    </QueryClientProvider>
  </SupabaseErrorBoundary>
);
