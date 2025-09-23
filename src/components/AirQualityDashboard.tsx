import React, { useState, useMemo, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Award,
  Zap,
  Clock,
  MapPin,
  User,
  Satellite,
} from "lucide-react";
import { useAirQuality } from "@/hooks/useAirQuality";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPoints } from "@/hooks/useUserPoints";
import { useRefreshCountdown } from "@/hooks/useRefreshCountdown";
import { useLocationContext } from "@/contexts";
import { StatCard } from "@/components/ui/StatCard";
import { RefreshProgressBar } from "@/components/ui/RefreshProgressBar";
import { getAQIColor, getAQILabel } from "@/config/maps";
import { useToast } from "@/hooks/use-toast";

import Header from "@/components/Header";
import WeatherStatsCard from "./WeatherStatsCard";
import DataSourceValidator from "./DataSourceValidator";

interface AirQualityDashboardProps {
  onNavigate?: (route: string) => void;
  showMobileMenu?: boolean;
  onMobileMenuToggle?: () => void;
  isDemoMode?: boolean;
}

/**
 * Small reusable Loading state UI
 */
const LoadingState: React.FC<{ title?: string; subtitle?: string }> = ({
  title = "Loading",
  subtitle = "Please wait...",
}) => {
  return (
    <div className="space-y-6 lg:space-y-8">
      <Header title={title} subtitle={subtitle} />
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
        <p className="mt-4 text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
};

/**
 * Permission request card
 */
const PermissionRequest: React.FC<{
  onRequest: () => void;
  requesting: boolean;
  userName: string;
  showMobileMenu?: boolean;
  onMobileMenuToggle?: () => void;
}> = ({ onRequest, requesting, userName, showMobileMenu, onMobileMenuToggle }) => {
  return (
    <div className="space-y-6 lg:space-y-8">
      <Header
        title={`Hello, ${userName}!`}
        subtitle="Enable location access to monitor air quality"
        showMobileMenu={showMobileMenu}
        onMobileMenuToggle={onMobileMenuToggle}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="text-center py-12"
      >
        <div className="max-w-md mx-auto space-y-6">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <MapPin className="w-12 h-12 text-primary" />
          </div>

          <div className="space-y-3">
            <h3 className="text-xl font-semibold">Location Access Required</h3>
            <p className="text-muted-foreground">
              To provide accurate air quality data, we need access to your
              location. This fetches real-time air quality for your area.
            </p>
          </div>

          <Button onClick={onRequest} disabled={requesting} className="w-full" size="lg">
            {requesting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Requesting...
              </>
            ) : (
              <>
                <MapPin className="w-4 w-4 mr-2" />
                Enable Location Access
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground">
            Your location is used only for fetching air quality data and is not
            stored or shared.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

/**
 * Pollutant detail modal
 */
const PollutantModal: React.FC<{
  pollutant: {
    name: string;
    value: number;
    unit: string;
    description: string;
    color: string;
  } | null;
  onClose: () => void;
}> = ({ pollutant, onClose }) => {
  if (!pollutant) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <GlassCard variant="elevated" className="p-6">
          <div className="text-center space-y-4">
            <div className={`text-4xl font-bold ${pollutant.color}`}>
              {pollutant.value.toFixed(1)}
            </div>
            <div className="text-lg font-semibold">{pollutant.name}</div>
            <div className="text-muted-foreground">{pollutant.unit}</div>
            <p className="text-sm text-muted-foreground">{pollutant.description}</p>
            <Button onClick={onClose} variant="outline" className="w-full">
              Close
            </Button>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
};

/**
 * AQI card (main display)
 */
const AQICard: React.FC<{
  data: any;
  timeUntilRefresh: number;
  isRefreshing: boolean;
  onRefresh: () => void;
  onNavigate?: (route: string) => void;
  showMobileMenu?: boolean;
  onMobileMenuToggle?: () => void;
  isDemoMode?: boolean;
  setSelectedPollutant: (p: any | null) => void;
}> = ({
  data,
  timeUntilRefresh,
  isRefreshing,
  onRefresh,
  onNavigate,
  showMobileMenu,
  onMobileMenuToggle,
  isDemoMode,
  setSelectedPollutant,
}) => {
  const aqiColor = getAQIColor(data?.aqi ?? 0);
  const aqiLabel = getAQILabel(data?.aqi ?? 0);

  const isUserLocation =
    data?.dataSource === "OpenWeatherMap API" &&
    data?.coordinates?.lat === data?.userCoordinates?.lat &&
    data?.coordinates?.lon === data?.userCoordinates?.lon;

  const locationSource = isUserLocation ? "Your Location" : "Nearest Sensor";
  const locationIcon = isUserLocation ? User : Satellite;

  const pollutants = useMemo(
    () => [
      { name: "PM2.5", value: data?.pm25 ?? 0, unit: "μg/m³", color: "text-blue-500" },
      { name: "PM10", value: data?.pm10 ?? 0, unit: "μg/m³", color: "text-green-500" },
      { name: "NO₂", value: data?.no2 ?? 0, unit: "μg/m³", color: "text-orange-500" },
      { name: "SO₂", value: data?.so2 ?? 0, unit: "μg/m³", color: "text-red-500" },
      { name: "CO", value: data?.co ?? 0, unit: "μg/m³", color: "text-purple-500" },
      { name: "O₃", value: data?.o3 ?? 0, unit: "μg/m³", color: "text-yellow-500" },
    ],
    [data?.pm25, data?.pm10, data?.no2, data?.so2, data?.co, data?.o3, data?.dataSource, data?.coordinates]
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}>
      <GlassCard variant="elevated" className="p-6">
        <GlassCardHeader className="text-center pb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-black text-primary">Current Air Quality</h2>
          </div>
          <p className="text-muted-foreground">Last updated: {data?.timestamp ?? "—"}</p>
        </GlassCardHeader>
        <GlassCardContent className="text-center space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="text-center space-y-4">
              <div className="text-6xl font-bold mb-2" style={{ color: aqiColor }}>
                {data?.aqi ?? "—"}
              </div>
              <Badge variant="outline" className="px-4 py-2 text-sm font-semibold" style={{ borderColor: aqiColor, color: aqiColor, backgroundColor: `${aqiColor}10` }}>
                {aqiLabel}
              </Badge>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  {React.createElement(locationIcon, { className: "w-4 h-4" })}
                  <span>{locationSource}</span>
                </div>
                <div className="text-xs text-muted-foreground">Data source: {data?.dataSource ?? "—"}</div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button onClick={onRefresh} disabled={isRefreshing} variant="outline" size="sm" className="flex-1 sm:flex-none">
                  {isRefreshing ? (
                    <>
                      <RefreshCw className="w-4 w-4 animate-spin mr-2" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 w-4 mr-2" />
                      Refresh Now
                    </>
                  )}
                </Button>

                <Button onClick={() => onNavigate?.("history")} variant="outline" size="sm" className="flex-1 sm:flex-none">
                  <Clock className="w-4 w-4 mr-2" />
                  View History
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-center">Pollutant Breakdown</h3>
              <div className="grid grid-cols-2 gap-3">
                {pollutants.map((pollutant) => (
                  <GlassCard
                    key={pollutant.name}
                    variant="subtle"
                    className="p-3 text-center cursor-pointer hover:scale-105 transition-transform"
                    onClick={() =>
                      setSelectedPollutant({
                        name: pollutant.name,
                        value: pollutant.value,
                        unit: pollutant.unit,
                        description: `Detailed information about ${pollutant.name}`,
                        color: pollutant.color,
                      })
                    }
                  >
                    <div className={`text-lg font-bold ${pollutant.color}`}>{pollutant.value.toFixed(1)}</div>
                    <div className="text-xs text-muted-foreground">{pollutant.name}</div>
                    <div className="text-xs text-muted-foreground">{pollutant.unit}</div>
                  </GlassCard>
                ))}
              </div>
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>
    </motion.div>
  );
};

/**
 * Points grid
 */
const PointsGrid: React.FC<{
  userPoints: any;
  onNavigate?: (route: string) => void;
}> = ({ userPoints, onNavigate }) => {
  if (!userPoints) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div onClick={() => onNavigate?.("rewards")} className="cursor-pointer hover:scale-105 transition-transform">
        <StatCard title="Total Points" value={(userPoints.totalPoints || 0).toLocaleString()} icon={<Award className="w-5 h-5" />} subtitle="Earned from air quality monitoring" />
      </div>

      <div onClick={() => onNavigate?.("history")} className="cursor-pointer hover:scale-105 transition-transform">
        <StatCard title="Today's Readings" value={userPoints.todayReadings || 0} icon={<Zap className="w-5 h-5" />} subtitle="Air quality readings today" />
      </div>

      <div onClick={() => onNavigate?.("history")} className="cursor-pointer hover:scale-105 transition-transform">
        <StatCard title="Weekly Activity" value={userPoints.weeklyReadings || 0} icon={<TrendingUp className="w-5 h-5" />} subtitle="Readings this week" />
      </div>
    </motion.div>
  );
};

interface WeatherSectionProps {
  coordinates: { 
    latitude: number; 
    longitude: number; 
  } | null;
}

/**
 * Weather section wrapper with proper null checks and typing
 */
const WeatherSection: React.FC<WeatherSectionProps> = ({ 
  coordinates 
}) => {
  // Early return if coordinates are not available
  if (!coordinates || 
      typeof coordinates.latitude !== 'number' || 
      typeof coordinates.longitude !== 'number') {
    return null;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.6, ease: "easeOut", delay: 0.4 }}
    >
      <WeatherStatsCard 
        latitude={coordinates.latitude} 
        longitude={coordinates.longitude} 
      />
    </motion.div>
  );
};

/**
 * Hook: small permission timeout helper
 * returns boolean `timedOut` that becomes true after `ms` if `hasRequestedPermission` is still false
 */
const usePermissionTimeout = (hasRequestedPermission: boolean, ms: number = 3000) => {
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (hasRequestedPermission) {
      setTimedOut(false);
      return;
    }
    const id = setTimeout(() => setTimedOut(true), ms);
    return () => clearTimeout(id);
  }, [hasRequestedPermission, ms]);
  return timedOut;
};

/**
 * The content wrapper component - extracted for testability
 */
const AirQualityDashboardContent: React.FC<
  AirQualityDashboardProps & { user: any; locationContext: any }
> = ({ user, locationContext, onNavigate, showMobileMenu, onMobileMenuToggle, isDemoMode = false }) => {
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
  const [selectedPollutant, setSelectedPollutant] = useState<null | {
    name: string;
    value: number;
    unit: string;
    description: string;
    color: string;
  }>(null);

  const userName = useMemo(() => {
    return user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  }, [user]);

  // Use permission timeout hook (replaces forceDisplay pattern)
  const permissionTimeoutReached = usePermissionTimeout(hasRequestedPermission, 3000);

  // Memoize coordinates with proper typing and null checks
  const memoizedCoordinates = useMemo<{ latitude: number; longitude: number } | null>(() => {
    if (!data?.coordinates || 
        typeof data.coordinates.lat !== 'number' || 
        typeof data.coordinates.lon !== 'number') {
      return null;
    }
    return { 
      latitude: Number(data.coordinates.lat), 
      longitude: Number(data.coordinates.lon) 
    };
  }, [data?.coordinates?.lat, data?.coordinates?.lon]);

  // Request location permission handler
  const handleRequestLocationPermission = useCallback(async () => {
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
        toast({ title: "Location Access Failed", description: "Unable to get location permission. Please try again.", variant: "destructive" });
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
      toast({ title: "Location Access Failed", description: errorMessage, variant: "destructive" });
    }
  }, [isRequestingPermission, requestLocationPermission, toast]);

  // Manual refresh handler - respects consent
  const handleRefresh = useCallback(() => {
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
        <Header title={`Hello, ${userName}!`} subtitle={`Air quality in ${data.location ?? "your area"}`} showMobileMenu={showMobileMenu} onMobileMenuToggle={onMobileMenuToggle} />

        <RefreshProgressBar timeUntilRefresh={timeUntilRefresh} isRefreshing={isRefreshing} onManualRefresh={handleRefresh} />

        {data && (
          <DataSourceValidator dataSource={data.dataSource} aqi={data.aqi} location={data.location} timestamp={data.timestamp} userLocation={data.location} />
        )}

        {isDemoMode && (
          <motion.div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg shadow-lg" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Demo Mode Active</h3>
                <p className="text-blue-100 text-sm">Showing sample data for demonstration purposes</p>
              </div>
              <Badge variant="secondary" className="bg-white/20 text-white">
                DEMO
              </Badge>
            </div>
          </motion.div>
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

        {!pointsLoading && userPoints && <PointsGrid userPoints={userPoints} onNavigate={onNavigate} />}

        <WeatherSection coordinates={memoizedCoordinates} />

        <PollutantModal pollutant={selectedPollutant} onClose={() => setSelectedPollutant(null)} />
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
        <Header title={`Hello, ${userName}!`} subtitle="Error loading air quality data" showMobileMenu={showMobileMenu} onMobileMenuToggle={onMobileMenuToggle} />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} className="text-center py-12">
          <div className="max-w-md mx-auto space-y-6">
            <div className="w-24 h-24 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <TrendingDown className="w-12 h-12 text-destructive" />
            </div>

            <div className="space-y-3">
              <h3 className="text-xl font-semibold">Failed to Load Data</h3>
              <p className="text-muted-foreground">{error.message || "Unable to fetch air quality data. Please try again."}</p>
            </div>

            <div className="space-y-3">
              <Button onClick={handleRefresh} disabled={isRefreshing} className="w-full" size="lg">
                {isRefreshing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 h-4 border-b-2 border-white mr-2" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 w-4 mr-2" />
                    Try Again
                  </>
                )}
              </Button>

              <Button variant="outline" onClick={handleRequestLocationPermission} className="w-full">
                <MapPin className="w-4 w-4 mr-2" />
                Re-check Location
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="space-y-6 lg:space-y-8">
      <Header title={`Hello, ${userName}!`} subtitle="Something went wrong" showMobileMenu={showMobileMenu} onMobileMenuToggle={onMobileMenuToggle} />
      <div className="text-center py-12">
        <p className="text-muted-foreground">Unable to display dashboard. Please refresh the page.</p>
      </div>
    </div>
  );
};

/**
 * Main wrapper that ties into location + auth contexts
 */
export const AirQualityDashboard: React.FC<AirQualityDashboardProps> = ({ onNavigate, showMobileMenu, onMobileMenuToggle, isDemoMode = false }) => {
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
};

export default AirQualityDashboard;
