import { useState } from "react";
import AirQualityDashboard from "@/components/AirQualityDashboard";
import HistoryView from "@/components/HistoryView";
import MapView from "@/components/MapView";
import ProfileView from "@/components/ProfileView";
import Navigation from "@/components/Navigation";

const Index = () => {
  const [currentView, setCurrentView] = useState("dashboard");

  const renderView = () => {
    switch (currentView) {
      case "dashboard":
        return <AirQualityDashboard />;
      case "history":
        return <HistoryView />;
      case "map":
        return <MapView />;
      case "profile":
        return <ProfileView />;
      default:
        return <AirQualityDashboard />;
    }
  };

  return (
    <div className="relative">
      {currentView === "products" ? (
        window.location.href = "/products"
      ) : (
        renderView()
      )}
      <Navigation currentView={currentView} onViewChange={setCurrentView} />
    </div>
  );
};

export default Index;
