import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAirQuality } from "@/hooks/useAirQuality";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPoints } from "@/hooks/useUserPoints";
import { useLocationContext } from "@/contexts";
import { useToast } from "@/hooks/use-toast";
import { TrendingDown, RefreshCw, MapPin, History, Menu, X } from "lucide-react";
import { getAQIColor, getAQILabel } from "@/config/maps";

import DataSourceValidator from "./DataSourceValidator";
import { Button } from "@/components/ui/button";

import { LoadingState } from "./AirQualityDashboard/LoadingState";
import { PermissionRequest } from "./AirQualityDashboard/PermissionRequest";
import { PollutantModal } from "./AirQualityDashboard/PollutantModal";
import { WeatherSection } from "./AirQualityDashboard/WeatherSection";

type PollutantCard = {
  label: string;
  value: number;
  unit: string;
};

interface PollutantCardGridProps {
  cards: PollutantCard[];
  onSelect: (card: PollutantCard) => void;
  disabled: boolean;
}

const PollutantCardGrid = React.memo(function PollutantCardGrid({ cards, onSelect, disabled }: PollutantCardGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 md:gap-4 lg:gap-5 xl:gap-6 mt-4 sm:mt-6 md:mt-10 lg:mt-12 w-full max-w-full overflow-hidden">
      {cards.map((pollutant) => (
        <button
          key={pollutant.label}
          type="button"
          className="rounded-xl border border-white/10 bg-white/5 px-2 py-3 sm:px-3 sm:py-4 md:px-4 md:py-5 lg:px-6 lg:py-6 xl:px-8 xl:py-8 text-center transition-opacity hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/60 disabled:opacity-60 disabled:pointer-events-none w-full"
          onClick={() => onSelect(pollutant)}
          disabled={disabled}
        >
          <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-semibold text-white">
            {pollutant.value.toFixed(1)}
          </div>
          <div className="text-[10px] sm:text-xs md:text-sm lg:text-base text-slate-300 mt-0.5 sm:mt-1 lg:mt-1.5">{pollutant.label}</div>
          <div className="text-[10px] sm:text-xs lg:text-sm text-slate-400">{pollutant.unit}</div>
        </button>
      ))}
    </div>
  );
});

PollutantCardGrid.displayName = "PollutantCardGrid";

interface PointsSummaryCard {
  label: string;
  value: string;
  description: string;
}

interface PointsSummaryProps {
  cards: PointsSummaryCard[];
}

const PointsSummary = React.memo(function PointsSummary({ cards }: PointsSummaryProps) {
  return (
    <aside className="space-y-3 sm:space-y-4 md:space-y-6 lg:space-y-8 w-full max-w-full overflow-hidden">
      {cards.map((card) => (
        <div key={card.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 md:p-6 lg:p-8 xl:p-10 text-center w-full max-w-full overflow-hidden">
          <div className="text-2xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-semibold text-white mb-1 sm:mb-2 lg:mb-3">{card.value}</div>
          <div className="text-slate-300 text-xs sm:text-sm lg:text-base xl:text-lg">{card.label}</div>
          <div className="text-slate-500 text-[10px] sm:text-xs lg:text-sm mt-1 sm:mt-2 lg:mt-3">{card.description}</div>
        </div>
      ))}
    </aside>
  );
});

PointsSummary.displayName = "PointsSummary";

interface DashboardHeaderProps {
  userName: string;
  locationLabel?: string;
  onRefresh: () => void;
  onNavigate?: (route: string) => void;
  isRefreshing: boolean;
  showMobileMenu?: boolean;
  onMobileMenuToggle?: () => void;
}

const DashboardHeader = React.memo(function DashboardHeader({
  userName,
  locationLabel,
  onRefresh,
  onNavigate,
  isRefreshing,
  showMobileMenu,
  onMobileMenuToggle,
}: DashboardHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:gap-6 lg:gap-8 md:flex-row md:items-center md:justify-between mb-6 sm:mb-8 md:mb-10 lg:mb-12 w-full max-w-full overflow-hidden">
      <div className="flex items-start gap-3 sm:gap-4 lg:gap-6 flex-1 min-w-0">
        {/* Mobile Menu Button */}
        {onMobileMenuToggle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMobileMenuToggle}
            className="md:hidden h-9 w-9 sm:h-10 sm:w-10 rounded-full border border-white/20 hover:bg-white/10 text-white flex-shrink-0 mt-1"
            aria-label="Toggle mobile menu"
          >
            {showMobileMenu ? (
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            ) : (
              <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
          </Button>
        )}
        <div className="space-y-2 sm:space-y-3 lg:space-y-4 flex-1 min-w-0">
          <p className="text-xs sm:text-sm lg:text-base font-semibold uppercase tracking-[0.35em] text-teal-200/80">Welcome back</p>
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-semibold text-white break-words">
            Hello, {userName}!
          </h1>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl text-slate-300 break-words">
            {locationLabel ? `Air quality in ${locationLabel}` : "Your personalized air quality command center"}
          </p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 lg:gap-4 w-full sm:w-auto">
        <Button
          variant="outline"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="bg-white/5 hover:bg-white/10 text-white border-white/20 text-xs sm:text-sm lg:text-base h-8 sm:h-9 lg:h-10 xl:h-11 w-full sm:w-auto"
        >
          <RefreshCw className={`mr-1.5 sm:mr-2 lg:mr-2.5 h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 ${isRefreshing ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">{isRefreshing ? "Refreshing" : "Refresh Data"}</span>
          <span className="sm:hidden">{isRefreshing ? "Refreshing" : "Refresh"}</span>
        </Button>
        <Button
          variant="default"
          onClick={() => onNavigate?.("history")}
          className="bg-teal-400 hover:bg-teal-300 text-slate-900 text-xs sm:text-sm lg:text-base h-8 sm:h-9 lg:h-10 xl:h-11 w-full sm:w-auto"
        >
          <History className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">View History</span>
          <span className="sm:hidden">History</span>
        </Button>
      </div>
    </header>
  );
});

DashboardHeader.displayName = "DashboardHeader";

interface CurrentAirQualityCardProps {
  lastUpdated: string;
  aqiValue: number | string;
  aqiLabel: string;
  aqiColor: string;
  pollutantCards: PollutantCard[];
  onSelect: (pollutant: PollutantCard) => void;
  isRefreshing: boolean;
  onRefresh: () => void;
  onNavigate?: (route: string) => void;
}

const CurrentAirQualityCard = React.memo(function CurrentAirQualityCard({
  lastUpdated,
  aqiValue,
  aqiLabel,
  aqiColor,
  pollutantCards,
  onSelect,
  isRefreshing,
  onRefresh,
  onNavigate,
}: CurrentAirQualityCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 md:p-6 lg:p-8 xl:p-10 text-center w-full max-w-full overflow-hidden">
      <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-semibold text-white mb-1 sm:mb-2 lg:mb-3">Current Air Quality</h2>
      <p className="text-[10px] sm:text-xs md:text-sm lg:text-base text-slate-400">Last updated: {lastUpdated}</p>
      <div className="mt-4 sm:mt-6 md:mt-10 lg:mt-12 xl:mt-16 space-y-3 sm:space-y-4 md:space-y-6 lg:space-y-8">
        <div className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl 2xl:text-9xl font-bold" style={{ color: aqiColor }}>
          {aqiValue}
        </div>
        <div className="inline-flex items-center px-3 sm:px-4 md:px-5 lg:px-6 xl:px-8 py-1.5 sm:py-2 lg:py-3 rounded-full" style={{ backgroundColor: `${aqiColor}20` }}>
          <span className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-medium" style={{ color: aqiColor }}>
            {aqiLabel}
          </span>
        </div>
      </div>
      <PollutantCardGrid cards={pollutantCards} onSelect={onSelect} disabled={isRefreshing} />

      <div className="mt-4 sm:mt-6 md:mt-10 lg:mt-12 flex flex-col sm:flex-row justify-center gap-2 sm:gap-3 md:gap-4 lg:gap-5 w-full">
        <Button
          variant="outline"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="bg-slate-900/60 hover:bg-slate-900/40 text-white border-white/20 text-xs sm:text-sm lg:text-base h-8 sm:h-9 lg:h-10 xl:h-11 w-full sm:w-auto"
        >
          <RefreshCw className={`mr-1.5 sm:mr-2 lg:mr-2.5 h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 lg:h-6 lg:w-6 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Refreshing..." : "Refresh Now"}
        </Button>
        <Button
          variant="outline"
          onClick={() => onNavigate?.("history")}
          className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs sm:text-sm lg:text-base h-8 sm:h-9 lg:h-10 xl:h-11 w-full sm:w-auto"
        >
          <History className="mr-1.5 sm:mr-2 lg:mr-2.5 h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 lg:h-6 lg:w-6" />
          <span className="hidden sm:inline">View History</span>
          <span className="sm:hidden">History</span>
        </Button>
      </div>
    </div>
  );
});

CurrentAirQualityCard.displayName = "CurrentAirQualityCard";



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
 * Demo data for demo mode
 */
const DEMO_AIR_QUALITY_DATA = {
  aqi: 45,
  pm25: 12.5,
  pm10: 22.3,
  no2: 18.7,
  so2: 5.2,
  location: "San Francisco, CA",
  timestamp: new Date().toISOString(),
  dataSource: "Demo Data",
  coordinates: {
    lat: 37.7749,
    lon: -122.4194,
  },
};

const DEMO_USER_POINTS = {
  totalPoints: 1250,
  todayReadings: 8,
  weeklyReadings: 42,
};

/**
 * The content wrapper component - extracted for testability
 */
type AirQualityDashboardContentProps = AirQualityDashboardProps & { user: any; locationContext: any; isDemoMode?: boolean };

function AirQualityDashboardContent({
  user,
  locationContext,
  onNavigate,
  showMobileMenu,
  onMobileMenuToggle,
  isDemoMode = false,
}: AirQualityDashboardContentProps) {
  // Hooks - skip in demo mode
  const airQualityQuery = useAirQuality();
  const userPointsQuery = useUserPoints();
  const { toast } = useToast();
  
  // Use demo data in demo mode, otherwise use real hooks
  const data = isDemoMode ? DEMO_AIR_QUALITY_DATA : airQualityQuery.data;
  const isRefreshing = isDemoMode ? false : airQualityQuery.isRefreshing;
  const isLoading = isDemoMode ? false : airQualityQuery.isLoading;
  const error = isDemoMode ? null : airQualityQuery.error;
  const refreshData = isDemoMode ? () => {} : airQualityQuery.refreshData;
  
  const userPoints = isDemoMode ? DEMO_USER_POINTS : userPointsQuery.userPoints;
  const pointsLoading = isDemoMode ? false : userPointsQuery.isLoading;
  
  const {
    hasUserConsent = isDemoMode ? true : false,
    hasRequestedPermission = isDemoMode ? true : false,
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
    if (isDemoMode) return "Demo User";
    return user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  }, [user, isDemoMode]);

  // Use permission timeout hook (replaces forceDisplay pattern)
  const permissionTimeoutReached = usePermissionTimeout(hasRequestedPermission, 3000);

  const aqiNumericValue = data?.aqi ?? 0;
  const aqiColor = React.useMemo(() => getAQIColor(aqiNumericValue), [aqiNumericValue]);
  const aqiLabel = React.useMemo(() => getAQILabel(aqiNumericValue), [aqiNumericValue]);

  const pollutantCards = React.useMemo<PollutantCard[]>(() => (
    [
      { label: "PM2.5", value: data?.pm25 ?? 0, unit: "μg/m³" },
      { label: "PM10", value: data?.pm10 ?? 0, unit: "μg/m³" },
      { label: "NO₂", value: data?.no2 ?? 0, unit: "μg/m³" },
      { label: "SO₂", value: data?.so2 ?? 0, unit: "μg/m³" },
    ]
  ), [data?.pm25, data?.pm10, data?.no2, data?.so2]);

  const handlePollutantSelect = React.useCallback((pollutant: PollutantCard) => {
    setSelectedPollutant({
      name: pollutant.label,
      value: pollutant.value,
      unit: pollutant.unit,
      description: `Detailed information about ${pollutant.label}`,
      color: aqiColor,
    });
  }, [aqiColor]);

  const pointsSummaryCards = React.useMemo<PointsSummaryCard[]>(() => [
    {
      label: "Total Points",
      value: pointsLoading ? "—" : (userPoints?.totalPoints?.toLocaleString() ?? "—"),
      description: "Earned from air quality monitoring",
    },
    {
      label: "Today's Readings",
      value: pointsLoading ? "—" : (userPoints?.todayReadings?.toLocaleString() ?? "—"),
      description: "Air quality readings today",
    },
    {
      label: "Weekly Activity",
      value: pointsLoading ? "—" : (userPoints?.weeklyReadings?.toLocaleString() ?? "—"),
      description: "Readings this week",
    },
  ], [pointsLoading, userPoints?.totalPoints, userPoints?.todayReadings, userPoints?.weeklyReadings]);

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
    if (isDemoMode) {
      toast({
        title: "Demo Mode",
        description: "Refresh is disabled in demo mode. Create an account to access real-time data!",
        variant: "default",
      });
      return;
    }
    if (hasUserConsent) {
      refreshData();
    } else {
      console.log("Refresh skipped - user consent not granted");
    }
  }, [hasUserConsent, refreshData, isDemoMode, toast]);

  const renderUnifiedShell = (content: React.ReactNode) => (
    <div className="relative z-10 w-full max-w-full overflow-x-hidden">
      <div className="w-full max-w-full overflow-hidden">
        <div className="bg-black/40 ring-1 ring-white/10 p-3 sm:p-4 md:p-6 lg:p-8 xl:p-10 2xl:p-12 w-full max-w-full overflow-hidden">
          {content}
        </div>
      </div>
    </div>
  );

  // Permission check UI - brief loading while waiting for permission or timeout
  const renderDashboardContent = () => {
    // Skip loading/error states in demo mode
    const showLoadingState = !isDemoMode && isLoading && !data;
    const showErrorState = !isDemoMode && !isLoading && !data && error;

    const lastUpdated = data?.timestamp ? new Date(data.timestamp).toLocaleString() : "—";
    const aqiValue = data?.aqi ?? "—";

    if (showLoadingState) {
      return renderUnifiedShell(
        <div className="py-8 sm:py-12 md:py-16 px-2 sm:px-4">
          <LoadingState
            title={`Hello, ${userName}!`}
            subtitle="Fetching the latest air quality insights..."
          />
        </div>
      );
    }

    if (showErrorState) {
      return renderUnifiedShell(
        <div className="py-8 sm:py-12 md:py-16 lg:py-20 xl:py-24 text-center space-y-6 sm:space-y-8 lg:space-y-10 px-2 sm:px-4 lg:px-6">
          <div className="mx-auto flex h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24 xl:h-32 xl:w-32 items-center justify-center rounded-full bg-red-500/15">
            <TrendingDown className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 xl:h-16 xl:w-16 text-red-400" />
          </div>
          <div className="space-y-2 sm:space-y-3 lg:space-y-4">
            <h3 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-semibold text-white">Something went wrong</h3>
            <p className="text-sm sm:text-base lg:text-lg xl:text-xl text-slate-300 max-w-xl lg:max-w-2xl xl:max-w-3xl mx-auto px-2 lg:px-4">
              {error?.message || "We couldn't retrieve the latest air quality data. Please try again shortly."}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 lg:gap-5 w-full sm:w-auto max-w-md sm:max-w-none mx-auto">
            <Button onClick={handleRefresh} disabled={isRefreshing} className="w-full sm:min-w-[180px] lg:min-w-[200px] text-xs sm:text-sm lg:text-base h-9 sm:h-10 lg:h-11">
              {isRefreshing ? (
                <>
                  <RefreshCw className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  Try again
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleRequestLocationPermission} className="w-full sm:min-w-[180px] lg:min-w-[200px] text-xs sm:text-sm lg:text-base h-9 sm:h-10 lg:h-11">
              <MapPin className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              Re-check location
            </Button>
          </div>
        </div>
      );
    }

    return renderUnifiedShell(
      <>
                <DashboardHeader
                  userName={userName}
                  locationLabel={data?.location}
                  onRefresh={handleRefresh}
                  onNavigate={onNavigate}
                  isRefreshing={isRefreshing}
                  showMobileMenu={showMobileMenu}
                  onMobileMenuToggle={onMobileMenuToggle}
                />

                <section className="grid gap-4 sm:gap-6 md:gap-8 lg:gap-10 xl:gap-12 grid-cols-1 lg:grid-cols-3 w-full max-w-full overflow-hidden">
                  <div className="lg:col-span-2 space-y-4 sm:space-y-6 md:space-y-8 lg:space-y-10 w-full max-w-full overflow-hidden">
                    <CurrentAirQualityCard
                      lastUpdated={lastUpdated}
                      aqiValue={aqiValue}
                      aqiLabel={aqiLabel}
                      aqiColor={aqiColor}
                      pollutantCards={pollutantCards}
                      onSelect={handlePollutantSelect}
                      isRefreshing={isRefreshing}
                      onRefresh={handleRefresh}
                      onNavigate={onNavigate}
                    />


                    {data && (
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 md:p-6 lg:p-8 xl:p-10 w-full max-w-full overflow-hidden">
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

                  <div className="lg:col-span-1 w-full max-w-full overflow-hidden">
                    <PointsSummary cards={pointsSummaryCards} />
                  </div>
                </section>

                <section className="mt-6 sm:mt-8 md:mt-12 pt-6 sm:pt-8 md:pt-12 border-t border-white/10 w-full max-w-full overflow-hidden">
                  <WeatherSection coordinates={coordinates} />
                </section>
      </>
    );
  };

  return (
    <>
      {/* Demo Mode Banner */}
      {isDemoMode && (
        <div className="relative z-10 w-full max-w-full overflow-x-hidden">
          <div className="w-full max-w-full overflow-hidden">
            <motion.div
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-3 sm:p-4 lg:p-5 xl:p-6 rounded-lg shadow-lg mb-3 sm:mb-4 lg:mb-6"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 lg:gap-5">
                <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 flex-1 min-w-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 xl:w-12 xl:h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-xs sm:text-sm lg:text-base">🎯</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm sm:text-base lg:text-lg xl:text-xl">Demo Mode</h3>
                    <p className="text-xs sm:text-sm lg:text-base xl:text-lg text-blue-100">You're viewing sample data. Create an account to unlock real-time air quality monitoring!</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => window.location.href = "/onboarding"}
                  className="bg-white text-blue-600 hover:bg-blue-50 text-xs sm:text-sm lg:text-base h-8 sm:h-9 lg:h-10 xl:h-11 w-full sm:w-auto"
                >
                  Get Started
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
      
      {isDemoMode
        ? renderDashboardContent()
        : !hasRequestedPermission && !permissionTimeoutReached
          ? renderUnifiedShell(
              <div className="py-8 sm:py-12 md:py-16 px-2 sm:px-4">
                <LoadingState
                  title={`Hello, ${userName}!`}
                  subtitle="Checking location permissions..."
                />
              </div>
            )
          : !hasUserConsent
            ? renderUnifiedShell(
                <div className="py-6 sm:py-8 md:py-10 px-2 sm:px-4">
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
  isDemoMode = false,
}: AirQualityDashboardProps) {
  // Skip auth and location contexts in demo mode
  const authQuery = useAuth();
  const locationContext = useLocationContext();

  return (
    <AirQualityDashboardContent
      user={isDemoMode ? null : authQuery.user}
      locationContext={isDemoMode ? null : locationContext}
      onNavigate={onNavigate}
      showMobileMenu={showMobileMenu}
      onMobileMenuToggle={onMobileMenuToggle}
      isDemoMode={isDemoMode}
    />
  );
}

export default AirQualityDashboard;
