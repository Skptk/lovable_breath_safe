import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { ErrorBoundary, withErrorBoundary } from "@/components";
import { usePerformanceMonitor, usePreload } from "@/hooks/usePerformance";
import { useAppStore } from "@/store";
import { Suspense, lazy, useEffect } from "react";

// Lazy load pages for better performance
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Products = lazy(() => import("./pages/Products"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Rewards = lazy(() => import("./pages/Rewards"));
const Store = lazy(() => import("./pages/Store"));

// Loading component
const LoadingSpinner = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center space-y-4">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
      <p className="text-muted-foreground">Loading Breath Safe...</p>
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
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </ErrorBoundary>
  );
};

export default withErrorBoundary(App);
