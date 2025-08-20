import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import AirQualityDashboard from "@/components/AirQualityDashboard";
import HistoryView from "@/components/HistoryView";
import WeatherStats from "@/components/WeatherStats";
import ProfileView from "@/components/ProfileView";
import SettingsView from "@/components/SettingsView";
import Rewards from "@/pages/Rewards";
import Store from "@/pages/Store";
import NewsPage from "@/components/NewsPage";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import MobileNavigation from "@/components/MobileNavigation";

export default function Index(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentView, setCurrentView] = useState("dashboard");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  // Listen for custom view change events
  useEffect(() => {
    const handleViewChange = (event: CustomEvent) => {
      setCurrentView(event.detail.view);
    };

    window.addEventListener('viewChange', handleViewChange as EventListener);
    return () => window.removeEventListener('viewChange', handleViewChange as EventListener);
  }, []);

  // Update current view based on URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const view = urlParams.get('view');
    if (view && ['dashboard', 'history', 'map', 'rewards', 'store', 'profile', 'settings', 'news'].includes(view)) {
      setCurrentView(view);
    }
  }, [location.search]);

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
        return <AirQualityDashboard 
          onNavigate={handleViewChange} 
          showMobileMenu={showMobileMenu}
          onMobileMenuToggle={toggleMobileMenu}
        />;
      case "history":
        return <HistoryView 
          showMobileMenu={showMobileMenu}
          onMobileMenuToggle={toggleMobileMenu}
        />;
      case "map":
        return <WeatherStats 
          showMobileMenu={showMobileMenu}
          onMobileMenuToggle={toggleMobileMenu}
        />;
      case "rewards":
        return <Rewards 
          showMobileMenu={showMobileMenu}
          onMobileMenuToggle={toggleMobileMenu}
        />;
      case "store":
        return <Store 
          showMobileMenu={showMobileMenu}
          onMobileMenuToggle={toggleMobileMenu}
        />;
      case "profile":
        return <ProfileView 
          showMobileMenu={showMobileMenu}
          onMobileMenuToggle={toggleMobileMenu}
        />;
      case "settings":
        return <SettingsView 
          showMobileMenu={showMobileMenu}
          onMobileMenuToggle={toggleMobileMenu}
        />;
      case "news":
        return <NewsPage 
          showMobileMenu={showMobileMenu}
          onMobileMenuToggle={toggleMobileMenu}
        />;
      default:
        return <AirQualityDashboard 
          onNavigate={handleViewChange}
          showMobileMenu={showMobileMenu}
          onMobileMenuToggle={toggleMobileMenu}
        />;
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
