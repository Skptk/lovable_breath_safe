import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { ErrorBoundary, withErrorBoundary } from "@/components";
import { usePerformanceMonitor, usePreload } from "@/hooks/usePerformance";
import { useAppStore } from "@/store";
import { Suspense, lazy, useEffect } from "react";

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
const Index = lazy(() => retry(() => import("./pages/Index")));
const Auth = lazy(() => retry(() => import("./pages/Auth")));
const Products = lazy(() => retry(() => import("./pages/Products")));
const Privacy = lazy(() => retry(() => import("./pages/Privacy")));
const Terms = lazy(() => retry(() => import("./pages/Terms")));
const NotFound = lazy(() => retry(() => import("./pages/NotFound")));
const Rewards = lazy(() => retry(() => import("./pages/Rewards")));
const Store = lazy(() => retry(() => import("./pages/Store")));

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

const App = (): JSX.Element => {
  const { loading, isAuthenticated } = useAuth();
  const { setLoading, setError } = useAppStore();
  
  // Performance monitoring
  usePerformanceMonitor("App");
  
  // Preload critical resources
  usePreload([
    "/src/components/ui/button.css",
    "/src/components/ui/card.css",
    "/src/components/ui/input.css"
  ]);

  // Sync loading state with global store
  useEffect(() => {
    setLoading(loading);
  }, [loading, setLoading]);

  // Handle authentication errors
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setError("Authentication required");
    } else {
      setError(null);
    }
  }, [loading, isAuthenticated, setError]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
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
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<LoadingSpinner />}>
            <ErrorBoundary
              onError={(error, errorInfo) => {
                console.error("Route loading error:", error, errorInfo);
                setError(error.message);
              }}
              fallback={<LazyErrorFallback error={new Error("Failed to load route")} retry={() => window.location.reload()} />}
            >
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/products" element={<Products />} />
                <Route path="/rewards" element={<Rewards />} />
                <Route path="/store" element={<Store />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route 
                  path="/" 
                  element={isAuthenticated ? <Index /> : <Auth />} 
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ErrorBoundary>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </ErrorBoundary>
  );
};

export default withErrorBoundary(App);
