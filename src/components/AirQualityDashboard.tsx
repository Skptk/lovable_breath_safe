import React, { useState, useMemo, useCallback } from "react";
import { useAirQuality } from "@/hooks/useAirQuality";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPoints } from "@/hooks/useUserPoints";
import { useRefreshCountdown } from "@/hooks/useRefreshCountdown";
import { useLocationContext } from "@/contexts";
import { RefreshProgressBar } from "@/components/ui/RefreshProgressBar";
import { useToast } from "@/hooks/use-toast";
import { TrendingDown, RefreshCw, MapPin } from "lucide-react";

import Header from "@/components/Header";
import DataSourceValidator from "./DataSourceValidator";
import { Button } from "@/components/ui/button";

// Import extracted components
import {
  LoadingState,
  PermissionRequest,
  PollutantModal,
  AQICard,
  PointsGrid,
  WeatherSection,
} from "./AirQualityDashboard/index";

interface AirQualityDashboardProps {
  onNavigate?: (route: string) => void;
  showMobileMenu?: boolean;
  onMobileMenuToggle?: () => void;
  isDemoMode?: boolean;
}

/**
 * Hook: small permission timeout helper
 * returns boolean `timedOut` that becomes true after `ms` if `hasRequestedPermission` is still false
 */
function usePermissionTimeout(hasRequestedPermission: boolean, ms: number = 3000) {
  const [timedOut, setTimedOut] = React.useState(false);

  React.useEffect(() => {
    if (hasRequestedPermission) return;

    const timer = setTimeout(() => {
      setTimedOut(true);
    }, ms);

    return () => clearTimeout(timer);
  }, [hasRequestedPermission, ms]);

  return timedOut;
}

/**
 * The content wrapper component - extracted for testability
 */
type AirQualityDashboardContentProps = AirQualityDashboardProps & { user: any; locationContext: any };

function AirQualityDashboardContent({
  user,
  locationContext,
  onNavigate,
  showMobileMenu,
  onMobileMenuToggle,
  isDemoMode = false,
}: AirQualityDashboardContentProps) {
  // Hooks
  const { data, isRefreshing, isLoading, error, refreshData } = useAirQuality();
  const { userPoints, isLoading: pointsLoading } = useUserPoints();
  const { timeUntilRefresh } = useRefreshCountdown();
  const { toast } = useToast();

  const {
    hasUserConsent = false,
    hasRequestedPermission = false,
    isRequestingPermission = false,
    requestLocationPermission,
  } = locationContext || {};

  // Local UI state
  const [selectedPollutant, setSelectedPollutant] = React.useState<null | {
    name: string;
    value: number;
    unit: string;
    description: string;
    color: string;
  }>(null);

  const userName = React.useMemo(() => {
    return user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  }, [user]);

  // Use permission timeout hook (replaces forceDisplay pattern)
  const permissionTimeoutReached = usePermissionTimeout(hasRequestedPermission, 3000);

  // Memoize coordinates with proper typing and null checks
  const coordinates = React.useMemo(() => {
    if (!data?.coordinates?.lat || !data?.coordinates?.lon) return null;
    return { 
      latitude: data.coordinates.lat, 
      longitude: data.coordinates.lon 
    };
  }, [data?.coordinates?.lat, data?.coordinates?.lon]);

  // Request location permission handler
  const handleRequestLocationPermission = React.useCallback(async () => {
    if (isRequestingPermission) return;
    try {
      const success = await requestLocationPermission();
      if (success) {
        toast({
          title: "Location Access Granted",
          description: "Air quality data will now be fetched for your location.",
          variant: "default",
        });
      } else {
        toast({ 
          title: "Location Access Failed", 
          description: "Unable to get location permission. Please try again.", 
          variant: "destructive" 
        });
      }
    } catch (err: any) {
      const message = err?.message ?? "Failed to get location permission";
      let errorMessage = message;
      if (message.includes("permission denied")) {
        errorMessage = "Location permission denied. Please enable location access in your browser settings.";
      } else if (message.includes("unavailable")) {
        errorMessage = "Location services unavailable. Please check your device settings.";
      } else if (message.includes("timed out")) {
        errorMessage = "Location request timed out. Please try again.";
      }
      toast({ 
        title: "Location Access Failed", 
        description: errorMessage, 
        variant: "destructive" 
      });
    }
  }, [isRequestingPermission, requestLocationPermission, toast]);

  // Manual refresh handler - respects consent
  const handleRefresh = React.useCallback(() => {
    if (hasUserConsent) {
      refreshData();
    } else {
      console.log("Refresh skipped - user consent not granted");
    }
  }, [hasUserConsent, refreshData]);

  // Permission check UI - brief loading while waiting for permission or timeout
  if (!hasRequestedPermission && !permissionTimeoutReached) {
    return <LoadingState title={`Hello, ${userName}!`} subtitle="Checking location permissions..." />;
  }

  // Show permission request if not consented
  if (!hasUserConsent) {
    return (
      <PermissionRequest
        onRequest={handleRequestLocationPermission}
        requesting={isRequestingPermission}
        userName={userName}
        showMobileMenu={showMobileMenu}
        onMobileMenuToggle={onMobileMenuToggle}
      />
    );
  }

  // If there's data, show the dashboard
  if (data) {
    return (
      <div className="space-y-6 lg:space-y-8">
        <Header 
          title={`Hello, ${userName}!`} 
          subtitle={`Air quality in ${data.location ?? "your area"}`} 
          showMobileMenu={showMobileMenu} 
          onMobileMenuToggle={onMobileMenuToggle} 
        />

        <RefreshProgressBar 
          timeUntilRefresh={timeUntilRefresh} 
          isRefreshing={isRefreshing} 
          onManualRefresh={handleRefresh} 
        />

        {data && (
          <DataSourceValidator 
            dataSource={data.dataSource} 
            aqi={data.aqi} 
            location={data.location} 
            timestamp={data.timestamp} 
            userLocation={data.location} 
          />
        )}

        {isDemoMode && (
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Demo Mode Active</h3>
                <p className="text-blue-100 text-sm">Showing sample data for demonstration purposes</p>
              </div>
              <span className="bg-white/20 text-white text-xs font-medium px-2.5 py-0.5 rounded">
                DEMO
              </span>
            </div>
          </div>
        )}

        <AQICard
          data={data}
          timeUntilRefresh={timeUntilRefresh}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          onNavigate={onNavigate}
          showMobileMenu={showMobileMenu}
          onMobileMenuToggle={onMobileMenuToggle}
          isDemoMode={isDemoMode}
          setSelectedPollutant={setSelectedPollutant}
        />

        {!pointsLoading && userPoints && (
          <PointsGrid userPoints={userPoints} onNavigate={onNavigate} />
        )}

        <WeatherSection coordinates={coordinates} />

        <PollutantModal 
          pollutant={selectedPollutant} 
          onClose={() => setSelectedPollutant(null)} 
        />
      </div>
    );
  }

  // Loading while fetching data
  if (isLoading) {
    return <LoadingState title={`Hello, ${userName}!`} subtitle="Loading air quality data..." />;
  }

  // Error state with retry wired to refreshData
  if (error) {
    return (
      <div className="space-y-6 lg:space-y-8">
        <Header 
          title={`Hello, ${userName}!`} 
          subtitle="Error loading air quality data" 
          showMobileMenu={showMobileMenu} 
          onMobileMenuToggle={onMobileMenuToggle} 
        />
        <div className="text-center py-12">
          <div className="max-w-md mx-auto space-y-6">
            <div className="w-24 h-24 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <TrendingDown className="w-12 h-12 text-destructive" />
            </div>

            <div className="space-y-3">
              <h3 className="text-xl font-semibold">Failed to Load Data</h3>
              <p className="text-muted-foreground">
                {error.message || "Unable to fetch air quality data. Please try again."}
              </p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleRefresh} 
                disabled={isRefreshing} 
                className="w-full" 
                size="lg"
              >
                {isRefreshing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </>
                )}
              </Button>

              <Button 
                variant="outline" 
                onClick={handleRequestLocationPermission} 
                className="w-full"
              >
                <MapPin className="w-4 h-4 mr-2" />
                Re-check Location
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="space-y-6 lg:space-y-8">
      <Header 
        title={`Hello, ${userName}!`} 
        subtitle="Something went wrong" 
        showMobileMenu={showMobileMenu} 
        onMobileMenuToggle={onMobileMenuToggle} 
      />
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Unable to display dashboard. Please refresh the page.
        </p>
      </div>
    </div>
  );
}

/**
 * Main wrapper that ties into location + auth contexts
 */
export function AirQualityDashboard({
  onNavigate,
  showMobileMenu,
  onMobileMenuToggle,
  isDemoMode = false,
}: AirQualityDashboardProps) {
  const { user } = useAuth();
  const locationContext = useLocationContext();

  return (
    <AirQualityDashboardContent
      user={user}
      locationContext={locationContext}
      onNavigate={onNavigate}
      showMobileMenu={showMobileMenu}
      onMobileMenuToggle={onMobileMenuToggle}
      isDemoMode={isDemoMode}
    />
  );
}

export default AirQualityDashboard;
