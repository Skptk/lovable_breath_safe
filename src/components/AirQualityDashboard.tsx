import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, MapPin, Loader2, AlertTriangle, Trophy } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import PollutantModal from "./PollutantModal";
import { useAuth } from "@/hooks/useAuth";

interface AirQualityData {
  aqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  so2: number;
  co: number;
  o3: number;
  location: string;
  userLocation: string;
  coordinates: { lat: number; lon: number };
  userCoordinates: { lat: number; lon: number };
  timestamp: string;
  dataSource: string;
  userPoints?: number;
  currencyRewards?: number;
  canWithdraw?: boolean;
  environmental?: {
    temperature: number;
    humidity: number;
  };
}

// Helper functions for AQI display
const getAQIColor = (aqi: number): string => {
  if (aqi <= 50) return "text-green-500";
  if (aqi <= 100) return "text-yellow-500";
  if (aqi <= 150) return "text-orange-500";
  if (aqi <= 200) return "text-red-500";
  if (aqi <= 300) return "text-purple-500";
  return "text-red-800";
};

const getAQILabel = (aqi: number): string => {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive Groups";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
};

// Helper function to get pollutant display info
const getPollutantInfo = (code: string, value: number) => {
  const pollutantMap: Record<string, { label: string; unit: string; icon?: string }> = {
    'PM25': { label: "PM2.5", unit: "µg/m³" },
    'PM10': { label: "PM10", unit: "µg/m³" },
    'PM1': { label: "PM1", unit: "µg/m³" },
    'NO2': { label: "NO₂", unit: "µg/m³" },
    'SO2': { label: "SO₂", unit: "µg/m³" },
    'CO': { label: "CO", unit: "mg/m³" },
    'O3': { label: "O₃", unit: "µg/m³" },
    'TEMPERATURE': { label: "Temperature", unit: "°C" },
    'HUMIDITY': { label: "Humidity", unit: "%" },
    'PM003': { label: "PM0.3", unit: "particles/cm³" }
  };
  
  return pollutantMap[code] || { label: code, unit: "N/A" };
};

export default function AirQualityDashboard(): JSX.Element {
  const [selectedPollutant, setSelectedPollutant] = useState<{
    name: string;
    value: number;
    unit: string;
  } | null>(null);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [currencyRewards, setCurrencyRewards] = useState<number>(0);
  const [canWithdraw, setCanWithdraw] = useState<boolean>(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchAirQualityData = async (): Promise<AirQualityData> => {
    if (!navigator.geolocation) {
      throw new Error('Geolocation not supported by your browser');
    }

    // Simple, reliable location detection that works on mobile
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 30000, // 30 seconds - mobile devices need more time
        enableHighAccuracy: false, // Disable high accuracy for mobile compatibility
        maximumAge: 10 * 60 * 1000 // Allow 10-minute old data for mobile
      });
    });

    const { latitude, longitude } = position.coords;
    
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    console.log('User session:', session ? 'Authenticated' : 'Not authenticated');
    
    const { data: response, error } = await supabase.functions.invoke('get-air-quality', {
      body: { lat: latitude, lon: longitude }
    });

    if (error) {
      throw new Error(`Supabase function error: ${error.message}`);
    }

    if (!response) {
      throw new Error('No response data received');
    }

    // Debug: Log the response structure
    console.log('Supabase function response:', response);
    console.log('Response type:', typeof response);
    console.log('Response keys:', Object.keys(response));

    // Check if the response has the expected structure
    if (response && typeof response === 'object' && 'pollutants' in response) {
      // New enhanced format with capital city data
      const typedResponse = response as any;
      console.log('Using enhanced format, AQI:', typedResponse.aqi);
      
      // Update local state with user data from response
      if (typedResponse.userPoints !== undefined) {
        setUserPoints(typedResponse.userPoints);
      }
      if (typedResponse.currencyRewards !== undefined) {
        setCurrencyRewards(typedResponse.currencyRewards);
      }
      if (typedResponse.canWithdraw !== undefined) {
        setCanWithdraw(typedResponse.canWithdraw);
      }
      
      return {
        aqi: typedResponse.aqi,
        pm25: typedResponse.pollutants.pm25,
        pm10: typedResponse.pollutants.pm10,
        no2: typedResponse.pollutants.no2,
        so2: typedResponse.pollutants.so2,
        co: typedResponse.pollutants.co,
        o3: typedResponse.pollutants.o3,
        location: typedResponse.location,
        userLocation: typedResponse.userLocation || 'Unknown Location',
        coordinates: typedResponse.coordinates || { lat: 0, lon: 0 },
        userCoordinates: typedResponse.userCoordinates || { lat: 0, lon: 0 },
        timestamp: new Date(typedResponse.timestamp).toLocaleString(),
        dataSource: typedResponse.dataSource || 'Unknown Source',
        userPoints: typedResponse.userPoints,
        currencyRewards: typedResponse.currencyRewards,
        canWithdraw: typedResponse.canWithdraw
      };
    } else if (response && typeof response === 'object' && 'list' in response && Array.isArray((response as any).list)) {
      // Raw OpenWeatherMap format (fallback)
      const typedResponse = response as any;
      const currentData = typedResponse.list[0];
      return {
        aqi: currentData.main.aqi,
        pm25: currentData.components.pm2_5,
        pm10: currentData.components.pm10,
        no2: currentData.components.no2,
        so2: currentData.components.so2,
        co: currentData.components.co,
        o3: currentData.components.o3,
        location: typedResponse.location || 'Unknown Location',
        userLocation: 'Location data unavailable',
        coordinates: { lat: 0, lon: 0 },
        userCoordinates: { lat: 0, lon: 0 },
        timestamp: new Date().toLocaleString(),
        dataSource: 'Direct API response'
      };
    } else {
      // Fallback for unexpected format
      console.error('Unexpected response format:', response);
      throw new Error('Unexpected data format received from API');
    }
  };

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['airQuality'],
    queryFn: fetchAirQualityData,
    gcTime: 0, // No caching
    staleTime: 0, // Always consider data stale
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    refetchIntervalInBackground: true,
  });

  // Fetch user points when component mounts or user changes
  useEffect(() => {
    if (user) {
      fetchUserPoints();
    }
  }, [user]);

  const fetchUserPoints = async () => {
    if (!user) return;
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('total_points')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching user points:', error);
        return;
      }
      
      if (profile) {
        setUserPoints(profile.total_points || 0);
        // Calculate currency rewards
        setCurrencyRewards((profile.total_points || 0) / 1000 * 0.1);
        setCanWithdraw((profile.total_points || 0) >= 500000);
      }
    } catch (err) {
      console.error('Error fetching user points:', err);
    }
  };

  const handleRefresh = () => {
    refetch();
    if (user) {
      fetchUserPoints();
    }
    toast({
      title: "Refreshing data",
      description: "Fetching latest air quality information...",
    });
  };

  const handlePollutantClick = (name: string, value: number, unit: string) => {
    setSelectedPollutant({ name, value, unit });
  };

  // Create dynamic pollutant cards based on available data
  const createPollutantCards = () => {
    if (!data) return [];
    
    const pollutants = [
      { code: 'PM25', value: data.pm25, threshold: 12, showIfZero: false },
      { code: 'PM10', value: data.pm10, threshold: 54, showIfZero: false },
      { code: 'PM1', value: data.pm25 * 0.7, threshold: 8, showIfZero: false }, // Estimate PM1 from PM2.5
      { code: 'NO2', value: data.no2, threshold: 53, showIfZero: false },
      { code: 'SO2', value: data.so2, threshold: 35, showIfZero: false },
      { code: 'CO', value: data.co, threshold: 4.4, showIfZero: false },
      { code: 'O3', value: data.o3, threshold: 54, showIfZero: false },
      { code: 'TEMPERATURE', value: data.environmental?.temperature || 25, threshold: null, showIfZero: true },
      { code: 'HUMIDITY', value: data.environmental?.humidity || 60, threshold: null, showIfZero: true },
      { code: 'PM003', value: data.pm25 * 2, threshold: null, showIfZero: false } // Estimate PM0.3 from PM2.5
    ];
    
    // Filter pollutants based on data availability
    return pollutants.filter(pollutant => {
      if (pollutant.showIfZero) {
        // Always show environmental sensors (temperature, humidity)
        return true;
      }
      // Only show pollutant sensors if they have meaningful data
      return pollutant.value > 0;
    });
  };

  // Handle loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          </div>
          <p className="text-muted-foreground">Getting your location...</p>
          <p className="text-xs text-muted-foreground">Please allow location access when prompted</p>
          <div className="text-sm text-muted-foreground space-y-2 p-3 bg-muted/50 rounded-lg max-w-sm">
            <p><strong>Mobile users:</strong> Make sure location services are enabled in your device settings</p>
          </div>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    const isLocationError = error instanceof Error && (
      error.message.includes('Location') || 
      error.message.includes('location') ||
      error.message.includes('timeout') ||
      error.message.includes('permission')
    );

    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          
          <h2 className="text-xl font-semibold">
            {isLocationError ? 'Location Access Required' : 'Failed to load data'}
          </h2>
          
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>

          {isLocationError && (
            <div className="text-sm text-muted-foreground space-y-2 p-3 bg-muted/50 rounded-lg">
              <p><strong>Location Access Required</strong></p>
              <p>This app needs your location to show air quality data:</p>
              <ol className="text-left list-decimal list-inside space-y-1">
                <li>Allow location access when prompted</li>
                <li>Check browser settings if no prompt appears</li>
                <li>On mobile: Settings → Privacy → Location Services</li>
                <li>Refresh the page after enabling location</li>
              </ol>
            </div>
          )}
          
          <div className="flex flex-col gap-2">
            <Button onClick={() => refetch()} variant="outline" className="w-full">
              Try Again
            </Button>
            
            {isLocationError && (
              <Button 
                onClick={() => {
                  // Force a complete page refresh to clear location cache
                  window.location.reload();
                }} 
                variant="secondary"
                className="w-full"
              >
                Refresh Page
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Handle no data state
  if (!data) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">No air quality data available</p>
          <Button onClick={() => refetch()} variant="outline">
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  const pollutantCards = createPollutantCards();

  return (
    <div className="min-h-screen bg-background p-4 space-y-6 pb-24">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Air Quality
          </h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {data.location}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefetching}
            className="bg-background/50 border-border hover:bg-card"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            {isRefetching ? 'Refreshing...' : 'Refresh'}
          </Button>
          <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
            Auto-refresh: 5min
          </div>
        </div>
      </div>

      {/* Main AQI and User Points - Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Main AQI Card - Left Side */}
        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="space-y-2">
                <div className={`text-6xl font-bold ${getAQIColor(data.aqi)}`}>
                  {data.aqi}
                </div>
                <Badge 
                  variant="secondary" 
                  className={`${getAQIColor(data.aqi).replace('text-', 'bg-')} text-white border-0 px-4 py-1`}
                >
                  {getAQILabel(data.aqi)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Air Quality Index • Updated {data.timestamp}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* User Points Card - Right Side */}
        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="space-y-2">
                <div className="text-6xl font-bold text-primary">
                  <Trophy className="w-16 h-16 mx-auto" />
                </div>
                <Badge 
                  variant="secondary" 
                  className="bg-primary/10 text-primary border-0 px-4 py-1"
                >
                  Your Points
                </Badge>
              </div>
              <div className="text-3xl font-bold text-primary">
                {userPoints}
              </div>
              <p className="text-sm text-muted-foreground">
                Earn points for good air quality days
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Location Information */}
      <Card className="bg-gradient-card shadow-card border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location & Data Source
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">AQI Data Source:</span>
              <Badge variant="outline" className="text-xs">
                {data.location}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Your Location:</span>
              <Badge variant="secondary" className="text-xs">
                {data.userLocation}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Data Source:</span>
              <span className="text-xs text-muted-foreground">{data.dataSource}</span>
            </div>
          </div>
          
          <div className="pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              💡 <strong>Note:</strong> AQI data is collected from the nearest major city with reliable air quality monitoring. 
              This provides more accurate readings than hyper-local estimates.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Dynamic Pollutants Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Available Sensors</h2>
          <Badge variant="outline" className="text-xs">
            {pollutantCards.length} sensors
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {pollutantCards.map((pollutant) => {
            const info = getPollutantInfo(pollutant.code, pollutant.value);
            const isEnvironmental = pollutant.code === 'TEMPERATURE' || pollutant.code === 'HUMIDITY';
            
            return (
              <Card 
                key={pollutant.code} 
                className="bg-gradient-card shadow-card border-0 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handlePollutantClick(info.label, pollutant.value, info.unit)}
              >
                <CardContent className="p-4">
                  <div className="text-sm font-medium text-muted-foreground">
                    {info.label}
                  </div>
                  <div className="text-xl font-bold">
                    {isEnvironmental ? pollutant.value : pollutant.value.toFixed(1)}
                  </div>
                  <div className="text-xs text-muted-foreground">{info.unit}</div>
                  {pollutant.threshold && (
                    <div className="text-xs text-muted-foreground mt-1">
                      WHO limit: {pollutant.threshold}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Location Status */}
      <Card className="bg-gradient-card shadow-card border-0">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Location Status</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {data.userLocation}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Last updated: {data.timestamp}
          </p>
        </CardContent>
      </Card>

      <PollutantModal
        pollutant={selectedPollutant}
        onClose={() => setSelectedPollutant(null)}
      />
    </div>
  );
}