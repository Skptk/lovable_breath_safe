import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, History, Map, Download, MapPin, Loader2, AlertTriangle, Trophy, DollarSign, Gift } from "lucide-react";
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
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefetching}
          className="bg-background/50 border-border hover:bg-card"
        >
          <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
        </Button>
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

      {/* Pollutants Grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "PM2.5", value: data.pm25, unit: "µg/m³", code: "PM25" },
          { label: "PM10", value: data.pm10, unit: "µg/m³", code: "PM10" },
          { label: "NO₂", value: data.no2, unit: "µg/m³", code: "NO2" },
          { label: "SO₂", value: data.so2, unit: "µg/m³", code: "SO2" },
          { label: "CO", value: data.co, unit: "mg/m³", code: "CO" },
          { label: "O₃", value: data.o3, unit: "µg/m³", code: "O3" },
        ].map((item) => (
          <Card 
            key={item.label} 
            className="bg-gradient-card shadow-card border-0 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handlePollutantClick(item.label, item.value, item.unit)}
          >
            <CardContent className="p-4">
              <div className="text-sm font-medium text-muted-foreground">
                {item.label}
              </div>
              <div className="text-xl font-bold">{item.value}</div>
              <div className="text-xs text-muted-foreground">{item.unit}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Location Status & Quick Actions */}
      <div className="space-y-4">
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

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-4">
          <Button 
            onClick={handleRefresh} 
            disabled={isRefetching}
            variant="outline" 
            className="flex-col gap-2 h-auto py-4 bg-background/50 border-border hover:bg-card"
          >
            {isRefetching ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
            <span className="text-xs">Refresh</span>
          </Button>
          
          <Button variant="outline" className="flex-col gap-2 h-auto py-4 bg-background/50 border-border hover:bg-card">
            <History className="h-5 w-5" />
            <span className="text-xs">History</span>
          </Button>
          
          <Button variant="outline" className="flex-col gap-2 h-auto py-4 bg-background/50 border-border hover:bg-card">
            <Map className="h-5 w-5" />
            <span className="text-xs">Map View</span>
          </Button>
          
          <Button variant="outline" className="flex-col gap-2 h-auto py-4 bg-background/50 border-border hover:bg-card">
            <Download className="h-5 w-5" />
            <span className="text-xs">Export Data</span>
          </Button>
        </div>
      </div>

      <PollutantModal
        pollutant={selectedPollutant}
        onClose={() => setSelectedPollutant(null)}
      />
    </div>
  );
}