import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import AirQualityDashboard from "@/components/AirQualityDashboard";
import HistoryView from "@/components/HistoryView";
import MapView from "@/components/MapView";
import ProfileView from "@/components/ProfileView";
import Rewards from "@/pages/Rewards";
import Store from "@/pages/Store";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobileNavigation from "@/components/MobileNavigation";

const Index = (): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  // Get current view from URL params, default to dashboard
  const currentView = searchParams.get('view') || 'dashboard';

  const handleViewChange = (view: string) => {
    // Update URL params without triggering navigation
    setSearchParams({ view }, { replace: true });
  };

  // Ensure URL is set when component mounts and handle URL changes
  useEffect(() => {
    // Only set default view if no view is specified
    if (!searchParams.get('view')) {
      setSearchParams({ view: 'dashboard' }, { replace: true });
    }
  }, []); // Empty dependency array to run only once on mount

  // Listen for view changes from footer navigation
  useEffect(() => {
    const handleViewChangeEvent = (event: CustomEvent) => {
      const { view } = event.detail;
      handleViewChange(view);
    };

    window.addEventListener('viewChange', handleViewChangeEvent as EventListener);
    
    return () => {
      window.removeEventListener('viewChange', handleViewChangeEvent as EventListener);
    };
  }, []);

  // Debug logging
  useEffect(() => {
    console.log('Index component - Current view:', currentView, 'URL:', location.pathname + location.search);
  }, [currentView, location]);

  const renderView = (): JSX.Element => {
    switch (currentView) {
      case "dashboard":
        return <AirQualityDashboard onNavigate={handleViewChange} />;
      case "history":
        return <HistoryView />;
      case "map":
        return <MapView />;
      case "rewards":
        return <Rewards />;
      case "store":
        return <Store />;
      case "profile":
        return <ProfileView />;
      default:
        return <AirQualityDashboard />;
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

  const getHeaderTitle = (view: string): string => {
    switch (view) {
      case "dashboard": return "Air Quality Dashboard";
      case "history": return "Air Quality History";
      case "map": return "Air Quality Map";
      case "rewards": return "Rewards & Achievements";
      case "store": return "Store & Products";
      case "profile": return "Profile & Settings";
      default: return "Breath Safe";
    }
  };

  const getHeaderSubtitle = (view: string): string => {
    switch (view) {
      case "dashboard": return "Monitor your local air quality in real-time";
      case "history": return "Track your environmental exposure over time";
      case "map": return "Explore air quality data across your region";
      case "rewards": return "Earn points for healthy choices";
      case "store": return "Browse air quality products and services";
      case "profile": return "Manage your account and preferences";
      default: return "Your health, our priority";
    }
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
        <div className="p-6 lg:p-8 w-full">
          {/* Header with mobile menu toggle */}
          <Header
            title={getHeaderTitle(currentView)}
            subtitle={getHeaderSubtitle(currentView)}
            onNavigate={handleViewChange}
            showMobileMenu={showMobileMenu}
            onMobileMenuToggle={toggleMobileMenu}
          />
          
          {renderView()}
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Index;
