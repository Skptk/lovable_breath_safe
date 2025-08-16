import { useState, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import PollutantModal from "./PollutantModal";
import { useAuth } from "@/hooks/useAuth";
import { useUserPoints } from "@/hooks/useUserPoints";
import { usePerformanceMonitor, useDebounce } from "@/hooks/usePerformance";
import { useAirQuality } from "@/hooks/useAirQuality";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorDisplay } from "@/components/ui/ErrorDisplay";
import { DashboardHeader } from "@/components/ui/DashboardHeader";
import { AQIDisplay } from "@/components/ui/AQIDisplay";
import { UserPointsDisplay } from "@/components/ui/UserPointsDisplay";
import { PollutantCards } from "@/components/ui/PollutantCards";

export default function AirQualityDashboard(): JSX.Element {
  const [selectedPollutant, setSelectedPollutant] = useState<{
    name: string;
    value: number;
    unit: string;
  } | null>(null);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const { totalPoints: userPoints, currencyRewards, canWithdraw, refreshPoints } = useUserPoints();
  const { data, isLoading, error, refetch, isRefetching, hasUserConsent, requestLocationPermission } = useAirQuality();
  
  // Performance monitoring
  usePerformanceMonitor("AirQualityDashboard");
  
  // Debounced refresh function
  const debouncedRefresh = useDebounce(refreshPoints, 1000);

  const handlePollutantClick = (name: string, value: number, unit: string) => {
    setSelectedPollutant({ name, value, unit });
  };

  const handleRefresh = async () => {
    if (!hasUserConsent) {
      // Request location permission first
      const granted = await requestLocationPermission();
      if (granted) {
        refetch();
      } else {
        toast({
          title: "Location Required",
          description: "Please allow location access to get air quality data for your area.",
          variant: "destructive",
        });
      }
    } else {
      refetch();
    }
  };

  const resetLocationPermission = () => {
    localStorage.removeItem('breath-safe-location-permission');
    window.location.reload(); // Reload to reset the permission state
  };

  // Handle loading state
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Handle no location consent state
  if (!hasUserConsent) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md">
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-foreground">Enable Location Access</h1>
            <p className="text-muted-foreground">
              To provide you with accurate air quality data for your area, we need access to your location.
            </p>
            <div className="space-y-2">
              <button 
                onClick={handleRefresh}
                className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Enable Location & Get Air Quality
              </button>
              <p className="text-sm text-muted-foreground">
                Your location is only used to fetch relevant air quality data and is never stored permanently.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <ErrorDisplay 
        error={error instanceof Error ? error : new Error('Unknown error occurred')}
        onRetry={() => refetch()}
        onRefresh={() => window.location.reload()}
      />
    );
  }

  // Handle no data state
  if (!data) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">No air quality data available</p>
          <button onClick={handleRefresh} className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90">
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background page-padding space-y-card-gap">
      {/* Header */}
      <DashboardHeader 
        location={data.location}
        isRefetching={isRefetching}
        onRefresh={handleRefresh}
        hasLocationPermission={hasUserConsent}
        onResetPermission={resetLocationPermission}
      />

      {/* Main AQI Display */}
      <AQIDisplay aqi={data.aqi} timestamp={data.timestamp} />

      {/* User Points Display */}
      {user && (
        <UserPointsDisplay 
          userPoints={userPoints}
          currencyRewards={currencyRewards}
          canWithdraw={canWithdraw}
        />
      )}

      {/* Pollutant Cards */}
      <PollutantCards 
        data={data}
        onPollutantClick={handlePollutantClick}
      />

      {/* Pollutant Modal */}
      {selectedPollutant && (
        <PollutantModal
          pollutant={selectedPollutant}
          onClose={() => setSelectedPollutant(null)}
        />
      )}
    </div>
  );
}