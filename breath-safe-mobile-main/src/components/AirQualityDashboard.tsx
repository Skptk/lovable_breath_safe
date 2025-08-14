import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, History, Map, Download, MapPin, Loader2 } from "lucide-react";
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

export default function AirQualityDashboard() {
  const [data, setData] = useState<AirQualityData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPollutant, setSelectedPollutant] = useState<{
    name: string;
    value: number;
    unit: string;
  } | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchAirQualityData();
  }, []);

  const fetchAirQualityData = async () => {
    setIsRefreshing(true);
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            
            const { data: response, error } = await supabase.functions.invoke('get-air-quality', {
              body: { lat: latitude, lon: longitude }
            });

            if (error) throw error;

            if (response) {
              setData({
                aqi: response.aqi,
                pm25: response.pollutants.pm25,
                pm10: response.pollutants.pm10,
                no2: response.pollutants.no2,
                so2: response.pollutants.so2,
                co: response.pollutants.co,
                o3: response.pollutants.o3,
                location: response.location,
                timestamp: new Date(response.timestamp).toLocaleString(),
              });
            }
          },
          (error) => {
            console.error('Geolocation error:', error);
            toast({
              title: "Location Error",
              description: "Unable to get your location. Please enable location services.",
              variant: "destructive",
            });
          }
        );
      } else {
        toast({
          title: "Geolocation Not Supported",
          description: "Your browser doesn't support geolocation.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error fetching air quality data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch air quality data",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePollutantClick = (name: string, value: number, unit: string) => {
    setSelectedPollutant({ name, value, unit });
  };

  if (!data) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading air quality data...</p>
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
          onClick={fetchAirQualityData}
          disabled={isRefreshing}
          className="bg-background/50 border-border hover:bg-card"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
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
            onClick={() => handlePollutantClick(item.code, item.value, item.unit)}
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
        pollutant={selectedPollutant?.name || ''}
        value={selectedPollutant?.value || 0}
        unit={selectedPollutant?.unit || ''}
        isOpen={!!selectedPollutant}
        onClose={() => setSelectedPollutant(null)}
      />
    </div>
  );
}