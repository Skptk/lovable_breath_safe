import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AirQualityDashboard from "@/components/AirQualityDashboard";
import HistoryView from "@/components/HistoryView";
import MapView from "@/components/MapView";
import ProfileView from "@/components/ProfileView";
import Rewards from "@/pages/Rewards";
import Store from "@/pages/Store";
import Navigation from "@/components/Navigation";

const Index = (): JSX.Element => {
  const [currentView, setCurrentView] = useState("dashboard");
  const navigate = useNavigate();

  const renderView = (): JSX.Element => {
    switch (currentView) {
      case "dashboard":
        return <AirQualityDashboard />;
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
    <div className="relative min-h-screen bg-background">
      <div className="pb-navbar">
        {renderView()}
      </div>
      <Navigation currentView={currentView} onViewChange={setCurrentView} />
    </div>
  );
};

export default Index;
