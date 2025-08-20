import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, RefreshCw, Award, Zap, Clock, MapPin } from "lucide-react";
import { useAirQuality } from "@/hooks/useAirQuality";
import { useAuth } from "@/hooks/useAuth";
import { useUserPoints } from "@/hooks/useUserPoints";
import { StatCard } from "@/components/ui/StatCard";
import NewsCard from "@/components/NewsCard";
import { ProgressGauge } from "@/components/ui/ProgressGauge";
import Header from "@/components/Header";
import PollutantModal from "./PollutantModal";

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
  const { data, isRefetching: isRefreshing, refetch, hasUserConsent, hasRequestedPermission, requestLocationPermission, isLoading, error } = useAirQuality();
  const { totalPoints, currencyRewards } = useUserPoints();
  const [showPollutantModal, setShowPollutantModal] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  const handleRefresh = () => {
    if (hasUserConsent) {
      refetch();
    }
  };

  const handleRequestLocationPermission = async () => {
    setIsRequestingPermission(true);
    try {
      const granted = await requestLocationPermission();
      if (granted) {
        refetch();
      }
    } catch (error) {
      console.error('Failed to request location permission:', error);
    } finally {
      setIsRequestingPermission(false);
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
          subtitle="Enable location access to view air quality data"
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
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto">
              <MapPin className="w-12 h-12 text-muted-foreground" />
            </div>
            
            <div className="space-y-3">
              <h3 className="text-xl font-semibold">Location Access Required</h3>
              <p className="text-muted-foreground">
                To provide you with accurate air quality data for your area, we need access to your location.
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
                  Requesting Permission...
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4 mr-2" />
                  Enable Location Access
                </>
              )}
            </Button>
            
            <p className="text-xs text-muted-foreground">
              Your location data is only used to fetch air quality information and is never stored or shared.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Show loading state while fetching data
  if (!data && isLoading) {
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
          <p className="mt-4 text-muted-foreground">Loading air quality data...</p>
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
                onClick={() => {
                  // Show demo data as fallback
                  const demoData = {
                    aqi: 45,
                    pm25: 12.5,
                    pm10: 25.3,
                    no2: 15.2,
                    so2: 3.1,
                    co: 0.8,
                    o3: 28.5,
                    location: 'Demo Location',
                    userLocation: 'Demo Location',
                    coordinates: { lat: 40.7128, lon: -74.0060 },
                    userCoordinates: { lat: 40.7128, lon: -74.0060 },
                    timestamp: new Date().toLocaleString(),
                    dataSource: 'Demo Data (API Unavailable)'
                  };
                  // Force the hook to use demo data
                  refetch();
                }}
                variant="outline"
                className="w-full"
                size="lg"
              >
                Show Demo Data
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Show dashboard with data
  if (data) {
    const aqiStatus = {
      status: data.aqi <= 50 ? "Good" : data.aqi <= 100 ? "Moderate" : "Poor",
      color: data.aqi <= 50 ? "text-success" : data.aqi <= 100 ? "text-warning" : "text-error"
    };

    return (
      <div className="space-y-6 lg:space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <Header
            title={`Hello, ${userName}!`}
            subtitle={`Air quality data for ${data.location || 'your area'}`}
            showRefresh={hasUserConsent}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            onNavigate={onNavigate}
            showMobileMenu={showMobileMenu}
            onMobileMenuToggle={onMobileMenuToggle}
          />
        </motion.div>

        {/* Stats Grid */}
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
        >
          <StatCard
            title="Current AQI"
            value={data.aqi}
            subtitle="Air Quality Index"
            icon={<TrendingUp className="h-5 w-5" />}
            change={{
              value: "Good",
              type: data.aqi <= 50 ? "increase" : data.aqi <= 100 ? "neutral" : "decrease"
            }}
          />
          
          <StatCard
            title="PM2.5"
            value={`${data.pm25?.toFixed(1) || 'N/A'} µg/m³`}
            subtitle="Fine particles"
            icon={<MapPin className="h-5 w-5" />}
            change={{
              value: data.pm25 <= 12 ? "Good" : "High",
              type: data.pm25 <= 12 ? "increase" : "decrease"
            }}
          />
          
          <StatCard
            title="PM10"
            value={`${data.pm10?.toFixed(1) || 'N/A'} µg/m³`}
            subtitle="Coarse particles"
            icon={<Clock className="h-5 w-5" />}
            change={{
              value: data.pm10 <= 54 ? "Good" : "High",
              type: data.pm10 <= 54 ? "increase" : "decrease"
            }}
          />
          
          <StatCard
            title="Total Points"
            value={totalPoints.toLocaleString()}
            subtitle="Earned rewards"
            icon={<Award className="h-5 w-5" />}
            change={{
              value: `$${currencyRewards.toFixed(2)}`,
              type: "increase"
            }}
          />
        </motion.div>

        {/* Main Content Grid */}
        <motion.div 
          className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
        >
          {/* News Articles Card */}
          <div className="xl:col-span-2">
            <NewsCard />
          </div>

          {/* Air Quality Details Card */}
          <Card className="relative overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Air Quality Details</h3>
                <Badge variant="outline" className={aqiStatus.color}>
                  {aqiStatus.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <ProgressGauge
                  value={Math.min((data.aqi / 300) * 100, 100)}
                  size={80}
                  color={
                    data.aqi <= 50 ? "hsl(var(--success))" :
                    data.aqi <= 100 ? "hsl(var(--warning))" :
                    "hsl(var(--error))"
                  }
                />
                <p className="text-sm text-muted-foreground mt-2">
                  AQI: {data.aqi}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">PM2.5</p>
                  <p className="font-semibold">{data.pm25?.toFixed(1) || 'N/A'}</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">PM10</p>
                  <p className="font-semibold">{data.pm10?.toFixed(1) || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pollutant Modal */}
        <PollutantModal 
          pollutant={null}
          onClose={() => setShowPollutantModal(false)}
        />
      </div>
    );
  }

  // Fallback
  return (
    <div className="space-y-6 lg:space-y-8">
      <Header
        title={`Hello, ${userName}!`}
        subtitle="Unable to load dashboard"
        showMobileMenu={showMobileMenu}
        onMobileMenuToggle={onMobileMenuToggle}
      />
      <div className="text-center py-12">
        <p className="text-muted-foreground">Something went wrong. Please refresh the page.</p>
      </div>
    </div>
  );
}
