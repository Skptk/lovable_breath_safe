import { useState, useEffect, Suspense, lazy, startTransition, useRef } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import MobileNavigation from "@/components/MobileNavigation";
import { DeveloperTools } from "@/components/DeveloperTools";
import "@/styles/app-background.css";
import { cleanupAllChannels } from "@/lib/realtimeClient";
import EnhancedErrorBoundary from "@/components/EnhancedErrorBoundary";
import { logNavigation } from "@/lib/logger";
import { useEventTimingObserver } from "@/hooks/usePerformance";
import { HistoryViewSkeleton } from "@/components/HistoryViewSkeleton";
import { MapViewSkeleton } from "@/components/MapViewSkeleton";
import { preloadRoute } from "@/utils/routePreloading";

// Lazy load heavy components
const loadAirQualityDashboard = () =>
  import("@/components/AirQualityDashboard").then(module => ({
    default: module.AirQualityDashboard
  }));

const AirQualityDashboard = lazy(loadAirQualityDashboard);
const HistoryView = lazy(() => import("@/components/HistoryView"));
const WeatherStats = lazy(() => import("@/components/WeatherStats"));
const ProfileView = lazy(() => import("@/components/ProfileView"));
const SettingsView = lazy(() => import("@/components/SettingsView"));
const Rewards = lazy(() => import("@/pages/Rewards"));
const Store = lazy(() => import("@/pages/Store"));
const NewsPage = lazy(() => import("@/components/NewsPage"));

// Loading skeleton for lazy components
const PageSkeleton = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center gap-10 px-6 py-12">
    <div className="w-full max-w-5xl space-y-6">
      <div className="h-12 w-3/4 rounded-3xl bg-primary/10 backdrop-blur animate-pulse" aria-hidden="true" />
      <div className="rounded-3xl border border-border/40 bg-card/70 p-8 shadow-lg">
        <div className="grid gap-6 md:grid-cols-2" aria-hidden="true">
          <div className="space-y-4">
            <div className="h-8 w-1/2 rounded-full bg-primary/20 animate-pulse" />
            <div className="h-24 rounded-2xl bg-primary/10 animate-pulse" />
            <div className="h-6 w-3/5 rounded-full bg-primary/10 animate-pulse" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 rounded-2xl bg-primary/10 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
      <div className="h-28 rounded-3xl border border-border/40 bg-card/50 animate-pulse" aria-hidden="true" />
    </div>
    <span className="text-sm text-muted-foreground">Preparing dashboard&hellip;</span>
  </div>
);

export default function Index(): JSX.Element | null {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [currentView, setCurrentView] = useState("dashboard");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showDeveloperTools, setShowDeveloperTools] = useState(false);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const shouldLogInteractions = import.meta.env.DEV;

  useEventTimingObserver({
    label: "IndexShell",
    minDuration: 180,
    targetRef: shellRef,
    onEntry: (entry) => {
      if (!shouldLogInteractions) {
        return;
      }

      const duration = Number(entry.duration.toFixed(2));
      const interactionId = (entry as any).interactionId ?? null;
      console.warn("[INP][IndexShell]", {
        duration,
        startTime: Number(entry.startTime.toFixed(2)),
        interactionId,
        name: entry.name,
      });
    },
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const prefetch = () => {
      void loadAirQualityDashboard();
    };

    const idleWindow = window as typeof window & {
      requestIdleCallback?: (cb: IdleRequestCallback, opts?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    if (typeof idleWindow.requestIdleCallback === "function") {
      const idleHandle = idleWindow.requestIdleCallback(prefetch, { timeout: 1500 });
      return () => {
        idleWindow.cancelIdleCallback?.(idleHandle);
      };
    }

    const timeoutId = window.setTimeout(prefetch, 0);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);
  
  // Listen for custom view change events
  useEffect(() => {
    const handleViewChange = (event: CustomEvent) => {
      const newView = event.detail.view;
      logNavigation.debug('View change event received', { newView });
      
      // Update view immediately without delay
      setCurrentView(newView);
      logNavigation.debug('Current view updated', { newView });
    };

    window.addEventListener('viewChange', handleViewChange as EventListener);
    
    return () => {
      window.removeEventListener('viewChange', handleViewChange as EventListener);
    };
  }, []);

  // Keyboard shortcut for developer tools (Ctrl+Shift+D)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        setShowDeveloperTools(prev => !prev);
        logNavigation.debug('Developer tools toggled', { showDeveloperTools: !showDeveloperTools });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showDeveloperTools]);

  // Initialize current view from URL parameters on mount only
  useEffect(() => {
    const view = searchParams.get("view") || "dashboard";
    if (view !== currentView) {
              logNavigation.debug('Initializing view from URL', { view });
      setCurrentView(view);
    }
  }, []); // Empty dependency array - only run on mount

  // Preload likely-to-be-visited routes when dashboard mounts
  useEffect(() => {
    if (currentView === "dashboard") {
      // Preload history and map routes (most common navigation paths)
      preloadRoute(() => import("@/components/HistoryView"));
      preloadRoute(() => import("@/components/WeatherStats"));
    } else if (currentView === "history") {
      // Preload map and settings when on history
      preloadRoute(() => import("@/components/WeatherStats"));
      preloadRoute(() => import("@/components/SettingsView"));
    } else if (currentView === "map") {
      // Preload history and settings when on map
      preloadRoute(() => import("@/components/HistoryView"));
      preloadRoute(() => import("@/components/SettingsView"));
    }
  }, [currentView]);

  // Sync URL with component state when view changes
  useEffect(() => {
    const currentViewParam = searchParams.get("view") || "dashboard";
    if (currentView !== currentViewParam) {
      logNavigation.debug('Syncing URL with view state', { currentView });
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('view', currentView);
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [currentView, searchParams]);

  // Cleanup realtime channels on unmount
  useEffect(() => {
    return () => {
      logNavigation.debug('Component unmounting - cleaning up realtime channels');
      cleanupAllChannels();
    };
  }, []);

  const handleViewChange = (view: string) => {
    startTransition(() => {
      setCurrentView(view);
    });
    // Update URL without page reload
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('view', view);
    window.history.pushState({}, '', newUrl.toString());
  };

  // Debug logging
  useEffect(() => {
    logNavigation.debug('Current view and URL', { currentView, url: location.pathname + location.search });
  }, [currentView, location]);

  const renderView = (): JSX.Element => {
    const makeFallback = (title: string, message: string) => (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
        <h2 className="text-2xl font-semibold text-red-500">{title}</h2>
        <p className="text-muted-foreground max-w-md">{message}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Refresh Page
        </button>
      </div>
    );

    switch (currentView) {
      case "dashboard":
        return (
          <EnhancedErrorBoundary fallback={makeFallback("Dashboard Error", "We couldn't render the air quality dashboard. Refresh to retry.")}>
            <Suspense fallback={<PageSkeleton />}>
              <AirQualityDashboard 
                onNavigate={handleViewChange} 
                showMobileMenu={showMobileMenu}
                onMobileMenuToggle={toggleMobileMenu}
              />
            </Suspense>
          </EnhancedErrorBoundary>
        );
      case "history":
        return (
          <EnhancedErrorBoundary fallback={makeFallback("History Error", "Historical data is temporarily unavailable. Please refresh." )}>
            <Suspense fallback={<HistoryViewSkeleton />}>
              <HistoryView 
                showMobileMenu={showMobileMenu}
                onMobileMenuToggle={toggleMobileMenu}
              />
            </Suspense>
          </EnhancedErrorBoundary>
        );
      case "map":
        return (
          <EnhancedErrorBoundary fallback={makeFallback("Weather Stats Error", "We couldn't load weather statistics. Try refreshing the page." )}>
            <Suspense fallback={<MapViewSkeleton />}>
              <WeatherStats 
                showMobileMenu={showMobileMenu}
                onMobileMenuToggle={toggleMobileMenu}
              />
            </Suspense>
          </EnhancedErrorBoundary>
        );
      case "rewards":
        return (
          <EnhancedErrorBoundary fallback={makeFallback("Rewards Error", "Rewards data failed to load. Refresh the page to retry." )}>
            <Suspense fallback={<PageSkeleton />}>
              <Rewards 
                showMobileMenu={showMobileMenu}
                onMobileMenuToggle={toggleMobileMenu}
              />
            </Suspense>
          </EnhancedErrorBoundary>
        );
      case "store":
        return (
          <EnhancedErrorBoundary fallback={makeFallback("Store Error", "The store is temporarily unavailable. Please try again after refreshing." )}>
            <Suspense fallback={<PageSkeleton />}>
              <Store 
                showMobileMenu={showMobileMenu}
                onMobileMenuToggle={toggleMobileMenu}
              />
            </Suspense>
          </EnhancedErrorBoundary>
        );
      case "profile":
        return (
          <EnhancedErrorBoundary fallback={makeFallback("Profile Error", "We hit a snag loading your profile. Refresh to give it another shot." )}>
            <Suspense fallback={<PageSkeleton />}>
              <ProfileView 
                showMobileMenu={showMobileMenu}
                onMobileMenuToggle={toggleMobileMenu}
              />
            </Suspense>
          </EnhancedErrorBoundary>
        );
      case "settings":
        return (
          <EnhancedErrorBoundary fallback={makeFallback("Settings Error", "Settings failed to render. Please refresh the page." )}>
            <Suspense fallback={<PageSkeleton />}>
              <SettingsView 
                showMobileMenu={showMobileMenu}
                onMobileMenuToggle={toggleMobileMenu}
              />
            </Suspense>
          </EnhancedErrorBoundary>
        );
      case "news":
        return (
          <EnhancedErrorBoundary fallback={makeFallback("News Error", "Latest air quality news could not be loaded. Refresh to retry." )}>
            <Suspense fallback={<PageSkeleton />}>
              <NewsPage 
                showMobileMenu={showMobileMenu}
                onMobileMenuToggle={toggleMobileMenu}
              />
            </Suspense>
          </EnhancedErrorBoundary>
        );
      default:
        return (
          <EnhancedErrorBoundary fallback={makeFallback("Dashboard Error", "We couldn't render the air quality dashboard. Refresh to retry." )}>
            <Suspense fallback={<PageSkeleton />}>
              <AirQualityDashboard 
                onNavigate={handleViewChange}
                showMobileMenu={showMobileMenu}
                onMobileMenuToggle={toggleMobileMenu}
              />
            </Suspense>
          </EnhancedErrorBoundary>
        );
    }
  };

  // Handle products navigation properly
  if (currentView === "products") {
    navigate("/products");
    return null;
  }

  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu);
  };

  return (
    <div className="app-background" ref={shellRef}>
      <div className="relative min-h-screen">
        <div className="relative z-10 flex min-h-screen bg-gradient-to-br from-background/60 via-background/30 to-background/80">
          <DeveloperTools 
            isVisible={showDeveloperTools}
            onToggle={() => setShowDeveloperTools(false)}
          />

          <Sidebar currentView={currentView} onViewChange={handleViewChange} />

          <div className="flex-1 md:ml-16">
            <div className="relative">
              <MobileNavigation 
                currentView={currentView} 
                onViewChange={handleViewChange}
                isOpen={showMobileMenu}
                onClose={() => setShowMobileMenu(false)}
              />

              <main className="px-2 py-6 sm:px-4 md:px-6 lg:px-8">
                {/* Removed AnimatePresence - instant page transitions for better performance */}
                <div>
                  {renderView()}
                </div>
              </main>

              <footer className="pb-6">
                <Footer />
              </footer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
