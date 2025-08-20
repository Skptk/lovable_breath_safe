import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, MapPin, TrendingUp, Download, Loader2, AlertTriangle, Thermometer, Droplets, Clock, Trash2, RefreshCw, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import Header from "@/components/Header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import HistoryDetailModal from "./HistoryDetailModal";


interface HistoryEntry {
  id: string;
  created_at: string;
  timestamp: string;
  location_name: string;
  aqi: number;
  pm25: number | null;
  pm10: number | null;
  pm1: number | null;
  no2: number | null;
  so2: number | null;
  co: number | null;
  o3: number | null;
  temperature: number | null;
  humidity: number | null;
  pm003: number | null;
  data_source: string | null;
  latitude: number;
  longitude: number;
  // New weather fields
  wind_speed?: number | null;
  wind_direction?: number | null;
  wind_gust?: number | null;
  air_pressure?: number | null;
  rain_probability?: number | null;
  uv_index?: number | null;
  visibility?: number | null;
  weather_condition?: string | null;
  feels_like_temperature?: number | null;
  sunrise_time?: string | null;
  sunset_time?: string | null;
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

const getAQIBadgeColor = (aqi: number): string => {
  if (aqi <= 50) return "bg-green-500 text-white";
  if (aqi <= 100) return "bg-yellow-500 text-white";
  if (aqi <= 150) return "bg-orange-500 text-white";
  if (aqi <= 200) return "bg-red-500 text-white";
  if (aqi <= 300) return "bg-purple-500 text-white";
  return "bg-red-800 text-white";
};

const getAQILabel = (aqi: number): string => {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
};

interface HistoryViewProps {
  showMobileMenu?: boolean;
  onMobileMenuToggle?: () => void;
}

export default function HistoryView({ showMobileMenu, onMobileMenuToggle }: HistoryViewProps = {}): JSX.Element {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showFetchButton, setShowFetchButton] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
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
        .order('timestamp', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      // Transform the data to match our interface, handling missing fields
      const transformedData: HistoryEntry[] = (data || []).map(entry => ({
        id: entry.id,
        created_at: entry.created_at,
        timestamp: (entry as any).timestamp || entry.created_at, // Fallback to created_at if timestamp is missing
        location_name: entry.location_name,
        aqi: entry.aqi,
        pm25: entry.pm25,
        pm10: entry.pm10,
        pm1: (entry as any).pm1 || null,
        no2: entry.no2,
        so2: entry.so2,
        co: entry.co,
        o3: entry.o3,
        temperature: (entry as any).temperature || null,
        humidity: (entry as any).humidity || null,
        pm003: (entry as any).pm003 || null,
        data_source: (entry as any).data_source || null,
        latitude: entry.latitude,
        longitude: entry.longitude,
        // New weather fields
        wind_speed: (entry as any).wind_speed || null,
        wind_direction: (entry as any).wind_direction || null,
        wind_gust: (entry as any).wind_gust || null,
        air_pressure: (entry as any).air_pressure || null,
        rain_probability: (entry as any).rain_probability || null,
        uv_index: (entry as any).uv_index || null,
        visibility: (entry as any).visibility || null,
        weather_condition: (entry as any).weather_condition || null,
        feels_like_temperature: (entry as any).feels_like_temperature || null,
        sunrise_time: (entry as any).sunrise_time || null,
        sunset_time: (entry as any).sunset_time || null,
      }));

      setHistory(transformedData);
      
      // If no history, ensure user points are reset to 0 and show fetch button
      if (transformedData.length === 0) {
        await resetUserPoints();
        setShowFetchButton(true);
      } else {
        // Hide fetch button if there's already data
        setShowFetchButton(false);
      }
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

  // Function to reset user points when they have no history
  const resetUserPoints = async (): Promise<void> => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ total_points: 0 })
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error resetting user points:', error);
      } else {
        console.log('User points reset to 0 (no history)');
      }
    } catch (error) {
      console.error('Error in resetUserPoints:', error);
    }
  };

  // Function to manually fetch AQI data
  const fetchAQIData = async (): Promise<void> => {
    if (!user) return;
    
    try {
      setFetchingData(true);
      
      // Check if geolocation is supported
      if (!navigator.geolocation) {
        toast({
          title: "Location Error",
          description: "Geolocation not supported by your browser",
          variant: "destructive",
        });
        return;
      }

      // Check if we have permission to access location
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
          if (permissionStatus.state === 'denied') {
            toast({
              title: "Location Access Denied",
              description: "Please enable location permissions in your browser settings to fetch air quality data.",
              variant: "destructive",
            });
            return;
          }
        } catch (error) {
          console.log('Permission API not supported, proceeding with geolocation request');
        }
      }

      console.log('HistoryView: Starting geolocation request for AQI data...');
      
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 30000,
          enableHighAccuracy: false,
          maximumAge: 10 * 60 * 1000
        });
      });

      console.log('HistoryView: Geolocation successful, coordinates:', position.coords.latitude, position.coords.longitude);
      const { latitude, longitude } = position.coords;
      
      // Call the Supabase function to get air quality data
      const { data: response, error } = await supabase.functions.invoke('get-air-quality', {
        body: { lat: latitude, lon: longitude }
      });

      if (error) {
        throw new Error(`Failed to fetch air quality data: ${error.message}`);
      }

      if (!response) {
        throw new Error('No air quality data received');
      }

      // Save the reading to the database
      const reading = {
        user_id: user.id,
        timestamp: new Date().toISOString(),
        location_name: response.location || 'Unknown Location',
        latitude: latitude,
        longitude: longitude,
        aqi: response.aqi,
        pm25: response.pollutants?.pm25 || null,
        pm10: response.pollutants?.pm10 || null,
        no2: response.pollutants?.no2 || null,
        so2: response.pollutants?.so2 || null,
        co: response.pollutants?.co || null,
        o3: response.pollutants?.o3 || null,
        temperature: response.environmental?.temperature || null,
        humidity: response.environmental?.humidity || null,
        data_source: response.dataSource || 'Manual Fetch',
        created_at: new Date().toISOString()
      };

      const { error: insertError } = await supabase
        .from('air_quality_readings')
        .insert(reading);

      if (insertError) {
        throw new Error(`Failed to save reading: ${insertError.message}`);
      }

      toast({
        title: "Success",
        description: "New air quality reading added to your history",
      });

      // Refresh the history to show the new reading
      await fetchHistory();
      
    } catch (error: any) {
      console.error('Error fetching AQI data:', error);
      
      // Provide better error messages for geolocation errors
      let errorMessage = 'Failed to fetch air quality data';
      
      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case 1:
            errorMessage = 'Location access denied. Please enable location permissions in your browser settings.';
            break;
          case 2:
            errorMessage = 'Location unavailable. This usually happens when location services are not ready. Please try again in a few moments.';
            break;
          case 3:
            errorMessage = 'Location timeout. Please wait a moment and try again.';
            break;
          default:
            errorMessage = 'Location error occurred. Please try again.';
        }
        
        // Log geolocation errors with more context
        console.log('HistoryView: Geolocation error occurred:', {
          code: error.code,
          message: error.message,
          timestamp: new Date().toISOString()
        });
      } else {
        // For non-geolocation errors, show the original error message
        errorMessage = error.message || 'Failed to fetch air quality data';
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setFetchingData(false);
    }
  };

  // Function to bulk delete selected entries
  const bulkDeleteSelected = async (): Promise<void> => {
    if (selectedEntries.size === 0) return;
    
    try {
      setBulkDeleting(true);
      
      const { error } = await supabase
        .from('air_quality_readings')
        .delete()
        .in('id', Array.from(selectedEntries));

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: `${selectedEntries.size} readings deleted successfully`,
      });

      setSelectedEntries(new Set());
      await fetchHistory();
    } catch (error: any) {
      console.error('Error bulk deleting entries:', error);
      toast({
        title: "Error",
        description: "Failed to delete selected readings",
        variant: "destructive",
      });
    } finally {
      setBulkDeleting(false);
    }
  };

  // Function to select/deselect all entries
  const selectAllEntries = (): void => {
    if (selectedEntries.size === history.length) {
      setSelectedEntries(new Set());
    } else {
      setSelectedEntries(new Set(history.map(entry => entry.id)));
    }
  };

  const deleteEntry = async (entryId: string): Promise<void> => {
    if (!user) return;
    
    try {
      const { error: deleteError } = await supabase
        .from('air_quality_readings')
        .delete()
        .eq('id', entryId)
        .eq('user_id', user.id);

      if (deleteError) {
        throw deleteError;
      }

      // Remove from local state
      setHistory(prev => prev.filter(entry => entry.id !== entryId));
      
      // Also remove from selected entries if it was selected
      setSelectedEntries(prev => {
        const newSet = new Set(prev);
        newSet.delete(entryId);
        return newSet;
      });
      
      toast({
        title: "Entry Deleted",
        description: "Air quality reading has been deleted successfully.",
        variant: "default",
      });
      
      // Force a refresh to ensure database is updated
      setTimeout(() => {
        fetchHistory();
      }, 500);
      
    } catch (error: any) {
      console.error('Error deleting entry:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to delete entry',
        variant: "destructive",
      });
    }
  };

  const toggleEntrySelection = (entryId: string) => {
    setSelectedEntries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

  const openEntryModal = (entry: HistoryEntry) => {
    setSelectedEntry(entry);
    setIsModalOpen(true);
  };

  const closeEntryModal = () => {
    setIsModalOpen(false);
    setSelectedEntry(null);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return date.toLocaleDateString();
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hours ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffMinutes = Math.ceil(diffTime / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} hours ago`;
    return formatDate(dateString);
  };

  // Calculate statistics
  const calculateStats = () => {
    if (history.length === 0) return { avgAQI: 0, totalReadings: 0, recentReadings: 0 };
    
    const recentReadings = history.filter(entry => {
      const entryDate = new Date(entry.timestamp);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return entryDate >= weekAgo;
    });
    
    const avgAQI = Math.round(
      history.slice(0, 7).reduce((sum, entry) => sum + entry.aqi, 0) / Math.min(history.length, 7)
    );
    
    return {
      avgAQI,
      totalReadings: history.length,
      recentReadings: recentReadings.length
    };
  };

  const stats = calculateStats();

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
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <Header
        title="Air Quality History"
        subtitle="Track your air quality exposure over time"
        showRefresh={true}
        onRefresh={() => {
          console.log('HistoryView: Refresh button clicked');
          fetchHistory();
        }}
        isRefreshing={loading}
        showMobileMenu={showMobileMenu}
        onMobileMenuToggle={onMobileMenuToggle}
      />

      {/* Action Buttons */}
      <div className="flex items-center gap-2 justify-end">
          {selectedEntries.size > 0 && (
            <Button
              onClick={bulkDeleteSelected}
              variant="destructive"
              size="sm"
              disabled={bulkDeleting}
              className="gap-2"
            >
              {bulkDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete Selected ({selectedEntries.size})
                </>
              )}
            </Button>
          )}
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={selectAllEntries}
            className="gap-2"
          >
            {selectedEntries.size === history.length ? 'Deselect All' : 'Select All'}
          </Button>
      </div>

      {/* Fetch AQI Data Button - Only shown after clearing history */}
      {showFetchButton && (
        <Card className="bg-gradient-card shadow-card border-0 border-2 border-primary/20">
          <CardContent className="p-6 text-center">
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <MapPin className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Start Collecting AQI Data</h3>
                <p className="text-sm text-muted-foreground">
                  Click the button below to fetch your first air quality reading and start building your history.
                </p>
              </div>
              <Button
                onClick={fetchAQIData}
                disabled={fetchingData}
                className="w-full max-w-xs"
                size="lg"
              >
                {fetchingData ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Fetching AQI Data...
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4 mr-2" />
                    Fetch AQI Data
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              7-Day Average
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className={`text-2xl font-bold ${getAQIColor(stats.avgAQI)}`}>
              {stats.avgAQI}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.avgAQI <= 50 ? 'Good air quality' : 'Moderate to poor air quality'}
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
            <div className="text-2xl font-bold text-primary">{stats.totalReadings}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalReadings === 1 ? 'record' : 'records'} total
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-primary">{stats.recentReadings}</div>
            <p className="text-xs text-muted-foreground">
              readings this week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* History List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Recent Readings {history.length > 0 && `(${history.length})`}
          </h2>
          {selectedEntries.size > 0 && (
            <div className="text-sm text-muted-foreground">
              {selectedEntries.size} of {history.length} selected
            </div>
          )}
        </div>
        
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
            <Card 
              key={entry.id} 
              className="bg-gradient-card shadow-card border-0 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] group"
              onClick={() => openEntryModal(entry)}
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Header with AQI and Location */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedEntries.has(entry.id)}
                        onCheckedChange={() => toggleEntrySelection(entry.id)}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="secondary"
                            className={`${getAQIBadgeColor(entry.aqi)} border-0 text-xs`}
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
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <div className="text-xs text-muted-foreground">
                        {formatRelativeTime(entry.timestamp)}
                      </div>
                      {entry.data_source && (
                        <Badge variant="outline" className="text-xs">
                          {entry.data_source}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEntryModal(entry);
                        }}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Reading</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this air quality reading. 
                              This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteEntry(entry.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete Reading
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {/* Pollutants Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {entry.pm25 && entry.pm25 > 0 && (
                      <div className="text-xs bg-muted/50 p-2 rounded">
                        <span className="font-medium">PM2.5:</span> {entry.pm25.toFixed(1)} µg/m³
                      </div>
                    )}
                    {entry.pm10 && entry.pm10 > 0 && (
                      <div className="text-xs bg-muted/50 p-2 rounded">
                        <span className="font-medium">PM10:</span> {entry.pm10.toFixed(1)} µg/m³
                      </div>
                    )}
                    {entry.pm1 && entry.pm1 > 0 && (
                      <div className="text-xs bg-muted/50 p-2 rounded">
                        <span className="font-medium">PM1:</span> {entry.pm1.toFixed(1)} µg/m³
                      </div>
                    )}
                    {entry.no2 && entry.no2 > 0 && (
                      <div className="text-xs bg-muted/50 p-2 rounded">
                        <span className="font-medium">NO₂:</span> {entry.no2.toFixed(1)} µg/m³
                      </div>
                    )}
                    {entry.so2 && entry.so2 > 0 && (
                      <div className="text-xs bg-muted/50 p-2 rounded">
                        <span className="font-medium">SO₂:</span> {entry.so2.toFixed(1)} µg/m³
                      </div>
                    )}
                    {entry.co && entry.co > 0 && (
                      <div className="text-xs bg-muted/50 p-2 rounded">
                        <span className="font-medium">CO:</span> {entry.co.toFixed(1)} mg/m³
                      </div>
                    )}
                    {entry.o3 && entry.o3 > 0 && (
                      <div className="text-xs bg-muted/50 p-2 rounded">
                        <span className="font-medium">O₃:</span> {entry.o3.toFixed(1)} µg/m³
                      </div>
                    )}
                  </div>

                  {/* Environmental Data */}
                  {(entry.temperature || entry.humidity) && (
                    <div className="flex items-center gap-4 pt-2 border-t border-border/50">
                      {entry.temperature && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Thermometer className="h-3 w-3" />
                          <span>{entry.temperature}°C</span>
                        </div>
                      )}
                      {entry.humidity && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Droplets className="h-3 w-3" />
                          <span>{entry.humidity}%</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Click hint */}
                  <div className="flex items-center justify-center pt-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground opacity-60 group-hover:opacity-100 transition-opacity">
                      <Eye className="h-3 w-3" />
                      <span>Click to view details</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* History Detail Modal */}
      <HistoryDetailModal
        entry={selectedEntry}
        isOpen={isModalOpen}
        onClose={closeEntryModal}
      />
    </div>
  </div>
  );
}