import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RefreshCw, History, Map, Download, MapPin, Loader2, AlertTriangle, Info, TrendingUp } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import PollutantModal from "./PollutantModal";

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
}

// AQI Range definitions with colors and descriptions
const AQI_RANGES = [
  { min: 0, max: 50, label: "Good", color: "bg-green-500", textColor: "text-green-500", description: "Air quality is satisfactory, and air pollution poses little or no risk." },
  { min: 51, max: 100, label: "Moderate", color: "bg-yellow-500", textColor: "text-yellow-500", description: "Air quality is acceptable; however, some pollutants may be a concern for a small number of people." },
  { min: 101, max: 150, label: "Unhealthy for Sensitive Groups", color: "bg-orange-500", textColor: "text-orange-500", description: "Members of sensitive groups may experience health effects. The general public is not likely to be affected." },
  { min: 151, max: 200, label: "Unhealthy", color: "bg-red-500", textColor: "text-red-500", description: "Everyone may begin to experience health effects; members of sensitive groups may experience more serious effects." },
  { min: 201, max: 300, label: "Very Unhealthy", color: "bg-purple-500", textColor: "text-purple-500", description: "Health alert: everyone may experience more serious health effects." },
  { min: 301, max: 500, label: "Hazardous", color: "bg-red-800", textColor: "text-red-800", description: "Health warning of emergency conditions: everyone is more likely to be affected." }
];

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

const getAQIRange = (aqi: number) => {
  return AQI_RANGES.find(range => aqi >= range.min && aqi <= range.max) || AQI_RANGES[0];
};

// AQI Scale Component
const AQIScale = ({ currentAQI }: { currentAQI: number }) => {
  const maxAQI = 500;
  const currentPosition = (currentAQI / maxAQI) * 100;
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>0</span>
        <span>500</span>
      </div>
      
      {/* AQI Scale Bar */}
      <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
        {/* Color segments */}
        <div className="absolute inset-0 flex">
          <div className="h-full w-1/10 bg-green-500"></div>
          <div className="h-full w-1/10 bg-yellow-500"></div>
          <div className="h-full w-1/10 bg-orange-500"></div>
          <div className="h-full w-1/10 bg-red-500"></div>
          <div className="h-full w-1/10 bg-purple-500"></div>
          <div className="h-full w-5/10 bg-red-800"></div>
        </div>
        
        {/* Current AQI indicator */}
        <div 
          className="absolute top-0 w-1 h-full bg-black rounded-full shadow-lg"
          style={{ left: `${Math.min(currentPosition, 100)}%` }}
        ></div>
      </div>
      
      {/* Range labels */}
      <div className="flex justify-between text-xs">
        {AQI_RANGES.slice(0, 3).map((range, index) => (
          <div key={index} className="text-center">
            <div className={`w-2 h-2 rounded-full ${range.color} mx-auto mb-1`}></div>
            <span className="text-muted-foreground">{range.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// AQI Graph Component
const AQIGraph = ({ aqi }: { aqi: number }) => {
  const maxAQI = 500;
  const height = (aqi / maxAQI) * 100;
  const range = getAQIRange(aqi);
  
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">AQI Trend</span>
      </div>
      
      {/* Graph container */}
      <div className="relative h-24 bg-gray-100 rounded-lg p-3">
        {/* Y-axis labels */}
        <div className="absolute left-2 top-0 bottom-0 flex flex-col justify-between text-xs text-muted-foreground">
          <span>500</span>
          <span>250</span>
          <span>0</span>
        </div>
        
        {/* Graph bar */}
        <div className="absolute bottom-3 left-8 right-3">
          <div className="relative h-full">
            {/* Background grid lines */}
            <div className="absolute top-1/3 w-full h-px bg-gray-300"></div>
            <div className="absolute top-2/3 w-full h-px bg-gray-300"></div>
            
            {/* AQI bar */}
            <div 
              className={`absolute bottom-0 w-full ${range.color} rounded-t-lg transition-all duration-500 ease-out`}
              style={{ height: `${Math.min(height, 100)}%` }}
            ></div>
            
            {/* AQI value on bar */}
            <div className="absolute bottom-0 left-0 right-0 text-center">
              <span className="text-white font-bold text-sm drop-shadow-lg">
                {aqi}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Range indicator */}
      <div className="text-center">
        <Badge 
          variant="secondary" 
          className={`${range.color} text-white border-0`}
        >
          {range.label}
        </Badge>
        <p className="text-xs text-muted-foreground mt-1">
          Range: {range.min}-{range.max}
        </p>
      </div>
    </div>
  );
};

export default function AirQualityDashboard(): JSX.Element {
  const [selectedPollutant, setSelectedPollutant] = useState<{
    name: string;
    value: number;
    unit: string;
  } | null>(null);
  const { toast } = useToast();

  const fetchAirQualityData = async (): Promise<AirQualityData> => {
    if (!navigator.geolocation) {
      throw new Error('Geolocation not supported by your browser');
    }

    // Check if location permission is granted
    if (navigator.permissions) {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      if (permission.state === 'denied') {
        throw new Error('Location access denied. Please enable location permissions in your browser settings.');
      }
    }

    // Try multiple location strategies with different settings
    let position: GeolocationPosition;
    
    try {
      // Strategy 1: High accuracy with longer timeout
      position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 20000, // 20 seconds
          enableHighAccuracy: true,
          maximumAge: 0 // Force fresh location data
        });
      });
    } catch (error: any) {
      console.log('High accuracy failed, trying low accuracy...', error.message);
      
      try {
        // Strategy 2: Low accuracy with shorter timeout
        position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 10000, // 10 seconds
            enableHighAccuracy: false,
            maximumAge: 0 // Force fresh location data
          });
        });
      } catch (error2: any) {
        console.log('Low accuracy failed, trying with cached data...', error2.message);
        
        try {
          // Strategy 3: Allow cached data with very short timeout
          position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000, // 5 seconds
              enableHighAccuracy: false,
              maximumAge: 5 * 60 * 1000 // Allow 5-minute old data
            });
          });
        } catch (error3: any) {
          // All strategies failed - provide helpful error message
          if (error3.code === 3) { // TIMEOUT
            throw new Error('Location timeout. This often happens after using a VPN. Please refresh the page or wait a few minutes for location services to reset.');
          } else if (error3.code === 2) { // POSITION_UNAVAILABLE
            throw new Error('Location unavailable. Please check your internet connection and try again.');
          } else if (error3.code === 1) { // PERMISSION_DENIED
            throw new Error('Location access denied. Please enable location permissions in your browser settings.');
          } else {
            throw new Error(`Location error: ${error3.message}. Try refreshing the page.`);
          }
        }
      }
    }

    const { latitude, longitude } = position.coords;
    
    // Log user's actual coordinates for debugging
    console.log('User coordinates:', { latitude, longitude });
    
    const { data: response, error } = await supabase.functions.invoke('get-air-quality', {
      body: { lat: latitude, lon: longitude }
    });

    if (error) {
      throw new Error(`Supabase function error: ${error.message}`);
    }

    if (!response) {
      throw new Error('No response data received');
    }

    // Debug: Log the actual response structure
    console.log('Supabase function response:', response);

    // Check if the response has the expected structure
    if (response && typeof response === 'object' && 'pollutants' in response) {
      // New enhanced format with capital city data
      const typedResponse = response as any;
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
        dataSource: typedResponse.dataSource || 'Unknown Source'
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
    gcTime: 5 * 60 * 1000, // 5 minutes
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const handleRefresh = () => {
    refetch();
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
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Getting your location...</p>
          <p className="text-xs text-muted-foreground">Please allow location access when prompted</p>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    const isLocationError = error instanceof Error && (
      error.message.includes('Location') || 
      error.message.includes('location') ||
      error.message.includes('VPN') ||
      error.message.includes('timeout')
    );

    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          
          <h2 className="text-xl font-semibold">
            {isLocationError ? 'Location Error' : 'Failed to load data'}
          </h2>
          
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>

          {isLocationError && (
            <div className="text-sm text-muted-foreground space-y-2 p-3 bg-muted/50 rounded-lg">
              <p><strong>VPN Location Issues?</strong></p>
              <p>If you recently used a VPN, try these steps:</p>
              <ol className="text-left list-decimal list-inside space-y-1">
                <li>Disable VPN completely</li>
                <li>Clear browser cache and cookies</li>
                <li>Wait 2-3 minutes for location services to reset</li>
                <li>Refresh the page</li>
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
                Force Refresh Page
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

  const currentRange = getAQIRange(data.aqi);

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

      {/* Main AQI Card */}
      <Card className="bg-gradient-card shadow-card border-0">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="space-y-2">
              <div className={`text-6xl font-bold ${getAQIColor(data.aqi)}`}>
                {data.aqi}
              </div>
              <Badge 
                variant="secondary" 
                className={`${currentRange.color} text-white border-0 px-4 py-1`}
              >
                {currentRange.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Air Quality Index • Updated {data.timestamp}
            </p>
          </div>
        </CardContent>
      </Card>

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

      {/* AQI Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* AQI Scale */}
        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              AQI Scale
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Air Quality Index ranges and what they mean</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AQIScale currentAQI={data.aqi} />
          </CardContent>
        </Card>

        {/* AQI Graph */}
        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Current AQI</CardTitle>
          </CardHeader>
          <CardContent>
            <AQIGraph aqi={data.aqi} />
          </CardContent>
        </Card>
      </div>

      {/* AQI Range Explanation */}
      <Card className="bg-gradient-card shadow-card border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">What This AQI Means</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-background/50 rounded-lg">
              <div className={`w-4 h-4 rounded-full ${currentRange.color} mt-1 flex-shrink-0`}></div>
              <div>
                <div className="font-medium">{currentRange.label}</div>
                <p className="text-sm text-muted-foreground">{currentRange.description}</p>
                <div className="text-xs text-muted-foreground mt-1">
                  AQI Range: {currentRange.min}-{currentRange.max}
                </div>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground text-center">
              💡 <strong>Tip:</strong> AQI 2 is excellent air quality! Lower numbers mean cleaner air.
            </div>
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