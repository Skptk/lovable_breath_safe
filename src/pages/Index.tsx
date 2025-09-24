import { useState, useEffect, Suspense, lazy } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import MobileNavigation from "@/components/MobileNavigation";
import BackgroundManager from "@/components/BackgroundManager";
import { DeveloperTools } from "@/components/DeveloperTools";
import { cleanupAllChannels } from "@/lib/realtimeClient";
import EnhancedErrorBoundary from "@/components/EnhancedErrorBoundary";
import { logNavigation } from "@/lib/logger";

// Lazy load heavy components
const AirQualityDashboard = lazy(() => 
  import("@/components/AirQualityDashboard").then(module => ({
    default: module.AirQualityDashboard
  }))
);
const HistoryView = lazy(() => import("@/components/HistoryView"));
const WeatherStats = lazy(() => import("@/components/WeatherStats"));
const ProfileView = lazy(() => import("@/components/ProfileView"));
const SettingsView = lazy(() => import("@/components/SettingsView"));
const Rewards = lazy(() => import("@/pages/Rewards"));
const Store = lazy(() => import("@/pages/Store"));
const NewsPage = lazy(() => import("@/components/NewsPage"));

// Loading skeleton for lazy components
const PageSkeleton = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

export default function Index(): JSX.Element | null {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [currentView, setCurrentView] = useState("dashboard");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showDeveloperTools, setShowDeveloperTools] = useState(false);
  
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
    setCurrentView(view);
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
            <Suspense fallback={<PageSkeleton />}>
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
            <Suspense fallback={<PageSkeleton />}>
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
    <BackgroundManager>
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-secondary/30 flex flex-col">
        {/* Developer Tools */}
        <DeveloperTools 
          isVisible={showDeveloperTools}
          onToggle={() => setShowDeveloperTools(false)}
        />
        
        {/* Sidebar Navigation */}
        <Sidebar currentView={currentView} onViewChange={handleViewChange} />
        
        {/* Mobile Navigation */}
        <MobileNavigation 
          currentView={currentView} 
          onViewChange={handleViewChange}
          isOpen={showMobileMenu}
          onClose={() => setShowMobileMenu(false)}
        />
        
        {/* Main Content Area */}
        <div className="flex-1 md:ml-16 ml-0">
          <div className="p-4 sm:p-6 lg:p-8 w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ 
                  duration: 0.3, 
                  ease: "easeInOut"
                }}
              >
                {renderView()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </BackgroundManager>
  );
}
