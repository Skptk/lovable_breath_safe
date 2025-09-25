import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import EnhancedErrorBoundary from "@/components/EnhancedErrorBoundary";
import { usePerformanceMonitor, usePreload } from "@/hooks/usePerformance";
import { useAppStore } from "@/store";
import { Suspense, lazy, useEffect, useMemo } from "react";
import type { ErrorInfo } from "react";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ConnectionResilienceProvider } from "./components/ConnectionResilienceProvider";
import { debugTracker } from "./utils/errorTracker";
import TDZDetector from "./components/TDZDetector";
import MaintenanceGate from "./components/MaintenanceGate";

// Retry mechanism for lazy loading
const retry = (fn: () => Promise<any>, retriesLeft: number = 3, interval: number = 1000): Promise<any> => {
  return new Promise((resolve, reject) => {
    fn()
      .then(resolve)
      .catch((error) => {
        if (retriesLeft === 0) {
          reject(error);
          return;
        }
        setTimeout(() => {
          retry(fn, retriesLeft - 1, interval).then(resolve, reject);
        }, interval);
      });
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
const LoadingSpinner = () => (
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
    return <LoadingSpinner />;
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
  return true;
};

const App = (): JSX.Element => {
  const { loading, isAuthenticated, user, validateProfile } = useAuth();
  const { setLoading, setError } = useAppStore();

  const shouldTrackVariables = useMemo(() => {
    return resolveTrackingFlag();
  }, []);
  
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
  useEffect(() => {
    setLoading(loading);
  }, [loading, setLoading]);

  // Validate profile when user is authenticated
  useEffect(() => {
    if (user && !loading) {
      validateProfile();
    }
  }, [user, loading, validateProfile]);

  useEffect(() => {
    if (!loading && !isAuthenticated && user) {
      // Only set error if we have a user but authentication failed
      setError("Authentication required");
    } else {
      setError(null);
    }
  }, [loading, isAuthenticated, user, setError]);

  const appContent = useMemo<JSX.Element>(() => {
    console.log("🧩 [RENDER] App rendering at:", new Date().toISOString());
    if (shouldTrackVariables) {
      debugTracker.trackVariableAccess("App", "App.tsx:render");
    }

    if (loading) {
      console.log("🧩 [RENDER] App returning loading state");
      return <LoadingSpinner />;
    }

    const isDev = import.meta.env.DEV;
    const isProd = import.meta.env.PROD;

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
                  alertAutoHide: 5000
                }}
              >
                <TDZDetector />
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <Suspense fallback={<LoadingSpinner />}>
                    <EnhancedErrorBoundary
                      onError={(error: Error, errorInfo: ErrorInfo) => {
                        console.error("Route loading error:", error, errorInfo);
                        setError(error.message);
                      }}
                      fallback={<LazyErrorFallback error={new Error("Failed to load route")} retry={() => window.location.reload()} />}
                    >
                      <Routes>
                        <Route path="/" element={<Landing />} />
                        <Route path="/auth" element={<Auth />} />
                        <Route path="/onboarding" element={<Onboarding />} />
                        <Route path="/products" element={<Products />} />
                        <Route path="/privacy" element={<Privacy />} />
                        <Route path="/terms" element={<Terms />} />
                        <Route path="/demo" element={<Demo />} />
                        <Route path="/contact" element={<Contact />} />
                        <Route
                          path="/dashboard"
                          element={
                            <ProtectedRoute>
                              <Index />
                            </ProtectedRoute>
                          }
                        />
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
  }, [loading, setError, shouldTrackVariables]);

  return appContent;
};

export default App;
