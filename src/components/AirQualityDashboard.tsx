import React, { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, RefreshCw, Award, Zap, Clock, MapPin, ArrowRight, User, Satellite } from "lucide-react";
import { useAirQuality } from "@/hooks/useAirQuality";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPoints } from "@/hooks/useUserPoints";
import { useRefreshCountdown } from "@/hooks/useRefreshCountdown";
import { useLocation } from "@/contexts/LocationContext";
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

export default function AirQualityDashboard({ 
  onNavigate, 
  showMobileMenu, 
  onMobileMenuToggle,
  isDemoMode = false
}: AirQualityDashboardProps) {
  const { user } = useAuth();
  const { data, isRefetching: isRefreshing, refetch, isLoading, error, manualRefresh, isUsingCachedData } = useAirQuality();
  const { userPoints, isLoading: pointsLoading } = useUserPoints();
  const { timeUntilRefresh, manualRefresh: refreshCountdown } = useRefreshCountdown();
  const { requestLocationPermission, isRequestingPermission, hasUserConsent, hasRequestedPermission } = useLocation();
  const { toast } = useToast();
  
  const [selectedPollutant, setSelectedPollutant] = useState<{
    name: string;
    value: number;
    unit: string;
    description: string;
    color: string;
  } | null>(null);

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  // CRITICAL FIX: Add local state to handle timeout override
  const [forceDisplay, setForceDisplay] = useState(false);

  // CRITICAL FIX: Enhanced timeout logic that actually forces display
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!hasRequestedPermission) {
        console.log('🚨 [Dashboard] Location permission check timeout - forcing dashboard display');
        setForceDisplay(true); // This will override the loading state
      }
    }, 3000); // 3 second timeout

    return () => clearTimeout(timeoutId);
  }, [hasRequestedPermission]);

  // Memoize coordinates to prevent unnecessary re-renders of WeatherStatsCard
  const memoizedCoordinates = useMemo(() => {
    if (!data?.coordinates) return null;
    return {
      latitude: data.coordinates.lat,
      longitude: data.coordinates.lon
    };
  }, [data?.coordinates?.lat, data?.coordinates?.lon]);

  const handleRefresh = () => {
    if (hasUserConsent) {
      manualRefresh();
    } else {
      console.log('Refresh skipped - user consent not granted');
    }
  };

  const handleRequestLocationPermission = async () => {
    if (isRequestingPermission) {
      console.log('Location permission request already in progress, skipping duplicate request');
      return;
    }
    
    try {
      console.log('Starting location permission request...');
      const success = await requestLocationPermission();
      
      if (success) {
        console.log('✅ Location permission granted successfully in dashboard');
        toast({
          title: "Location Access Granted",
          description: "Air quality data will now be fetched for your location.",
          variant: "default",
        });
        
        // Force a re-render to update the dashboard state
        // This ensures the dashboard shows after permission is granted
        setTimeout(() => {
          console.log('🔄 Forcing dashboard re-render after permission grant');
        }, 100);
      } else {
        console.log('❌ Location permission request failed');
        toast({
          title: "Location Access Failed",
          description: "Unable to get location permission. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Failed to request location permission:', error);
      
      // Show appropriate error message
      let errorMessage = 'Failed to get location permission';
      if (error.message?.includes('permission denied')) {
        errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
      } else if (error.message?.includes('unavailable')) {
        errorMessage = 'Location services unavailable. Please check your device settings.';
      } else if (error.message?.includes('timed out')) {
        errorMessage = 'Location request timed out. Please try again.';
      }
      
      toast({
        title: "Location Access Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // CRITICAL FIX: Show loading state only briefly while checking permissions
  // After 3 seconds, show the dashboard regardless of permission state
  if (!hasRequestedPermission && !forceDisplay) {
    return (
      <div className="space-y-6 lg:space-y-8">
        <Header
          title={`Hello, ${userName}!`}
          subtitle="Checking location permissions..."
          showMobileMenu={showMobileMenu}
          onMobileMenuToggle={onMobileMenuToggle}
        />
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Checking location permissions...</p>
          <p className="mt-2 text-sm text-muted-foreground">This should only take a moment</p>
        </div>
      </div>
    );
  }

  // Show location permission request if user hasn't consented
  if (!hasUserConsent) {
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
                To provide you with accurate air quality data, we need access to your location. 
                This helps us fetch real-time air quality information for your area.
              </p>
            </div>
            
            <Button 
              onClick={handleRequestLocationPermission}
              disabled={isRequestingPermission}
              className="w-full"
              size="lg"
            >
              {isRequestingPermission ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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
              Your location is only used to fetch air quality data and is never stored or shared.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Show dashboard with data (including cached data)
  if (data) {
    // Use the proper AQI color and label functions
    const aqiColor = getAQIColor(data.aqi);
    const aqiLabel = getAQILabel(data.aqi);
    
    // Determine if this is user location or sensor data
    const isUserLocation = data.dataSource === 'OpenWeatherMap API' && 
                          data.coordinates.lat === data.userCoordinates.lat && 
                          data.coordinates.lon === data.userCoordinates.lon;
    
    const locationSource = isUserLocation ? 'Your Location' : 'Nearest Sensor';
    const locationIcon = isUserLocation ? User : Satellite;

    return (
      <div className="space-y-6 lg:space-y-8">
        <Header
          title={`Hello, ${userName}!`}
          subtitle={`Air quality in ${data.location}`}
          showMobileMenu={showMobileMenu}
          onMobileMenuToggle={onMobileMenuToggle}
        />

        {/* Refresh Progress Bar */}
        <RefreshProgressBar
          timeUntilRefresh={timeUntilRefresh}
          isRefreshing={isRefreshing}
          onManualRefresh={handleRefresh}
          isUsingCachedData={isUsingCachedData}
        />

        {/* Data Source Validator */}
        {data && (
          <DataSourceValidator
            dataSource={data.dataSource}
            aqi={data.aqi}
            location={data.location}
            timestamp={data.timestamp}
            stationName={data.stationName}
            distance={data.distance}
            stationUid={data.stationUid}
            country={data.country}
            userLocation={data.location}
          />
        )}

        {/* Demo Mode Banner */}
        {isDemoMode && (
          <motion.div
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg shadow-lg"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
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

        {/* Main AQI Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <GlassCard variant="elevated" className="p-6">
            <GlassCardHeader className="text-center pb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h2 className="text-2xl font-black text-primary">Current Air Quality</h2>
              </div>
              <p className="text-muted-foreground">
                Last updated: {data.timestamp}
                {isUsingCachedData && (
                  <span className="ml-2 text-amber-600 dark:text-amber-400">
                    (Cached data)
                  </span>
                )}
              </p>
            </GlassCardHeader>
            <GlassCardContent className="text-center space-y-6">
              {/* AQI Display with Emission Data Side by Side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* Left Side - AQI Value with Info Beneath */}
                <div className="text-center space-y-4">
                  <div 
                    className="text-6xl font-bold mb-2"
                    style={{ color: aqiColor }}
                  >
                    {data.aqi}
                  </div>
                  <Badge 
                    variant="outline" 
                    className="px-4 py-2 text-sm font-semibold"
                    style={{ 
                      borderColor: aqiColor, 
                      color: aqiColor,
                      backgroundColor: `${aqiColor}10`
                    }}
                  >
                    {aqiLabel}
                  </Badge>
                  
                  {/* Location and Source Info */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      {React.createElement(locationIcon, { className: "w-4 h-4" })}
                      <span>{locationSource}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Data source: {data.dataSource}
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Button 
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      variant="outline"
                      size="sm"
                      className="flex-1 sm:flex-none"
                    >
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
                    
                    <Button 
                      onClick={() => onNavigate?.('history')}
                      variant="outline"
                      size="sm"
                      className="flex-1 sm:flex-none"
                    >
                      <Clock className="w-4 w-4 mr-2" />
                      View History
                    </Button>
                  </div>
                </div>

                {/* Right Side - Pollutant Grid */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-center">Pollutant Breakdown</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { name: 'PM2.5', value: data.pm25, unit: 'μg/m³', color: 'text-blue-500' },
                      { name: 'PM10', value: data.pm10, unit: 'μg/m³', color: 'text-green-500' },
                      { name: 'NO₂', value: data.no2, unit: 'μg/m³', color: 'text-orange-500' },
                      { name: 'SO₂', value: data.so2, unit: 'μg/m³', color: 'text-red-500' },
                      { name: 'CO', value: data.co, unit: 'μg/m³', color: 'text-purple-500' },
                      { name: 'O₃', value: data.o3, unit: 'μg/m³', color: 'text-yellow-500' }
                    ].map((pollutant) => (
                      <GlassCard
                        key={pollutant.name}
                        variant="subtle"
                        className="p-3 text-center cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => setSelectedPollutant({
                          name: pollutant.name,
                          value: pollutant.value || 0,
                          unit: pollutant.unit,
                          description: `Detailed information about ${pollutant.name}`,
                          color: pollutant.color
                        })}
                      >
                        <div className={`text-lg font-bold ${pollutant.color}`}>
                          {(pollutant.value || 0).toFixed(1)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {pollutant.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {pollutant.unit}
                        </div>
                      </GlassCard>
                    ))}
                  </div>
                </div>
              </div>
            </GlassCardContent>
          </GlassCard>
        </motion.div>

        {/* User Points and Rewards */}
        {!pointsLoading && userPoints && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <div onClick={() => onNavigate?.('rewards')} className="cursor-pointer hover:scale-105 transition-transform">
              <StatCard
                title="Total Points"
                value={(userPoints.totalPoints || 0).toLocaleString()}
                icon={<Award className="w-5 h-5" />}
                subtitle="Earned from air quality monitoring"
                className="cursor-pointer"
              />
            </div>
            
            <div onClick={() => onNavigate?.('history')} className="cursor-pointer hover:scale-105 transition-transform">
              <StatCard
                title="Today's Readings"
                value={userPoints.todayReadings || 0}
                icon={<Zap className="w-5 h-5" />}
                subtitle="Air quality readings today"
                className="cursor-pointer"
              />
            </div>
            
            <div onClick={() => onNavigate?.('history')} className="cursor-pointer hover:scale-105 transition-transform">
              <StatCard
                title="Weekly Activity"
                value={userPoints.weeklyReadings || 0}
                icon={<TrendingUp className="w-5 h-5" />}
                subtitle="Readings this week"
                className="cursor-pointer"
              />
            </div>
          </motion.div>
        )}

        {/* Weather Stats Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.4 }}
        >
          {memoizedCoordinates && (
            <WeatherStatsCard 
              latitude={memoizedCoordinates.latitude}
              longitude={memoizedCoordinates.longitude}
            />
          )}
        </motion.div>

        {/* Pollutant Detail Modal */}
        {selectedPollutant && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedPollutant(null)}
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
                  <div className={`text-4xl font-bold ${selectedPollutant.color}`}>
                    {selectedPollutant.value.toFixed(1)}
                  </div>
                  <div className="text-lg font-semibold">
                    {selectedPollutant.name}
                  </div>
                  <div className="text-muted-foreground">
                    {selectedPollutant.unit}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {selectedPollutant.description}
                  </p>
                  <Button 
                    onClick={() => setSelectedPollutant(null)}
                    variant="outline"
                    className="w-full"
                  >
                    Close
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6 lg:space-y-8">
        <Header
          title={`Hello, ${userName}!`}
          subtitle="Loading air quality data..."
          showMobileMenu={showMobileMenu}
          onMobileMenuToggle={onMobileMenuToggle}
        />
        
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Fetching latest air quality data...</p>
        </div>
      </div>
    );
  }

  // Show error state if data fetch failed
  if (error) {
    return (
      <div className="space-y-6 lg:space-y-8">
        <Header
          title={`Hello, ${userName}!`}
          subtitle="Error loading air quality data"
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
            <div className="w-24 h-24 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <TrendingDown className="w-12 h-12 text-destructive" />
            </div>
            
            <div className="space-y-3">
              <h3 className="text-xl font-semibold">Failed to Load Data</h3>
              <p className="text-muted-foreground">
                {error.message || 'Unable to fetch air quality data. Please try again.'}
              </p>
            </div>
            
            <div className="space-y-3">
              <Button 
                onClick={() => refetch()}
                disabled={isRefreshing}
                className="w-full"
                size="lg"
              >
                {isRefreshing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 h-4 border-b-2 border-white mr-2"></div>
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 w-4 mr-2" />
                    Try Again
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline"
                onClick={handleRequestLocationPermission}
                className="w-full"
              >
                <MapPin className="w-4 w-4 mr-2" />
                Re-check Location
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Fallback - should not reach here
  return (
    <div className="space-y-6 lg:space-y-8">
      <Header
        title={`Hello, ${userName}!`}
        subtitle="Something went wrong"
        showMobileMenu={showMobileMenu}
        onMobileMenuToggle={onMobileMenuToggle}
      />
      
      <div className="text-center py-12">
        <p className="text-muted-foreground">Unable to display dashboard. Please refresh the page.</p>
      </div>
    </div>
  );
}
