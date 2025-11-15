// React must be imported first and only once - CRITICAL: Must execute synchronously
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider, QueryCache } from '@tanstack/react-query';

// CRITICAL: Ensure React is globally available BEFORE any other code runs
// This prevents libraries from trying to access React.Children before React is loaded
if (typeof window !== 'undefined') {
  (window as any).React = React;
}

// Import error tracker after React is loaded
import './utils/errorTracker';
import App from './App.tsx'
import './index.css'
import Profiler from './devtools/Profiler'
import { AuthProvider } from './contexts/AuthContext'
import { RealtimeProvider } from './contexts/RealtimeContext'
import { LocationProvider } from './contexts/LocationContext'
import { SupabaseErrorBoundary } from './components/SupabaseErrorBoundary'
import { initHeapFailSafe } from './utils/heapFailSafe'
import { memoryBudgetManager } from './utils/memoryBudgetManager'
import { MemoryMonitorOverlay } from './components/MemoryMonitorOverlay'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // CRITICAL: Ultra-aggressive memory management
      gcTime: 30 * 1000, // 30 seconds - very short retention
      staleTime: 30 * 1000, // 30 seconds
      refetchOnWindowFocus: false,
      refetchOnReconnect: false, // Disable auto-refetch on reconnect to prevent memory spikes
      retry: 1,
      meta: {
        budget: 'critical', // Signal critical memory budget
      },
    },
    mutations: {
      retry: 1,
      gcTime: 10 * 1000, // 10 seconds for mutations - very short
    }
  },
  queryCache: new QueryCache({
    onSuccess: () => {
      // Delegate to memory budget manager for consistent cleanup
      // Optimized: Defer cleanup to avoid blocking query handlers
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => {
          memoryBudgetManager.performCleanup('Query success');
        }, { timeout: 2000 });
      } else {
        setTimeout(() => {
          memoryBudgetManager.performCleanup('Query success');
        }, 100);
      }
    }
  })
})

// Register query client with memory budget manager
memoryBudgetManager.setQueryClient(queryClient)

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

  // CRITICAL: Stop all polling when tab is hidden to prevent memory growth
  // Optimized: Defer heavy cleanup to avoid blocking the main thread
  if (typeof document !== 'undefined') {
    let visibilityChangeTimeout: number | null = null;
    
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Pause all polling immediately (lightweight operation)
        memoryBudgetManager.pauseAllPolling();
        
        // Clear any pending timeout
        if (visibilityChangeTimeout !== null) {
          clearTimeout(visibilityChangeTimeout);
        }
        
        // Defer heavy cleanup operations to avoid blocking main thread
        // Use requestIdleCallback if available, otherwise setTimeout
        if ('requestIdleCallback' in window) {
          (window as any).requestIdleCallback(() => {
            memoryBudgetManager.emergencyCleanup('Tab hidden');
          }, { timeout: 1000 });
        } else {
          visibilityChangeTimeout = window.setTimeout(() => {
            memoryBudgetManager.emergencyCleanup('Tab hidden');
            visibilityChangeTimeout = null;
          }, 100);
        }
      }
    }, { passive: true });
  }
}

createRoot(document.getElementById("root")!).render(
  <SupabaseErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RealtimeProvider>
          <LocationProvider>
            {import.meta.env.DEV && <Profiler />}
            {import.meta.env.DEV && <MemoryMonitorOverlay />}
            <App />
          </LocationProvider>
        </RealtimeProvider>
      </AuthProvider>
    </QueryClientProvider>
  </SupabaseErrorBoundary>
);
