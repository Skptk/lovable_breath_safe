import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AirQualityDashboard from "@/components/AirQualityDashboard";
import HistoryView from "@/components/HistoryView";
import MapView from "@/components/MapView";
import ProfileView from "@/components/ProfileView";
import Rewards from "@/pages/Rewards";
import Store from "@/pages/Store";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";

const Index = (): JSX.Element => {
  const [currentView, setCurrentView] = useState("dashboard");
  const navigate = useNavigate();

  const handleViewChange = (view: string) => {
    setCurrentView(view);
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-secondary/30 flex flex-col">
      {/* Sidebar Navigation */}
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      
      {/* Main Content Area */}
      <div className="flex-1 md:ml-16 ml-0">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          {renderView()}
        </div>
      </div>

      {/* Footer */}
      <Footer />

      {/* Mobile Navigation */}
      <div className="md:hidden">
        {/* You can add a mobile navigation here if needed */}
      </div>
    </div>
  );
};

export default Index;
