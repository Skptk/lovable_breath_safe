// Import error tracker first
import './utils/errorTracker'

import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider, QueryCache } from '@tanstack/react-query'
import App from './App.tsx'
import './index.css'
import Profiler from './devtools/Profiler'
import { AuthProvider } from './contexts/AuthContext'
import { RealtimeProvider } from './contexts/RealtimeContext'
import { LocationProvider } from './contexts/LocationContext'
import { SupabaseErrorBoundary } from './components/SupabaseErrorBoundary'
import { initHeapFailSafe } from './utils/heapFailSafe'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Aggressive memory management - reduce cache retention
      gcTime: 2 * 60 * 1000, // 2 minutes (was 60s, but need balance)
      staleTime: 60 * 1000, // 1 minute (was 30s)
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
      meta: {
        budget: 'low', // Signal low memory budget
      },
    },
    mutations: {
      retry: 1,
      gcTime: 30 * 1000, // 30 seconds for mutations
    }
  },
  queryCache: new QueryCache({
    onSuccess: () => {
      if (!queryClient) return

      // More aggressive cache trimming
      setTimeout(() => {
        const MAX_QUERIES = 15 // Increased slightly but still limited
        const MAX_QUERY_DATA_SIZE = 50 // Limit individual query result arrays
        
        const allQueries = queryClient.getQueryCache().getAll()
        
        // Trim large query results first
        for (const query of allQueries) {
          const data = query.state.data
          if (Array.isArray(data) && data.length > MAX_QUERY_DATA_SIZE) {
            // Keep only the most recent items
            query.setState({
              data: data.slice(0, MAX_QUERY_DATA_SIZE),
              dataUpdatedAt: Date.now()
            })
          }
        }
        
        // Remove inactive queries if we're over limit
        if (allQueries.length > MAX_QUERIES) {
          const inactiveQueries = allQueries
            .filter(q => !q.isActive())
            .sort((a, b) => (a.state.dataUpdatedAt ?? 0) - (b.state.dataUpdatedAt ?? 0))
            .slice(0, allQueries.length - MAX_QUERIES)
          
          for (const query of inactiveQueries) {
            queryClient.getQueryCache().remove(query)
          }
          
          console.log(`🧹 Trimmed ${inactiveQueries.length} inactive queries, kept ${MAX_QUERIES} active`)
        }
      }, 1000)
    }
  })
})

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
  if ('performance' in window) {
    initHeapFailSafe({
      queryClient,
      onWarn: (usedMb) => {
        console.warn('🟡 [HeapFailSafe] High heap usage detected', { usedMb })
      },
      onCritical: (usedMb) => {
        console.error('⚠️ [HeapFailSafe] Critical heap usage detected, caches cleared', { usedMb })
      },
      onEmergency: (usedMb) => {
        console.error('🚨 [HeapFailSafe] Emergency heap usage triggering reload', { usedMb })
      }
    })
  }

  // Memory optimization: Clear caches when tab is hidden
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Tab is hidden - aggressively clean up memory
        const allQueries = queryClient.getQueryCache().getAll()
        const inactiveQueries = allQueries.filter(q => !q.isActive())
        
        // Remove all inactive queries when tab is hidden
        for (const query of inactiveQueries) {
          queryClient.getQueryCache().remove(query)
        }
        
        // Force garbage collection hint
        if (inactiveQueries.length > 0) {
          console.log(`🧹 [Memory] Tab hidden - cleared ${inactiveQueries.length} inactive queries`)
        }
      }
    })
  }
}

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
