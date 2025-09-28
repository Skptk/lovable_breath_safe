import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useAirQuality } from "@/hooks/useAirQuality";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPoints } from "@/hooks/useUserPoints";
import { useRefreshCountdown } from "@/hooks/useRefreshCountdown";
import { useLocationContext } from "@/contexts";
import { RefreshProgressBar } from "@/components/ui/RefreshProgressBar";
import { useToast } from "@/hooks/use-toast";
import { TrendingDown, RefreshCw, MapPin, Award, Zap, TrendingUp } from "lucide-react";

import Header from "@/components/Header";
import DataSourceValidator from "./DataSourceValidator";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatCard } from "@/components/ui/StatCard";
import Footer from "@/components/Footer";

// Import components directly to avoid circular dependencies
import { LoadingState } from "./AirQualityDashboard/LoadingState";
import { DataLoadingOverlay } from "./AirQualityDashboard/DataLoadingOverlay";
import { PermissionRequest } from "./AirQualityDashboard/PermissionRequest";
import { PollutantModal } from "./AirQualityDashboard/PollutantModal";
import { AQICard } from "./AirQualityDashboard/AQICard";
import { WeatherSection } from "./AirQualityDashboard/WeatherSection";
import { useReflowOptimization } from "@/hooks/useReflowOptimization";

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
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
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
  const aqiCardRef = React.useRef<HTMLDivElement | null>(null);

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

  const createEmptyRect = useCallback((): DOMRect => {
    if (typeof DOMRect !== "undefined") {
      return new DOMRect();
    }
    return {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      toJSON: () => ({})
    } as DOMRect;
  }, []);

  const { scheduleMeasurement: scheduleLayoutMeasure } = useReflowOptimization<DOMRect>({
    debugLabel: "AQICardLayout",
    measure: () => aqiCardRef.current?.getBoundingClientRect() ?? createEmptyRect(),
  });

  React.useEffect(() => {
    if (!aqiCardRef.current) return;
    scheduleLayoutMeasure();
  }, [data?.aqi, scheduleLayoutMeasure]);

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
  const renderDashboardContent = () => {
    const showSkeleton = isLoading && !data;
    const showError = !isLoading && !data && error;

    if (showSkeleton) {
      return (
        <GlassCard className="p-6">
          <DataLoadingOverlay
            userName={userName}
            showMobileMenu={showMobileMenu}
            onMobileMenuToggle={onMobileMenuToggle}
          />
        </GlassCard>
      );
    }

    if (showError) {
      return (
        <GlassCard variant="elevated" className="p-6">
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <TrendingDown className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Unable to load data</h3>
              <p className="text-muted-foreground">
                {error?.message || "We couldn't fetch the latest air quality details. Please try again."}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button onClick={handleRefresh} disabled={isRefreshing}>
                {isRefreshing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try again
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleRequestLocationPermission}>
                <MapPin className="mr-2 h-4 w-4" />
                Re-check location
              </Button>
            </div>
          </div>
        </GlassCard>
      );
    }

    return (
      <div className="space-y-6 lg:space-y-8">
        <GlassCard className="p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-[0.2em]">Welcome back</p>
              <h1 className="text-3xl font-semibold text-foreground">Hello, {userName}!</h1>
              <p className="text-muted-foreground">
                {data?.location ? `Air quality in ${data.location}` : "Your personalized air quality dashboard"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                {isRefreshing ? "Refreshing" : "Refresh Data"}
              </Button>
              <Button variant="default" onClick={() => onNavigate?.("history")}>
                View History
              </Button>
            </div>
          </div>
        </GlassCard>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <GlassCard className="lg:col-span-2 p-0">
            <div className="p-6 space-y-6">
              <div ref={aqiCardRef}>
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
              </div>

              <GlassCard variant="subtle" className="p-4">
                <RefreshProgressBar
                  timeUntilRefresh={timeUntilRefresh}
                  isRefreshing={isRefreshing}
                  onManualRefresh={handleRefresh}
                />
              </GlassCard>

              {data && (
                <GlassCard variant="subtle" className="p-4">
                  <DataSourceValidator
                    dataSource={data.dataSource}
                    aqi={data.aqi}
                    location={data.location}
                    timestamp={data.timestamp}
                    userLocation={data.location}
                  />
                </GlassCard>
              )}
            </div>
          </GlassCard>

          <div className="space-y-4">
            <GlassCard className="p-4">
              <StatCard
                title="Total Points"
                value={userPoints?.totalPoints ? userPoints.totalPoints.toLocaleString() : "—"}
                subtitle="Earned from air quality monitoring"
                icon={<Award className="h-5 w-5" />}
              />
            </GlassCard>
            <GlassCard className="p-4">
              <StatCard
                title="Today's Readings"
                value={userPoints?.todayReadings ?? "—"}
                subtitle="Air quality readings today"
                icon={<Zap className="h-5 w-5" />}
              />
            </GlassCard>
            <GlassCard className="p-4">
              <StatCard
                title="Weekly Activity"
                value={userPoints?.weeklyReadings ?? "—"}
                subtitle="Readings this week"
                icon={<TrendingUp className="h-5 w-5" />}
              />
            </GlassCard>
          </div>
        </div>

        <GlassCard className="p-6">
          <WeatherSection coordinates={coordinates} />
        </GlassCard>

        <GlassCard className="p-6 mt-10">
          <Footer />
        </GlassCard>

        <PollutantModal
          pollutant={selectedPollutant}
          onClose={() => setSelectedPollutant(null)}
        />
      </div>
    );
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      {!hasRequestedPermission && !permissionTimeoutReached ? (
        <GlassCard className="p-6">
          <LoadingState
            title={`Hello, ${userName}!`}
            subtitle="Checking location permissions..."
          />
        </GlassCard>
      ) : !hasUserConsent ? (
        <GlassCard className="p-6">
          <PermissionRequest
            onRequest={handleRequestLocationPermission}
            requesting={isRequestingPermission}
            userName={userName}
            showMobileMenu={showMobileMenu}
            onMobileMenuToggle={onMobileMenuToggle}
          />
        </GlassCard>
      ) : (
        renderDashboardContent()
      )}
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
