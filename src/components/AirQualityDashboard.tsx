import React, { useState, useMemo, useCallback, ReactNode } from "react";
import { useAirQuality, AirQualityData } from "@/hooks/useAirQuality";
import { useAuth, User } from "@/contexts/AuthContext";
import { useUserPoints, UserPoints } from "@/hooks/useUserPoints";
import { useRefreshCountdown } from "@/hooks/useRefreshCountdown";
import { useLocationContext, LocationData } from "@/contexts";
import { RefreshProgressBar } from "@/components/ui/RefreshProgressBar";
import { useToast } from "@/hooks/use-toast";
import { TrendingDown, RefreshCw, MapPin, Loader2 } from "lucide-react";

import Header from "@/components/Header";
import DataSourceValidator from "./DataSourceValidator";
import { Button } from "@/components/ui/button";

// Import extracted components
import { LoadingState, LoadingStateProps } from "./AirQualityDashboard/LoadingState";
import { PermissionRequest, PermissionRequestProps } from "./AirQualityDashboard/PermissionRequest";
import { PollutantModal, PollutantModalProps } from "./AirQualityDashboard/PollutantModal";
import { AQICard, AQICardProps } from "./AirQualityDashboard/AQICard";
import { PointsGrid, PointsGridProps } from "./AirQualityDashboard/PointsGrid";
import { WeatherSection, WeatherSectionProps } from "./AirQualityDashboard/WeatherSection";

interface AirQualityDashboardProps {
  /** Callback function triggered when navigation occurs */
  onNavigate?: (route: string) => void;
  /** Controls the visibility of the mobile menu */
  showMobileMenu?: boolean;
  /** Callback for toggling the mobile menu */
  onMobileMenuToggle?: () => void;
  /** Whether the dashboard is in demo mode */
  isDemoMode?: boolean;
}

interface AirQualityDashboardState {
  selectedPollutant: any | null;
  isRefreshing: boolean;
  lastUpdate: Date | null;
}

/** Default props for the AirQualityDashboard component */
const defaultProps: Partial<AirQualityDashboardProps> = {
  isDemoMode: false,
  showMobileMenu: false,
  onMobileMenuToggle: () => {},
  onNavigate: () => {}
};

/**
 * Hook: small permission timeout helper
 * @param hasRequestedPermission - Whether permission has been requested
 * @param ms - Timeout in milliseconds (default: 3000)
 * @returns Boolean `timedOut` that becomes true after `ms` if `hasRequestedPermission` is still false
 */
const usePermissionTimeout = (hasRequestedPermission: boolean, ms: number = 3000): boolean => {
  const [timedOut, setTimedOut] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (hasRequestedPermission) return;

    const timer = setTimeout(() => {
      setTimedOut(true);
    }, ms);

    return () => clearTimeout(timer);
  }, [hasRequestedPermission, ms]);

  return timedOut;
};

/** Type guard to check if location data is valid */
const isValidLocation = (location: LocationData | null): location is LocationData => {
  return !!location && 
         typeof location.latitude === 'number' && 
         typeof location.longitude === 'number';
};

/**
 * The content wrapper component - extracted for testability
 */
interface AirQualityDashboardContentProps extends AirQualityDashboardProps {
  user: User | null;
  locationContext: {
    coordinates: LocationData | null;
    hasRequestedPermission: boolean;
    error: string | null;
    requestPermission: () => Promise<boolean>;
  };
}

const AirQualityDashboardContent: React.FC<AirQualityDashboardContentProps> = ({
  user,
  locationContext,
  onNavigate = () => {},
  showMobileMenu = false,
  onMobileMenuToggle = () => {},
  isDemoMode = false
}) => {
  // State
  const [selectedPollutant, setSelectedPollutant] = React.useState<PollutantData | null>(null);
  const [isRefreshing, setIsRefreshing] = React.useState<boolean>(false);
  const [lastUpdate, setLastUpdate] = React.useState<Date | null>(null);
  
  // Hooks
  const { data, isLoading, error, refreshData } = useAirQuality();
  const { userPoints, isLoading: pointsLoading } = useUserPoints();
  const { timeUntilRefresh } = useRefreshCountdown();
  const { toast } = useToast();
  
  // Derived state
  const hasLocation = isValidLocation(locationContext.coordinates);
  const permissionTimedOut = usePermissionTimeout(locationContext.hasRequestedPermission);
  
  // Memoized coordinates to prevent unnecessary re-renders
  const memoizedCoordinates = useMemo(() => {
    if (!hasLocation) return null;
    return {
      latitude: locationContext.coordinates!.latitude,
      longitude: locationContext.coordinates!.longitude
    };
  }, [hasLocation, locationContext.coordinates]);

  // Handle refresh action
  const handleRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      await refreshData();
      setLastUpdate(new Date());
      toast({
        title: "Success",
        description: "Air quality data has been refreshed.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast({
        title: "Error",
        description: "Failed to refresh air quality data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshData, toast]);

  // Handle permission request
  const handleRequestPermission = useCallback(async () => {
    try {
      const granted = await locationContext.requestPermission();
      if (granted) {
        toast({
          title: "Location Access Granted",
          description: "You can now view air quality data for your location.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error requesting location permission:", error);
      toast({
        title: "Location Access Required",
        description: "Please enable location access to view air quality data.",
        variant: "destructive",
      });
    }
  }, [locationContext, toast]);

  // Get user's display name
  const userName = React.useMemo(() => {
    return user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  }, [user]);

  // Use permission timeout hook (replaces forceDisplay pattern)
  const permissionTimeoutReached = usePermissionTimeout(hasRequestedPermission, 3000);

  // Memoize coordinates with proper typing and null checks
  const coordinates = React.useMemo<{ latitude: number; longitude: number } | null>(() => {
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
};

/**
 * Main wrapper that ties into location + auth contexts
 */
export const AirQualityDashboard: React.FC<AirQualityDashboardProps> = ({
  onNavigate = () => {},
  showMobileMenu = false,
  onMobileMenuToggle = () => {},
  isDemoMode = false,
}) => {
  const { user } = useAuth();
  const locationContext = useLocationContext();

  return (
    <AirQualityDashboardContent
      user={user}
      locationContext={{
        coordinates: locationContext.coordinates,
        hasRequestedPermission: locationContext.hasRequestedPermission,
        error: locationContext.error,
        requestPermission: locationContext.requestLocationPermission,
      }}
      onNavigate={onNavigate}
      showMobileMenu={showMobileMenu}
      onMobileMenuToggle={onMobileMenuToggle}
      isDemoMode={isDemoMode}
    />
  );
};

// Set default props
AirQualityDashboard.defaultProps = defaultProps;

export default React.memo(AirQualityDashboard);
