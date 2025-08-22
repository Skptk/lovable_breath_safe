import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, RefreshCw, Award, Zap, Clock, MapPin, ArrowRight, User, Satellite } from "lucide-react";
import { useAirQuality } from "@/hooks/useAirQuality";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPoints } from "@/hooks/useUserPoints";
import { useRefreshCountdown } from "@/hooks/useRefreshCountdown";
import { useLocation } from "@/contexts/LocationContext";
import { StatCard } from "@/components/ui/StatCard";
import { getAQIColor, getAQILabel } from "@/config/maps";

import Header from "@/components/Header";
import WeatherStatsCard from "./WeatherStatsCard";

interface AirQualityDashboardProps {
  onNavigate?: (route: string) => void;
  showMobileMenu?: boolean;
  onMobileMenuToggle?: () => void;
}

export default function AirQualityDashboard({ 
  onNavigate, 
  showMobileMenu, 
  onMobileMenuToggle 
}: AirQualityDashboardProps) {
  const { user } = useAuth();
  const { data, isRefetching: isRefreshing, refetch, hasUserConsent, hasRequestedPermission, isLoading, error, manualRefresh } = useAirQuality();
  const { userPoints, isLoading: pointsLoading } = useUserPoints();
  const { timeUntilRefresh, manualRefresh: refreshCountdown } = useRefreshCountdown();
  const { requestLocationPermission, isRequestingPermission } = useLocation();
  
  const [selectedPollutant, setSelectedPollutant] = useState<{
    name: string;
    value: number;
    unit: string;
    description: string;
    color: string;
  } | null>(null);

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

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
      const granted = await requestLocationPermission();
      if (granted) {
        console.log('Location permission granted, refreshing data...');
        // Don't auto-refresh, let the useQuery hook handle it when hasUserConsent changes
      } else {
        console.log('Location permission denied by user');
      }
    } catch (error) {
      console.error('Failed to request location permission:', error);
    }
  };

  // Show loading state while checking permissions
  if (!hasRequestedPermission) {
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
                To provide accurate air quality data for your area, we need access to your location.
              </p>
            </div>
            
            <div className="space-y-3">
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
                    <MapPin className="w-4 h-4 mr-2" />
                    Enable Location Access
                  </>
                )}
              </Button>
              
              <p className="text-xs text-muted-foreground">
                Your location is only used to fetch air quality data and is never stored or shared.
              </p>
            </div>
          </div>
        </motion.div>
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
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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
        </motion.div>
      </div>
    );
  }

  // Show dashboard with data
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

    // Debug: Log coordinates being passed to WeatherStatsCard
    console.log('AirQualityDashboard: Passing coordinates to WeatherStatsCard:', {
      coordinates: data.coordinates,
      lat: data.coordinates.lat,
      lon: data.coordinates.lon
    });

    return (
      <div className="space-y-6 lg:space-y-8">
        <Header
          title={`Hello, ${userName}!`}
          subtitle={`Air quality in ${data.location}`}
          showMobileMenu={showMobileMenu}
          onMobileMenuToggle={onMobileMenuToggle}
        />

        {/* Main AQI Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <Card className="modern-card glass-card">
            <CardHeader className="text-center pb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h2 className="text-2xl font-black text-primary">Current Air Quality</h2>
              </div>
              <p className="text-muted-foreground">
                Last updated: {data.timestamp}
              </p>
            </CardHeader>
            <CardContent className="text-center space-y-6">
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
                  
                  {/* Location Info with Source */}
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{data.location}</span>
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {React.createElement(locationIcon, { className: "w-3 h-3 mr-1" })}
                      {locationSource}
                    </Badge>
                  </div>

                  {/* Data Source Info */}
                  <div className="text-xs text-muted-foreground">
                    Data source: {data.dataSource}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 justify-center">
                    <Button 
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      variant="outline"
                      size="sm"
                      className="btn-modern"
                    >
                      {isRefreshing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                          Refreshing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Refresh
                        </>
                      )}
                    </Button>
                    
                    <Button 
                      onClick={() => onNavigate?.('map')}
                      variant="outline"
                      size="sm"
                      className="btn-modern"
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      View Map
                    </Button>
                  </div>
                </div>

                {/* Right Side - Emission Data Breakdown */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-muted-foreground mb-3">Pollutant Breakdown</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { name: 'PM2.5', value: data.pm25, unit: 'μg/m³', color: 'text-blue-600', description: 'Fine particulate matter that can penetrate deep into the lungs and bloodstream, causing respiratory and cardiovascular health issues.' },
                      { name: 'PM10', value: data.pm10, unit: 'μg/m³', color: 'text-green-600', description: 'Coarse particulate matter that can irritate the eyes, nose, and throat, affecting respiratory health.' },
                      { name: 'NO₂', value: data.no2, unit: 'ppb', color: 'text-orange-600', description: 'Nitrogen dioxide, a gas that can cause airway inflammation and increase susceptibility to respiratory infections.' },
                      { name: 'O₃', value: data.o3, unit: 'ppb', color: 'text-purple-600', description: 'Ground-level ozone that can cause breathing difficulties, especially for people with asthma or other respiratory conditions.' }
                    ].map((pollutant) => (
                      <div
                        key={pollutant.name}
                        className="text-center p-2 rounded-lg border border-border cursor-pointer hover:bg-accent/50 transition-colors modern-card"
                        onClick={() => setSelectedPollutant(pollutant)}
                      >
                        <div className={`text-lg font-semibold ${pollutant.color}`}>
                          {pollutant.value}
                        </div>
                        <div className="text-xs text-muted-foreground">{pollutant.name}</div>
                        <div className="text-xs text-muted-foreground">{pollutant.unit}</div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Informational Card */}
                  <div className="mt-4">
                    <div className="p-3 bg-muted/30 rounded-lg border border-border min-h-[120px] modern-card">
                      {selectedPollutant ? (
                        <div className="space-y-2">
                          <h5 className="font-semibold text-sm text-foreground">
                            {selectedPollutant.name} Information
                          </h5>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {selectedPollutant.description}
                          </p>
                          <div className="text-xs text-muted-foreground">
                            Current level: <span className="font-medium">{selectedPollutant.value} {selectedPollutant.unit}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-xs text-muted-foreground text-center">
                            Click on any pollutant level above to see detailed information
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>



        {/* Weather Stats Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
        >
          <WeatherStatsCard 
            latitude={data.coordinates.lat} 
            longitude={data.coordinates.lon} 
          />
        </motion.div>

        {/* User Stats and Rewards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {/* Points and Rewards */}
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-600" />
                <h3 className="text-lg font-bold">Your Progress</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {pointsLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Points</span>
                    <span className="text-2xl font-bold text-yellow-600">
                      {userPoints?.totalPoints || 0}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Readings Today</span>
                    <span className="text-lg font-semibold">
                      {userPoints?.todayReadings || 0}
                    </span>
                  </div>
                  
                  <Button 
                    onClick={() => onNavigate?.('profile')}
                    className="w-full"
                    variant="outline"
                  >
                    <Award className="w-4 h-4 mr-2" />
                    View Rewards
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Refresh Countdown */}
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold">Auto Refresh</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.floor(timeUntilRefresh / 60)}:{(timeUntilRefresh % 60).toString().padStart(2, '0')}
                </div>
                <p className="text-sm text-muted-foreground">Until next update</p>
              </div>
              
              <Button 
                onClick={refreshCountdown}
                className="w-full"
                variant="outline"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Now
              </Button>
            </CardContent>
          </Card>
        </motion.div>


      </div>
    );
  }

  // Show loading state
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
        <p className="mt-4 text-muted-foreground">Fetching air quality data...</p>
      </div>
    </div>
  );
}
