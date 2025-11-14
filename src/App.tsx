import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import EnhancedErrorBoundary from "@/components/EnhancedErrorBoundary";
import { usePerformanceMonitor, usePreload } from "@/hooks/usePerformance";
import { useAppStore } from "@/store";
import { useWeatherStore } from "@/store/weatherStore";
import { useGeolocation } from "@/hooks/useGeolocation";
import { Suspense, lazy, useEffect, useMemo, useRef } from "react";
import type { ErrorInfo } from "react";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ConnectionResilienceProvider } from "./components/ConnectionResilienceProvider";
import { debugTracker } from "./utils/errorTracker";
import TDZDetector from "./components/TDZDetector";
import MaintenanceGate from "./components/MaintenanceGate";
import { useLocationContext } from "@/contexts/LocationContext";

// Enhanced retry mechanism for lazy loading with better error handling
const retry = (
  fn: () => Promise<any>,
  retriesLeft: number = 3,
  interval: number = 1000,
  maxInterval: number = 5000
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const attempt = async (attemptsLeft: number) => {
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        if (attemptsLeft <= 1) {
          console.error(`Failed to load module after ${retriesLeft} attempts:`, error);
          reject(error);
          return;
        }

        // Exponential backoff with jitter
        const backoff = Math.min(interval * Math.pow(2, retriesLeft - attemptsLeft) + Math.random() * 1000, maxInterval);
        
        console.warn(`Loading module failed, retrying in ${Math.round(backoff)}ms... (${attemptsLeft - 1} attempts left)`);
        
        setTimeout(() => {
          attempt(attemptsLeft - 1);
        }, backoff);
      }
    };

    attempt(retriesLeft);
  });
};

// Lazy load pages with retry mechanism
const Landing = lazy(() => retry(() => import("./pages/Landing")));
const Index = lazy(() => retry(() => import("./pages/Index")));
const Auth = lazy(() => retry(() => import("./pages/Auth")));
const Onboarding = lazy(() => retry(() => import("./pages/Onboarding")));
const Products = lazy(() => retry(() => import("./pages/Products")));
const Privacy = lazy(() => retry(() => import("./pages/Privacy")));
const Terms = lazy(() => retry(() => import("./pages/Terms")));
const NotFound = lazy(() => retry(() => import("./pages/NotFound")));
const Demo = lazy(() => retry(() => import("./pages/Demo")));
const Contact = lazy(() => retry(() => import("./pages/Contact")));

// Loading component
const LoadingScreen = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center space-y-4">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
      <p className="text-muted-foreground">Loading Breath Safe...</p>
    </div>
  </div>
);

// Error fallback for lazy loading failures
const LazyErrorFallback = ({ error, retry }: { error: Error; retry: () => void }) => (
  <div className="min-h-screen bg-background flex items-center justify-center p-4">
    <div className="text-center space-y-4 max-w-md">
      <h1 className="text-2xl font-bold text-red-600">Loading Error</h1>
      <p className="text-muted-foreground">
        Failed to load the requested page. This might be a temporary network issue.
      </p>
      <p className="text-sm text-muted-foreground font-mono break-words">
        {error.message}
      </p>
      <div className="space-y-2">
        <button
          onClick={retry}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 mr-2"
        >
          Retry
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
        >
          Refresh Page
        </button>
      </div>
    </div>
  </div>
);

// Route guard component to prevent unnecessary redirects
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Don't redirect while loading
  if (loading) {
    return <LoadingScreen />;
  }

  // If user exists, show the protected content
  if (user) {
    return <>{children}</>;
  }

  // Only redirect to auth if we're not already there
  if (location.pathname !== '/auth') {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const resolveTrackingFlag = (): boolean => {
  if (typeof globalThis === "object") {
    const globalWithFlag = globalThis as typeof globalThis & { __TRACK_VARIABLES__?: boolean };
    if (typeof globalWithFlag.__TRACK_VARIABLES__ !== "undefined") {
      return Boolean(globalWithFlag.__TRACK_VARIABLES__);
    }
  }
  return false;
};

const App = (): JSX.Element => {
  const { loading: authLoading, isAuthenticated, user, validateProfile } = useAuth();
  const { setLoading, setError } = useAppStore();
  const weatherLoading = useWeatherStore((state) => state.isLoading);
  const weatherData = useWeatherStore((state) => state.weatherData);
  const weatherError = useWeatherStore((state) => state.error);
  const { locationData, isRequesting: locationRequesting, error: locationError } = useGeolocation();
  const { hasRequestedPermission } = useLocationContext();

  const shouldTrackVariables = useMemo(() => {
    return resolveTrackingFlag();
  }, []);

  const debugSnapshotRef = useRef<string>("");
  const renderSnapshotRef = useRef<string>("");
  const lastRenderLogRef = useRef<number>(0);

  // Performance monitoring
  usePerformanceMonitor("App");
  
  // Preload critical resources
  usePreload([
    "/src/components/ui/button.css",
    "/src/components/ui/card.css",
    "/src/components/ui/input.css"
  ]);

  useEffect(() => {
    console.log("🧩 [COMPONENT] App mounting at:", new Date().toISOString());
    if (shouldTrackVariables) {
      debugTracker.trackVariableDeclaration("App", "mounted", "App.tsx:component");
    }

    return () => {
      console.log("🧩 [COMPONENT] App unmounting at:", new Date().toISOString());
    };
  }, [shouldTrackVariables]);

  // Sync loading state with global store
  const shouldShowApp = useMemo(() => {
    if (authLoading) {
      return false;
    }

    if (user && locationRequesting) {
      return false;
    }

    return true;
  }, [authLoading, user, locationRequesting]);

  useEffect(() => {
    setLoading(!shouldShowApp);
  }, [setLoading, shouldShowApp]);

  // Validate profile when user is authenticated
  useEffect(() => {
    if (user && !authLoading) {
      validateProfile();
    }
  }, [user, authLoading, validateProfile]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated && user) {
      // Only set error if we have a user but authentication failed
      setError("Authentication required");
    } else {
      setError(null);
    }
  }, [authLoading, isAuthenticated, user, setError]);

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    const snapshotPayload = {
      authLoading,
      weatherLoading,
      locationRequesting,
      hasWeatherData: Boolean(weatherData),
      hasUser: Boolean(user),
      hasLocationData: Boolean(locationData),
      hasRequestedPermission,
      weatherError: weatherError ?? null,
      locationError: locationError ?? null,
    };

    const serialized = JSON.stringify(snapshotPayload);
    if (serialized === debugSnapshotRef.current) {
      return;
    }

    debugSnapshotRef.current = serialized;
    console.log("🔍 [DEBUG] Loading states:", snapshotPayload);
  }, [
    authLoading,
    weatherLoading,
    locationRequesting,
    weatherData,
    user,
    locationData,
    hasRequestedPermission,
    weatherError,
    locationError,
  ]);

  const appContent = useMemo<JSX.Element>(() => {
    if (shouldTrackVariables) {
      debugTracker.trackVariableAccess("App", "App.tsx:render");
    }

    const isDev = import.meta.env.DEV;
    const isProd = import.meta.env.PROD;

    // Create a route configuration for better maintainability
    const routes = [
      { path: "/", element: <Landing />, protected: false },
      { path: "/auth", element: <Auth />, protected: false },
      { path: "/onboarding", element: <Onboarding />, protected: false },
      { path: "/products", element: <Products />, protected: false },
      { path: "/privacy", element: <Privacy />, protected: false },
      { path: "/terms", element: <Terms />, protected: false },
      { path: "/demo", element: <Demo />, protected: false },
      { path: "/contact", element: <Contact />, protected: false },
      { 
        path: "/dashboard/*", 
        element: (
          <ProtectedRoute>
            <Index />
          </ProtectedRoute>
        ), 
        protected: true 
      },
    ];

    return (
      <MaintenanceGate>
        <ThemeProvider>
          <EnhancedErrorBoundary
            onError={(error: Error, errorInfo: ErrorInfo) => {
              console.error("App-level error:", error, errorInfo);
              setError(error.message);
            }}
            fallback={
              <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="text-center space-y-4">
                  <h1 className="text-2xl font-bold text-red-600">Application Error</h1>
                  <p className="text-muted-foreground">
                    Something went wrong. Please refresh the page or contact support.
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                  >
                    Refresh Page
                  </button>
                </div>
              </div>
            }
          >
            <TooltipProvider>
              <ConnectionResilienceProvider
                config={{
                  heartbeatInterval: isDev ? 60000 : 120000,
                  showDebugPanel: isDev,
                  maxReconnectAttempts: isProd ? 5 : 10,
                  alertAutoHide: 5000,
                  // Enable retries for chunk loading errors
                  retryOnChunkError: true,
                  retryCount: 3
                }}
              >
                <TDZDetector />
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <Suspense 
                    fallback={
                      <div className="min-h-screen bg-background flex items-center justify-center">
                        <div className="text-center space-y-4">
                          <div className="animate-pulse flex space-x-4">
                            <div className="flex-1 space-y-6 py-1">
                              <div className="h-4 bg-muted rounded w-3/4 mx-auto"></div>
                              <div className="space-y-3">
                                <div className="grid grid-cols-3 gap-4">
                                  <div className="h-2 bg-muted rounded col-span-2"></div>
                                  <div className="h-2 bg-muted rounded col-span-1"></div>
                                </div>
                                <div className="h-2 bg-muted rounded"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <p className="text-muted-foreground text-sm">Loading application...</p>
                      </div>
                    }
                  >
                    <EnhancedErrorBoundary
                      onError={(error: Error, errorInfo: ErrorInfo) => {
                        console.error("Route loading error:", error, errorInfo);
                        setError(error.message);
                        // Log the error to an error tracking service
                        if (import.meta.env.PROD) {
                          // Replace with your error tracking service
                          console.error('Route loading error:', { error, errorInfo });
                        }
                      }}
                      fallback={({ error, resetErrorBoundary }) => (
                        <div className="min-h-screen bg-background flex items-center justify-center p-4">
                          <div className="text-center space-y-4 max-w-md">
                            <h1 className="text-2xl font-bold text-red-600">Something went wrong</h1>
                            <p className="text-muted-foreground">
                              We're having trouble loading this page. This might be a temporary issue.
                            </p>
                            <div className="space-y-2">
                              <button
                                onClick={() => {
                                  resetErrorBoundary();
                                  window.location.reload();
                                }}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 w-full"
                              >
                                Reload Page
                              </button>
                              <button
                                onClick={() => window.location.href = "/"}
                                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 w-full"
                              >
                                Go to Homepage
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    >
                      <Routes>
                        {routes.map((route) => (
                          <Route
                            key={route.path}
                            path={route.path}
                            element={
                              <Suspense 
                                fallback={
                                  <div className="min-h-[60vh] flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                                  </div>
                                }
                              >
                                {route.element}
                              </Suspense>
                            }
                          />
                        ))}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </EnhancedErrorBoundary>
                  </Suspense>
                </BrowserRouter>
              </ConnectionResilienceProvider>
            </TooltipProvider>
          </EnhancedErrorBoundary>
        </ThemeProvider>
      </MaintenanceGate>
    );
  }, [
    setError,
    shouldTrackVariables,
    authLoading,
    weatherLoading,
    locationRequesting,
    user,
    weatherData,
    locationData,
    shouldShowApp,
  ]);

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    const snapshotPayload = {
      authLoading,
      weatherLoading,
      locationLoading: locationRequesting,
      hasUser: Boolean(user),
      hasWeatherData: Boolean(weatherData),
      hasLocationData: Boolean(locationData),
      timestamp: new Date().toISOString(),
    };

    const serialized = JSON.stringify(snapshotPayload);
    const now = Date.now();
    if (
      serialized === renderSnapshotRef.current &&
      now - lastRenderLogRef.current < 2_000
    ) {
      return;
    }

    renderSnapshotRef.current = serialized;
    lastRenderLogRef.current = now;
    console.log("🔍 [LOADING-DEBUG] Full state check:", snapshotPayload);
  }, [
    authLoading,
    weatherLoading,
    locationRequesting,
    weatherData,
    user,
    locationData,
  ]);

  const renderedContent = shouldShowApp ? appContent : <LoadingScreen />;

  if (!shouldShowApp && import.meta.env.DEV) {
    console.log("🧩 [RENDER] App waiting for prerequisites", {
      authLoading,
      hasUser: Boolean(user),
      hasLocationData: Boolean(locationData),
    });
  }

  return renderedContent;
};

export default App;
