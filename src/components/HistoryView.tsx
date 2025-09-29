import { useState, useEffect, useMemo, useCallback } from "react";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, MapPin, TrendingUp, Loader2, AlertTriangle, Thermometer, Droplets, Clock, Trash2, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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

const PAGE_SIZE = 25;

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

type RawHistoryRow = {
  id: string;
  created_at: string;
  timestamp?: string | null;
  location_name?: string | null;
  aqi: number;
  pm25?: number | null;
  pm10?: number | null;
  pm1?: number | null;
  no2?: number | null;
  so2?: number | null;
  co?: number | null;
  o3?: number | null;
  temperature?: number | null;
  humidity?: number | null;
  pm003?: number | null;
  data_source?: string | null;
  latitude: number;
  longitude: number;
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
  [key: string]: unknown;
};

const safeNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const transformHistoryRow = (entry: RawHistoryRow): HistoryEntry => {
  const locationName =
    typeof entry.location_name === "string" && entry.location_name.trim().length > 0
      ? entry.location_name
      : "Unknown Location";

  return {
    id: entry.id,
    created_at: entry.created_at,
    timestamp: entry.timestamp ?? entry.created_at,
    location_name: locationName,
    aqi: entry.aqi,
    pm25: safeNumber(entry.pm25),
    pm10: safeNumber(entry.pm10),
    pm1: safeNumber(entry.pm1 ?? (entry as any).pm_1),
    no2: safeNumber(entry.no2),
    so2: safeNumber(entry.so2),
    co: safeNumber(entry.co),
    o3: safeNumber(entry.o3),
    temperature: safeNumber(entry.temperature),
    humidity: safeNumber(entry.humidity),
    pm003: safeNumber(entry.pm003 ?? (entry as any).pm_003),
    data_source: typeof entry.data_source === "string" ? entry.data_source : null,
    latitude: entry.latitude,
    longitude: entry.longitude,
    wind_speed: safeNumber(entry.wind_speed),
    wind_direction: safeNumber(entry.wind_direction),
    wind_gust: safeNumber(entry.wind_gust),
    air_pressure: safeNumber(entry.air_pressure),
    rain_probability: safeNumber(entry.rain_probability),
    uv_index: safeNumber(entry.uv_index),
    visibility: safeNumber(entry.visibility),
    weather_condition:
      typeof entry.weather_condition === "string" ? entry.weather_condition : null,
    feels_like_temperature: safeNumber(entry.feels_like_temperature),
    sunrise_time: entry.sunrise_time ?? null,
    sunset_time: entry.sunset_time ?? null,
  };
};

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
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showFetchButton, setShowFetchButton] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchHistory = useCallback(async (pageIndex: number = 0): Promise<HistoryEntry[]> => {
    if (!user?.id) {
      return [];
    }

    const from = pageIndex * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error: fetchError } = await supabase
      .from('air_quality_readings')
      .select('*')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false })
      .range(from, to);

    if (fetchError) {
      throw fetchError;
    }

    const rawData = (data ?? []) as RawHistoryRow[];
    return rawData.map(transformHistoryRow);
  }, [user?.id]);

  const resetUserPoints = useCallback(async (): Promise<void> => {
    if (!user?.id) return;
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
  }, [user?.id]);

  const refreshHistory = useCallback(async () => {
    if (!user?.id) {
      setHistory([]);
      setPage(0);
      setHasMore(false);
      setShowFetchButton(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const firstPage = await fetchHistory(0);
      setHistory(firstPage);
      setPage(0);
      setHasMore(firstPage.length === PAGE_SIZE);
      setShowFetchButton(firstPage.length === 0);

      if (firstPage.length === 0) {
        await resetUserPoints();
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      const message = error instanceof Error ? error.message : 'Failed to fetch history';
      setError(message);
      toast({
        title: "Error",
        description: "Failed to load air quality history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  }, [fetchHistory, resetUserPoints, toast, user?.id]);

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore) {
      return;
    }

    const nextPage = page + 1;
    setIsLoadingMore(true);

    try {
      const nextEntries = await fetchHistory(nextPage);
      if (nextEntries.length === 0) {
        setHasMore(false);
        return;
      }

      setHistory((prev) => [...prev, ...nextEntries]);
      setPage(nextPage);
      setHasMore(nextEntries.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error loading more history:', error);
      toast({
        title: "Error",
        description: "Failed to load more history",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMore(false);
    }
  }, [fetchHistory, hasMore, isLoadingMore, page, toast]);

  useEffect(() => {
    if (!user?.id) {
      setHistory([]);
      setLoading(false);
      setShowFetchButton(false);
      setHasMore(false);
      return;
    }

    void refreshHistory();
  }, [refreshHistory, user?.id]);

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
      const { data: response, error } = await supabase.functions.invoke('fetchAQI', {
        body: { lat: latitude, lon: longitude }
      });

      if (error) {
        throw new Error(`Failed to fetch air quality data: ${error.message}`);
      }

      if (!response || response.error) {
        throw new Error(response?.message || 'No air quality data received');
      }

      const stationLat = response.stationLat ?? latitude;
      const stationLon = response.stationLon ?? longitude;
      const locationLabel = response.location ?? response.city ?? 'Unknown Location';
      const recordedAt = response.timestamp ?? new Date().toISOString();

      // Save the reading to the database with scheduled-aligned fields
      const reading = {
        user_id: user.id,
        timestamp: recordedAt,
        location_name: locationLabel,
        latitude: stationLat,
        longitude: stationLon,
        aqi: response.aqi ?? 0,
        pm25: response.pollutants?.pm25 ?? null,
        pm10: response.pollutants?.pm10 ?? null,
        no2: response.pollutants?.no2 ?? null,
        so2: response.pollutants?.so2 ?? null,
        co: response.pollutants?.co ?? null,
        o3: response.pollutants?.o3 ?? null,
        temperature: response.environmental?.temperature ?? null,
        humidity: response.environmental?.humidity ?? null,
        data_source: response.dataSource ?? 'AQICN (Scheduled)',
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
      await refreshHistory();
      
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
    
    if (!user) {
      console.error('Bulk delete: No user authenticated');
      toast({
        title: "Authentication Error",
        description: "You must be logged in to delete entries",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setBulkDeleting(true);
      console.log(`ðŸ—‘ï¸ [Bulk Delete] Attempting to delete ${selectedEntries.size} entries for user ${user.id}`);
      
      // First, verify all entries belong to the user
      const { data: entriesToDelete, error: fetchError } = await supabase
        .from('air_quality_readings')
        .select('id, aqi, location_name, timestamp')
        .in('id', Array.from(selectedEntries))
        .eq('user_id', user.id);

      if (fetchError) {
        console.error('Bulk delete: Error fetching entries for verification:', fetchError);
        throw new Error(`Failed to verify entries: ${fetchError.message}`);
      }

      if (!entriesToDelete || entriesToDelete.length === 0) {
        console.error('Bulk delete: No entries found or none belong to user');
        throw new Error('No entries found or you do not have permission to delete them');
      }

      const verifiedEntryIds = entriesToDelete.map(entry => entry.id);
      const unverifiedCount = selectedEntries.size - verifiedEntryIds.length;
      
      if (unverifiedCount > 0) {
        console.warn(`Bulk delete: ${unverifiedCount} entries could not be verified and will be skipped`);
      }

      console.log(`ðŸ—‘ï¸ [Bulk Delete] Verified ${verifiedEntryIds.length} entries for deletion`);

      // Delete the verified entries
      const { error: deleteError, count } = await supabase
        .from('air_quality_readings')
        .delete()
        .in('id', verifiedEntryIds)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('Bulk delete: Database delete error:', deleteError);
        throw new Error(`Database error: ${deleteError.message}`);
      }

      if (count === 0) {
        console.error('Bulk delete: No entries were deleted');
        throw new Error('No entries were deleted. They may have already been removed.');
      }

      console.log(`âœ… [Bulk Delete] Successfully deleted ${count} entries`);

      // Show success message with actual count
      const successMessage = count === selectedEntries.size 
        ? `${count} readings deleted successfully`
        : `${count} of ${selectedEntries.size} readings deleted successfully`;

      toast({
        title: "Success",
        description: successMessage,
        variant: "default",
      });

      // Clear selection and refresh history
      setSelectedEntries(new Set());
      
      // Force a refresh to ensure database is updated and points are recalculated
      console.log(' [Bulk Delete] Refreshing history after bulk deletion');
      await refreshHistory();
      
    } catch (error: any) {
      console.error('âŒ [Bulk Delete] Error bulk deleting entries:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to delete selected readings';
      let errorTitle = 'Error';
      
      if (error.message?.includes('permission')) {
        errorTitle = 'Permission Denied';
        errorMessage = 'You do not have permission to delete some of these entries. Please contact support if this persists.';
      } else if (error.message?.includes('not found')) {
        errorTitle = 'Entries Not Found';
        errorMessage = 'Some of the entries you are trying to delete could not be found. They may have already been removed.';
      } else if (error.message?.includes('Database error')) {
        errorTitle = 'Database Error';
        errorMessage = 'A database error occurred. Please try again or contact support if the problem persists.';
      } else {
        errorMessage = error.message || 'An unexpected error occurred while deleting the entries';
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
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
    if (!user) {
      console.error('Delete entry: No user authenticated');
      toast({
        title: "Authentication Error",
        description: "You must be logged in to delete entries",
        variant: "destructive",
      });
      return;
    }
    
    try {
      console.log(`ðŸ—‘ï¸ [Delete] Attempting to delete entry ${entryId} for user ${user.id}`);
      
      // First, verify the entry exists and belongs to the user
      const { data: existingEntry, error: fetchError } = await supabase
        .from('air_quality_readings')
        .select('id, aqi, location_name, timestamp')
        .eq('id', entryId)
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        console.error('Delete entry: Error fetching entry for verification:', fetchError);
        throw new Error(`Entry not found or access denied: ${fetchError.message}`);
      }

      if (!existingEntry) {
        console.error('Delete entry: Entry not found or does not belong to user');
        throw new Error('Entry not found or you do not have permission to delete it');
      }

      console.log(`ðŸ—‘ï¸ [Delete] Entry verified: AQI ${existingEntry.aqi} at ${existingEntry.location_name}`);

      // Attempt to delete the entry
      const { error: deleteError, count } = await supabase
        .from('air_quality_readings')
        .delete()
        .eq('id', entryId)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('Delete entry: Database delete error:', deleteError);
        throw new Error(`Database error: ${deleteError.message}`);
      }

      if (count === 0) {
        console.error('Delete entry: No rows were deleted');
        throw new Error('No entries were deleted. The entry may have already been removed.');
      }

      console.log(`âœ… [Delete] Successfully deleted entry ${entryId}`);

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
      
      // Force a refresh to ensure database is updated and points are recalculated
      await refreshHistory();
      
    } catch (error: any) {
      console.error('âŒ [Delete] Error deleting entry:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to delete entry';
      let errorTitle = 'Error';
      
      if (error.message?.includes('permission')) {
        errorTitle = 'Permission Denied';
        errorMessage = 'You do not have permission to delete this entry. Please contact support if this persists.';
      } else if (error.message?.includes('not found')) {
        errorTitle = 'Entry Not Found';
        errorMessage = 'The entry you are trying to delete could not be found. It may have already been removed.';
      } else if (error.message?.includes('Database error')) {
        errorTitle = 'Database Error';
        errorMessage = 'A database error occurred. Please try again or contact support if the problem persists.';
      } else {
        errorMessage = error.message || 'An unexpected error occurred while deleting the entry';
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
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
      <div className="page-container">
        <div className="page-content flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading air quality history...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="page-container">
        <div className="page-content flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold">Failed to load history</h2>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => void refreshHistory()} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show empty state
  if (!user) {
    return (
      <div className="page-container">
        <div className="page-content flex items-center justify-center">
          <div className="text-center space-y-4">
            <h2 className="text-xl font-semibold">Authentication Required</h2>
            <p className="text-muted-foreground">Please sign in to view your air quality history.</p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="page-container">
      <div className="page-content space-y-4 md:space-y-6 w-full max-w-full overflow-x-hidden px-4 md:px-6">
      {/* Header */}
      <Header
        title="Air Quality History"
        subtitle="Track your air quality exposure over time"
        showRefresh={true}
        onRefresh={refreshHistory}
        isRefreshing={loading}
        showMobileMenu={showMobileMenu}
        onMobileMenuToggle={onMobileMenuToggle}
      />
      
      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 justify-end w-full max-w-full overflow-hidden">
          {selectedEntries.size > 0 && (
            <Button
              onClick={bulkDeleteSelected}
              variant="destructive"
              size="sm"
              disabled={bulkDeleting}
              className="gap-2 w-full sm:w-auto"
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
            className="gap-2 w-full sm:w-auto"
          >
            {selectedEntries.size === history.length ? 'Deselect All' : 'Select All'}
          </Button>
      </div>

      {/* Fetch AQI Data Button - Only shown after clearing history */}
      {showFetchButton && (
        <GlassCard variant="elevated" className="border-2 border-primary/20 w-full max-w-full overflow-hidden">
          <GlassCardContent className="p-4 md:p-6 text-center">
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
          </GlassCardContent>
        </GlassCard>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-full overflow-hidden">
        <GlassCard variant="subtle" className="w-full max-w-full overflow-hidden">
          <GlassCardHeader className="pb-2">
            <GlassCardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              7-Day Average
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent className="pt-0">
            <div className={`text-2xl font-bold ${getAQIColor(stats.avgAQI)}`}>
              {stats.avgAQI}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.avgAQI <= 50 ? 'Good air quality' : 'Moderate to poor air quality'}
            </p>
          </GlassCardContent>
        </GlassCard>

        <GlassCard variant="subtle" className="w-full max-w-full overflow-hidden">
          <GlassCardHeader className="pb-2">
            <GlassCardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Total Records
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent className="pt-0">
            <div className="text-2xl font-bold text-primary">{stats.totalReadings}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalReadings === 1 ? 'record' : 'records'} total
            </p>
          </GlassCardContent>
        </GlassCard>

        <GlassCard variant="subtle" className="w-full max-w-full overflow-hidden sm:col-span-2 md:col-span-1">
          <GlassCardHeader className="pb-2">
            <GlassCardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              This Week
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent className="pt-0">
            <div className="text-2xl font-bold text-primary">{stats.recentReadings}</div>
            <p className="text-xs text-muted-foreground">
              readings this week
            </p>
          </GlassCardContent>
        </GlassCard>
      </div>

      {/* History List */}
      <div className="space-y-3 w-full max-w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 w-full max-w-full overflow-hidden">
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
          <GlassCard variant="elevated" className="bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 w-full max-w-full overflow-hidden">
            <GlassCardContent className="p-6 md:p-8 text-center">
              <div className="space-y-2">
                <MapPin className="h-12 w-12 mx-auto text-muted-foreground" />
                <h3 className="text-lg font-semibold">No History Yet</h3>
                <p className="text-sm text-muted-foreground">
                  Start tracking air quality to see your history here.
                </p>
              </div>
            </GlassCardContent>
          </GlassCard>
        ) : (
          history.map((entry) => (
            <GlassCard 
              key={entry.id} 
              variant="default"
              className="cursor-pointer hover:scale-[1.02] group w-full max-w-full overflow-hidden"
              onClick={() => openEntryModal(entry)}
            >
              <GlassCardContent className="p-3 md:p-4 w-full max-w-full overflow-hidden">
                <div className="space-y-3 w-full max-w-full overflow-hidden">
                  {/* Header with AQI and Location */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full max-w-full overflow-hidden">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <Checkbox
                        checked={selectedEntries.has(entry.id)}
                        onCheckedChange={() => toggleEntrySelection(entry.id)}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary flex-shrink-0 mt-1"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="space-y-1 min-w-0 flex-1 overflow-hidden">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0 overflow-hidden">
                          <Badge 
                            variant="secondary"
                            className={`${getAQIBadgeColor(entry.aqi)} border-0 text-xs flex-shrink-0`}
                          >
                            AQI {entry.aqi}
                          </Badge>
                          <span className="text-sm text-muted-foreground truncate">
                            {getAQILabel(entry.aqi)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0 overflow-hidden">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{entry.location_name || 'Unknown Location'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0 overflow-hidden">
                      <div className="text-xs text-muted-foreground truncate">
                        {formatRelativeTime(entry.timestamp)}
                      </div>
                      {entry.data_source && (
                        <Badge variant="outline" className="text-xs max-w-32 truncate">
                          {entry.data_source}
                        </Badge>
                      )}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 flex-shrink-0"
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
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
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
                  </div>

                  {/* Pollutants Grid - Mobile Responsive */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-full overflow-hidden">
                    {entry.pm25 && entry.pm25 > 0 && (
                      <div className="text-xs bg-muted/50 p-2 rounded min-w-0 overflow-hidden">
                        <span className="font-medium">PM2.5:</span> <span className="truncate">{entry.pm25.toFixed(1)} Âµg/mÂ³</span>
                      </div>
                    )}
                    {entry.pm10 && entry.pm10 > 0 && (
                      <div className="text-xs bg-muted/50 p-2 rounded min-w-0 overflow-hidden">
                        <span className="font-medium">PM10:</span> <span className="truncate">{entry.pm10.toFixed(1)} Âµg/mÂ³</span>
                      </div>
                    )}
                    {entry.pm1 && entry.pm1 > 0 && (
                      <div className="text-xs bg-muted/50 p-2 rounded min-w-0 overflow-hidden">
                        <span className="font-medium">PM1:</span> <span className="truncate">{entry.pm1.toFixed(1)} Âµg/mÂ³</span>
                      </div>
                    )}
                    {entry.no2 && entry.no2 > 0 && (
                      <div className="text-xs bg-muted/50 p-2 rounded min-w-0 overflow-hidden">
                        <span className="font-medium">NOâ‚‚:</span> <span className="truncate">{entry.no2.toFixed(1)} Âµg/mÂ³</span>
                      </div>
                    )}
                    {entry.so2 && entry.so2 > 0 && (
                      <div className="text-xs bg-muted/50 p-2 rounded min-w-0 overflow-hidden">
                        <span className="font-medium">SOâ‚‚:</span> <span className="truncate">{entry.so2.toFixed(1)} Âµg/mÂ³</span>
                      </div>
                    )}
                    {entry.co && entry.co > 0 && (
                      <div className="text-xs bg-muted/50 p-2 rounded min-w-0 overflow-hidden">
                        <span className="font-medium">CO:</span> <span className="truncate">{entry.co.toFixed(1)} mg/mÂ³</span>
                      </div>
                    )}
                    {entry.o3 && entry.o3 > 0 && (
                      <div className="text-xs bg-muted/50 p-2 rounded min-w-0 overflow-hidden">
                        <span className="font-medium">Oâ‚ƒ:</span> <span className="truncate">{entry.o3.toFixed(1)} Âµg/mÂ³</span>
                      </div>
                    )}
                  </div>

                  {/* Environmental Data */}
                  {(entry.temperature || entry.humidity) && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2 border-t border-border/50 w-full max-w-full overflow-hidden">
                      {entry.temperature && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Thermometer className="h-3 w-3 flex-shrink-0" />
                          <span>{entry.temperature}Â°C</span>
                        </div>
                      )}
                      {entry.humidity && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Droplets className="h-3 w-3 flex-shrink-0" />
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
              </GlassCardContent>
            </GlassCard>
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










