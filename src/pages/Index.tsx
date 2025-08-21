import { useState, useEffect, Suspense, lazy } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import MobileNavigation from "@/components/MobileNavigation";
import { cleanupAllChannels } from "@/lib/realtimeClient";

// Lazy load heavy components
const AirQualityDashboard = lazy(() => import("@/components/AirQualityDashboard"));
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

export default function Index(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentView, setCurrentView] = useState("dashboard");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  // Listen for custom view change events
  useEffect(() => {
    const handleViewChange = (event: CustomEvent) => {
      const newView = event.detail.view;
      console.log('Index component - View change event received:', newView);
      
      // Update view immediately without delay
      setCurrentView(newView);
      console.log('Index component - Current view updated to:', newView);
    };

    window.addEventListener('viewChange', handleViewChange as EventListener);
    
    return () => {
      window.removeEventListener('viewChange', handleViewChange as EventListener);
    };
  }, []);

  // Initialize current view from URL parameters on mount only
  useEffect(() => {
    const view = searchParams.get("view") || "dashboard";
    if (view !== currentView) {
      console.log('Index component - Initializing view from URL:', view);
      setCurrentView(view);
    }
  }, []); // Empty dependency array - only run on mount

  // Cleanup realtime channels on unmount
  useEffect(() => {
    return () => {
      console.log('Index component unmounting - cleaning up realtime channels');
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
    console.log('Index component - Current view:', currentView, 'URL:', location.pathname + location.search);
  }, [currentView, location]);

  const renderView = (): JSX.Element => {
    switch (currentView) {
      case "dashboard":
        return (
          <Suspense fallback={<PageSkeleton />}>
            <AirQualityDashboard 
              onNavigate={handleViewChange} 
              showMobileMenu={showMobileMenu}
              onMobileMenuToggle={toggleMobileMenu}
            />
          </Suspense>
        );
      case "history":
        return (
          <Suspense fallback={<PageSkeleton />}>
            <HistoryView 
              showMobileMenu={showMobileMenu}
              onMobileMenuToggle={toggleMobileMenu}
            />
          </Suspense>
        );
      case "map":
        return (
          <Suspense fallback={<PageSkeleton />}>
            <WeatherStats 
              showMobileMenu={showMobileMenu}
              onMobileMenuToggle={toggleMobileMenu}
            />
          </Suspense>
        );
      case "rewards":
        return (
          <Suspense fallback={<PageSkeleton />}>
            <Rewards 
              showMobileMenu={showMobileMenu}
              onMobileMenuToggle={toggleMobileMenu}
            />
          </Suspense>
        );
      case "store":
        return (
          <Suspense fallback={<PageSkeleton />}>
            <Store 
              showMobileMenu={showMobileMenu}
              onMobileMenuToggle={toggleMobileMenu}
            />
          </Suspense>
        );
      case "profile":
        return (
          <Suspense fallback={<PageSkeleton />}>
            <ProfileView 
              showMobileMenu={showMobileMenu}
              onMobileMenuToggle={toggleMobileMenu}
            />
          </Suspense>
        );
      case "settings":
        return (
          <Suspense fallback={<PageSkeleton />}>
            <SettingsView 
              showMobileMenu={showMobileMenu}
              onMobileMenuToggle={toggleMobileMenu}
            />
          </Suspense>
        );
      case "news":
        return (
          <Suspense fallback={<PageSkeleton />}>
            <NewsPage 
              showMobileMenu={showMobileMenu}
              onMobileMenuToggle={toggleMobileMenu}
            />
          </Suspense>
        );
      default:
        return (
          <Suspense fallback={<PageSkeleton />}>
            <AirQualityDashboard 
              onNavigate={handleViewChange}
              showMobileMenu={showMobileMenu}
              onMobileMenuToggle={toggleMobileMenu}
            />
          </Suspense>
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
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-secondary/30 flex flex-col">
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
  );
}
