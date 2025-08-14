import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, TrendingUp, Download, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";

interface HistoryEntry {
  id: string;
  created_at: string;
  location_name: string;
  aqi: number;
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  so2: number | null;
  co: number | null;
  o3: number | null;
  latitude: number;
  longitude: number;
}

// Remove mock data - we'll fetch real data from Supabase

const getAQIColor = (aqi: number) => {
  if (aqi <= 50) return "aqi-good";
  if (aqi <= 100) return "aqi-moderate";
  if (aqi <= 150) return "aqi-unhealthy-sensitive";
  if (aqi <= 200) return "aqi-unhealthy";
  if (aqi <= 300) return "aqi-very-unhealthy";
  return "aqi-hazardous";
};

const getAQILabel = (aqi: number) => {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
};

export default function HistoryView(): JSX.Element {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchHistory();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchHistory = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('air_quality_readings')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) {
        throw fetchError;
      }

      setHistory(data || []);
    } catch (error: any) {
      console.error('Error fetching history:', error);
      setError(error.message || 'Failed to fetch history');
      toast({
        title: "Error",
        description: "Failed to load air quality history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading air quality history...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold">Failed to load history</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={fetchHistory} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Show empty state
  if (!user) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold">Authentication Required</h2>
          <p className="text-muted-foreground">Please sign in to view your air quality history.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Air Quality History
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your air quality exposure over time
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={fetchHistory}>
          <Download className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              7-Day Average
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">
              {history.length > 0 
                ? Math.round(history.slice(0, 7).reduce((sum, entry) => sum + entry.aqi, 0) / Math.min(history.length, 7))
                : '0'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              {history.length > 0 ? 'Good air quality' : 'No data available'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Total Records
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{history.length}</div>
            <p className="text-xs text-muted-foreground">
              {history.length === 1 ? 'record' : 'records'} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* History List */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">
          Recent Readings {history.length > 0 && `(${history.length})`}
        </h2>
        
        {history.length === 0 ? (
          <Card className="bg-gradient-card shadow-card border-0">
            <CardContent className="p-8 text-center">
              <div className="space-y-2">
                <MapPin className="h-12 w-12 mx-auto text-muted-foreground" />
                <h3 className="text-lg font-semibold">No History Yet</h3>
                <p className="text-sm text-muted-foreground">
                  Start tracking air quality to see your history here.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          history.map((entry) => (
            <Card key={entry.id} className="bg-gradient-card shadow-card border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="secondary"
                        className={`bg-${getAQIColor(entry.aqi)} text-white border-0 text-xs`}
                      >
                        AQI {entry.aqi}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {getAQILabel(entry.aqi)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{entry.location_name || 'Unknown Location'}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(entry.created_at)} at {formatTime(entry.created_at)}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    {entry.pm25 && (
                      <div className="text-sm">
                        <span className="font-medium">PM2.5:</span> {entry.pm25.toFixed(1)}
                      </div>
                    )}
                    {entry.pm10 && (
                      <div className="text-sm">
                        <span className="font-medium">PM10:</span> {entry.pm10.toFixed(1)}
                      </div>
                    )}
                    {entry.no2 && (
                      <div className="text-sm">
                        <span className="font-medium">NO₂:</span> {entry.no2.toFixed(1)}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Load More - Only show if there are records */}
      {history.length > 0 && (
        <Button variant="outline" className="w-full" onClick={fetchHistory}>
          Refresh Records
        </Button>
      )}
    </div>
  );
}