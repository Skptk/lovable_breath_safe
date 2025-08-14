import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, History, Map, Download, MapPin, Loader2, AlertTriangle } from "lucide-react";
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
  timestamp: string;
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
  const { toast } = useToast();

  const fetchAirQualityData = async (): Promise<AirQualityData> => {
    if (!navigator.geolocation) {
      throw new Error('Geolocation not supported');
    }

    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 10000,
        enableHighAccuracy: false,
        maximumAge: 5 * 60 * 1000 // 5 minutes
      });
    });

    const { latitude, longitude } = position.coords;
    
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
      // New format with pollutants object
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
        timestamp: new Date(typedResponse.timestamp).toLocaleString(),
      };
    } else if (response && typeof response === 'object' && 'list' in response && Array.isArray((response as any).list)) {
      // Raw OpenWeatherMap format
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
        timestamp: new Date().toLocaleString(),
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
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 2,
    retryDelay: 1000,
  });

  const handleRefresh = (): void => {
    refetch();
  };

  const handlePollutantClick = (name: string, value: number, unit: string): void => {
    setSelectedPollutant({ name, value, unit });
  };

  // Handle loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading air quality data...</p>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold">Failed to load data</h2>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
          <Button onClick={() => refetch()} variant="outline">
            Try Again
          </Button>
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
                className="bg-primary/10 text-primary border-0 px-4 py-1"
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

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-4">
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

      <PollutantModal
        pollutant={selectedPollutant}
        onClose={() => setSelectedPollutant(null)}
      />
    </div>
  );
}