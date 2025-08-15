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
  const { data, isLoading, error, refetch, isRefetching } = useAirQuality();
  
  // Performance monitoring
  usePerformanceMonitor("AirQualityDashboard");
  
  // Debounced refresh function
  const debouncedRefresh = useDebounce(refreshPoints, 1000);

  const handleRefresh = useCallback(() => {
    refetch();
    if (user) {
      debouncedRefresh();
    }
    toast({
      title: "Refreshing data",
      description: "Fetching latest air quality information...",
    });
  }, [refetch, user, debouncedRefresh, toast]);

  const handlePollutantClick = useCallback((name: string, value: number, unit: string) => {
    setSelectedPollutant({ name, value, unit });
  }, []);

  // Handle loading state
  if (isLoading) {
    return <LoadingSkeleton />;
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
          <button onClick={() => refetch()} className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90">
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 space-y-6 pb-24">
      {/* Header */}
      <DashboardHeader 
        location={data.location}
        isRefetching={isRefetching}
        onRefresh={handleRefresh}
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