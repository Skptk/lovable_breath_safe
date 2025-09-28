import React, { useState, useEffect } from "react";
import { useAirQuality } from "@/hooks/useAirQuality";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPoints } from "@/hooks/useUserPoints";
import { useRefreshCountdown } from "@/hooks/useRefreshCountdown";
import { useLocationContext } from "@/contexts";
import { RefreshProgressBar } from "@/components/ui/RefreshProgressBar";
import { useToast } from "@/hooks/use-toast";
import { TrendingDown, RefreshCw, MapPin, History } from "lucide-react";
import { getAQIColor, getAQILabel } from "@/config/maps";

import DataSourceValidator from "./DataSourceValidator";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";

import { LoadingState } from "./AirQualityDashboard/LoadingState";
import { PermissionRequest } from "./AirQualityDashboard/PermissionRequest";
import { PollutantModal } from "./AirQualityDashboard/PollutantModal";
import { WeatherSection } from "./AirQualityDashboard/WeatherSection";

interface AirQualityDashboardProps {
  onNavigate?: (route: string) => void;
  showMobileMenu?: boolean;
  onMobileMenuToggle?: () => void;
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

  const renderUnifiedShell = (content: React.ReactNode) => (
    <div className="relative z-10 px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="bg-black/40 backdrop-blur-xl ring-1 ring-white/10 rounded-3xl shadow-2xl p-6 sm:p-10">
          {content}
        </div>
      </div>
    </div>
  );

  // Permission check UI - brief loading while waiting for permission or timeout
  const renderDashboardContent = () => {
    const showLoadingState = isLoading && !data;
    const showErrorState = !isLoading && !data && error;

    const lastUpdated = data?.timestamp ? new Date(data.timestamp).toLocaleString() : "—";
    const aqiValue = data?.aqi ?? "—";
    const aqiLabel = getAQILabel(data?.aqi ?? 0);
    const aqiColor = getAQIColor(data?.aqi ?? 0);

    if (showLoadingState) {
      return renderUnifiedShell(
        <div className="py-16">
          <LoadingState
            title={`Hello, ${userName}!`}
            subtitle="Fetching the latest air quality insights..."
          />
        </div>
      );
    }

    if (showErrorState) {
      return renderUnifiedShell(
        <div className="py-16 text-center space-y-8">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-500/15">
            <TrendingDown className="h-10 w-10 text-red-400" />
          </div>
          <div className="space-y-3">
            <h3 className="text-2xl font-semibold text-white">Something went wrong</h3>
            <p className="text-slate-300 max-w-xl mx-auto">
              {error?.message || "We couldn't retrieve the latest air quality data. Please try again shortly."}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button onClick={handleRefresh} disabled={isRefreshing} className="min-w-[180px]">
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
            <Button variant="outline" onClick={handleRequestLocationPermission} className="min-w-[180px]">
              <MapPin className="mr-2 h-4 w-4" />
              Re-check location
            </Button>
          </div>
        </div>
      );
    }

    return renderUnifiedShell(
      <>
                <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-10">
                  <div className="space-y-3">
                    <p className="text-sm font-semibold uppercase tracking-[0.35em] text-teal-200/80">Welcome back</p>
                    <h1 className="text-3xl sm:text-4xl font-semibold text-white">
                      Hello, {userName}!
                    </h1>
                    <p className="text-lg text-slate-300">
                      {data?.location ? `Air quality in ${data.location}` : "Your personalized air quality command center"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      className="bg-white/5 hover:bg-white/10 text-white border-white/20"
                    >
                      <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                      {isRefreshing ? "Refreshing" : "Refresh Data"}
                    </Button>
                    <Button
                      variant="default"
                      onClick={() => onNavigate?.("history")}
                      className="bg-teal-400 hover:bg-teal-300 text-slate-900"
                    >
                      <History className="mr-2 h-4 w-4" />
                      View History
                    </Button>
                  </div>
                </header>

                <section className="grid gap-8 lg:grid-cols-3">
                  <div className="lg:col-span-2 space-y-8">
                    <div className="rounded-2xl border border-white/10 bg-white/5/5 p-8 text-center">
                      <h2 className="text-xl font-semibold text-white mb-2">Current Air Quality</h2>
                      <p className="text-slate-400">Last updated: {lastUpdated}</p>
                      <div className="mt-10 space-y-6">
                        <div className="text-7xl sm:text-8xl font-bold" style={{ color: aqiColor }}>
                          {aqiValue}
                        </div>
                        <div className="inline-flex items-center px-5 py-2 rounded-full" style={{
                          backgroundColor: `${aqiColor}20`,
                        }}>
                          <span className="text-lg font-medium" style={{ color: aqiColor }}>
                            {aqiLabel}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
                        {[
                          { label: "PM2.5", value: data?.pm25 ?? 0, unit: "μg/m³" },
                          { label: "PM10", value: data?.pm10 ?? 0, unit: "μg/m³" },
                          { label: "NO₂", value: data?.no2 ?? 0, unit: "μg/m³" },
                          { label: "SO₂", value: data?.so2 ?? 0, unit: "μg/m³" },
                        ].map((pollutant) => (
                          <button
                            key={pollutant.label}
                            type="button"
                            className="rounded-xl border border-white/10 bg-white/5 px-4 py-5 text-center transition-transform hover:-translate-y-1 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/60"
                            onClick={() => {
                              setSelectedPollutant({
                                name: pollutant.label,
                                value: pollutant.value,
                                unit: pollutant.unit,
                                description: `Detailed information about ${pollutant.label}`,
                                color: aqiColor,
                              });
                            }}
                          >
                            <div className="text-2xl font-semibold text-white">
                              {pollutant.value.toFixed(1)}
                            </div>
                            <div className="text-sm text-slate-300 mt-1">{pollutant.label}</div>
                            <div className="text-xs text-slate-400">{pollutant.unit}</div>
                          </button>
                        ))}
                      </div>

                      <div className="mt-10 flex flex-wrap justify-center gap-4">
                        <Button
                          variant="outline"
                          onClick={handleRefresh}
                          disabled={isRefreshing}
                          className="bg-slate-900/60 hover:bg-slate-900/40 text-white border-white/20"
                        >
                          <RefreshCw className={`mr-2 h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`} />
                          {isRefreshing ? "Refreshing..." : "Refresh Now"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => onNavigate?.("history")}
                          className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                        >
                          <History className="mr-2 h-5 w-5" />
                          View History
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                      <RefreshProgressBar
                        timeUntilRefresh={timeUntilRefresh}
                        isRefreshing={isRefreshing}
                        onManualRefresh={handleRefresh}
                      />
                    </div>

                    {data && (
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                        <DataSourceValidator
                          dataSource={data.dataSource}
                          aqi={data.aqi}
                          location={data.location}
                          timestamp={data.timestamp}
                          userLocation={data.location}
                        />
                      </div>
                    )}
                  </div>

                  <aside className="space-y-6">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
                      <div className="text-3xl font-semibold text-white mb-2">
                        {pointsLoading ? "—" : userPoints?.totalPoints?.toLocaleString() ?? "—"}
                      </div>
                      <div className="text-slate-300 text-sm">Total Points</div>
                      <div className="text-slate-500 text-xs mt-2">Earned from air quality monitoring</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
                      <div className="text-3xl font-semibold text-white mb-2">
                        {pointsLoading ? "—" : userPoints?.todayReadings ?? "—"}
                      </div>
                      <div className="text-slate-300 text-sm">Today's Readings</div>
                      <div className="text-slate-500 text-xs mt-2">Air quality readings today</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
                      <div className="text-3xl font-semibold text-white mb-2">
                        {pointsLoading ? "—" : userPoints?.weeklyReadings ?? "—"}
                      </div>
                      <div className="text-slate-300 text-sm">Weekly Activity</div>
                      <div className="text-slate-500 text-xs mt-2">Readings this week</div>
                    </div>
                  </aside>
                </section>

                <section className="mt-12 pt-12 border-t border-white/10">
                  <WeatherSection coordinates={coordinates} />
                </section>

                <footer className="mt-12 pt-12 border-t border-white/10 text-slate-300">
                  <Footer />
                </footer>
      </>
    );
  };

  return (
    <>
      {!hasRequestedPermission && !permissionTimeoutReached
        ? renderUnifiedShell(
            <div className="py-16">
              <LoadingState
                title={`Hello, ${userName}!`}
                subtitle="Checking location permissions..."
              />
            </div>
          )
        : !hasUserConsent
          ? renderUnifiedShell(
              <div className="py-10">
                <PermissionRequest
                  onRequest={handleRequestLocationPermission}
                  requesting={isRequestingPermission}
                  userName={userName}
                  showMobileMenu={showMobileMenu}
                  onMobileMenuToggle={onMobileMenuToggle}
                />
              </div>
            )
          : renderDashboardContent()}
      <PollutantModal pollutant={selectedPollutant} onClose={() => setSelectedPollutant(null)} />
    </>
  );
}

/**
 * Main wrapper that ties into location + auth contexts
 */
export function AirQualityDashboard({
  onNavigate,
  showMobileMenu,
  onMobileMenuToggle,
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
    />
  );
}

export default AirQualityDashboard;
