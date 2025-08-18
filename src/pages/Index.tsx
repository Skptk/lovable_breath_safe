import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AirQualityDashboard from "@/components/AirQualityDashboard";
import HistoryView from "@/components/HistoryView";
import MapView from "@/components/MapView";
import ProfileView from "@/components/ProfileView";
import Rewards from "@/pages/Rewards";
import Store from "@/pages/Store";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { X, Home, History, Map, Trophy, ShoppingBag, User } from "lucide-react";

const Index = (): JSX.Element => {
  const [currentView, setCurrentView] = useState("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleViewChange = (view: string) => {
    setCurrentView(view);
    setIsMobileMenuOpen(false); // Close mobile menu when view changes
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Handle Escape key to close mobile menu
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isMobileMenuOpen]);

  const renderView = (): JSX.Element => {
    switch (currentView) {
      case "dashboard":
        return <AirQualityDashboard onNavigate={handleViewChange} onMobileMenuToggle={toggleMobileMenu} />;
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

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "history", label: "History", icon: History },
    { id: "map", label: "Map", icon: Map },
    { id: "rewards", label: "Rewards", icon: Trophy },
    { id: "store", label: "Store", icon: ShoppingBag },
    { id: "profile", label: "Profile", icon: User },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-secondary/30 flex flex-col">
      {/* Sidebar Navigation */}
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      
      {/* Main Content Area */}
      <div className="flex-1 md:ml-16 ml-0">
        <div className="p-6 lg:p-8 w-full">
          {renderView()}
        </div>
      </div>

      {/* Footer */}
      <Footer />

      {/* Mobile Navigation Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[9999] md:hidden"
          onClick={toggleMobileMenu}
        >
          <div 
            className="fixed left-0 top-0 h-full w-80 bg-card border-r border-border shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold">Navigation</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMobileMenu}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <nav className="p-6 space-y-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                
                return (
                  <Button
                    key={item.id}
                    variant={isActive ? "default" : "ghost"}
                    className={`w-full justify-start gap-3 h-12 ${
                      isActive 
                        ? 'bg-primary text-primary-foreground' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                    onClick={() => handleViewChange(item.id)}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Button>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
