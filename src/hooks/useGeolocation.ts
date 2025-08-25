import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';

export interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  source: 'gps' | 'ip-based' | 'default-fallback';
  accuracy?: number;
  timestamp: number;
}

export interface GeolocationState {
  locationData: LocationData | null;
  hasUserConsent: boolean;
  isRequesting: boolean;
  error: string | null;
  permissionStatus: 'granted' | 'denied' | 'prompt' | 'unknown';
}

export interface GeolocationActions {
  requestLocation: () => Promise<LocationData | null>;
  getIPBasedLocationAsync: () => Promise<LocationData | null>;
  clearLocation: () => void;
  checkPermissionStatus: () => Promise<'granted' | 'denied' | 'prompt' | 'unknown'>;
}

export type UseGeolocationReturn = GeolocationState & GeolocationActions;

// IP-based location service (ipapi.co) with enhanced error handling
const getIPBasedLocation = async (): Promise<LocationData> => {
  try {
    console.log('🌍 [Geolocation] Fetching IP-based location...');
    
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch('https://ipapi.co/json/', {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'BreathSafe/1.0'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`IP location service responded with ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.latitude || !data.longitude) {
      throw new Error('Invalid location data from IP service');
    }
    
    const locationData: LocationData = {
      latitude: data.latitude,
      longitude: data.longitude,
      city: data.city || 'Unknown City',
      country: data.country_name || 'Unknown Country',
      source: 'ip-based',
      timestamp: Date.now()
    };
    
    console.log('🌍 [Geolocation] IP-based location obtained:', locationData);
    
    // Store for future use
    localStorage.setItem('ipBasedLocation', JSON.stringify(locationData));
    
    return locationData;
  } catch (error: any) {
    // Handle specific error types
    if (error.name === 'AbortError') {
      console.warn('🌍 [Geolocation] IP location request timed out');
    } else if (error.message?.includes('CSP')) {
      console.warn('🌍 [Geolocation] IP location blocked by CSP, using fallback');
    } else {
      console.warn('🌍 [Geolocation] IP-based location failed:', error);
    }
    
    // Return default fallback location (Nairobi, Kenya)
    const fallbackLocation: LocationData = {
      latitude: -1.2921,
      longitude: 36.8219,
      city: 'Nairobi',
      country: 'Kenya',
      source: 'default-fallback',
      timestamp: Date.now()
    };
    
    console.log('🌍 [Geolocation] Using default fallback location:', fallbackLocation);
    return fallbackLocation;
  }
};

// Check if we have stored location data
const getStoredLocation = (): LocationData | null => {
  try {
    // Check for GPS location first
    const gpsLocation = localStorage.getItem('gpsLocation');
    if (gpsLocation) {
      const location = JSON.parse(gpsLocation);
      // Check if GPS location is still valid (within 1 hour)
      if (Date.now() - location.timestamp < 3600000) {
        console.log('🌍 [Geolocation] Using stored GPS location:', location);
        return location;
      }
    }
    
    // Check for IP-based location
    const ipLocation = localStorage.getItem('ipBasedLocation');
    if (ipLocation) {
      const location = JSON.parse(ipLocation);
      // Check if IP location is still valid (within 24 hours)
      if (Date.now() - location.timestamp < 86400000) {
        console.log('🌍 [Geolocation] Using stored IP-based location:', location);
        return location;
      }
    }
    
    return null;
  } catch (error) {
    console.warn('🌍 [Geolocation] Failed to parse stored location:', error);
    return null;
  }
};

export const useGeolocation = (): UseGeolocationReturn => {
  const { toast } = useToast();
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [hasUserConsent, setHasUserConsent] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  
  const isRequestingRef = useRef(false);
  const hasInitializedRef = useRef(false);

  // Check permission status
  const checkPermissionStatus = useCallback(async (): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> => {
    try {
      if (navigator.permissions) {
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        const status = permissionStatus.state as 'granted' | 'denied' | 'prompt';
        
        console.log('🌍 [Geolocation] Permission status:', status);
        
        // Listen for permission changes
        permissionStatus.onchange = () => {
          const newStatus = permissionStatus.state as 'granted' | 'denied' | 'prompt';
          console.log('🌍 [Geolocation] Permission status changed to:', newStatus);
          setPermissionStatus(newStatus);
          
          if (newStatus === 'denied') {
            setHasUserConsent(false);
            // Note: IP-based location will be handled by the component using this hook
          }
        };
        
        return status;
      } else {
        console.log('🌍 [Geolocation] Permissions API not supported');
        return 'unknown';
      }
    } catch (error) {
      console.warn('🌍 [Geolocation] Failed to check permission status:', error);
      return 'unknown';
    }
  }, []);

  // Initialize with stored location or IP-based location
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const initializeLocation = async () => {
      try {
        // Check permission status first
        const status = await checkPermissionStatus();
        setPermissionStatus(status);
        
        // If permission is granted, try to use stored GPS location
        if (status === 'granted') {
          const storedLocation = getStoredLocation();
          if (storedLocation && storedLocation.source === 'gps') {
            setLocationData(storedLocation);
            setHasUserConsent(true);
            console.log('🌍 [Geolocation] Initialized with stored GPS location');
            return;
          }
        }
        
        // If no GPS location available, try IP-based location
        console.log('🌍 [Geolocation] No GPS location available, trying IP-based location...');
        const ipLocation = await getIPBasedLocation();
        setLocationData(ipLocation);
        setHasUserConsent(false);
        
      } catch (error) {
        console.warn('🌍 [Geolocation] Failed to initialize location:', error);
        // Use default fallback
        const fallbackLocation: LocationData = {
          latitude: -1.2921,
          longitude: 36.8219,
          city: 'Nairobi',
          country: 'Kenya',
          source: 'default-fallback',
          timestamp: Date.now()
        };
        setLocationData(fallbackLocation);
        setHasUserConsent(false);
      }
    };

    initializeLocation();
  }, [checkPermissionStatus]);

  // Request GPS location (only call this from user interactions)
  const requestLocation = useCallback(async (): Promise<LocationData | null> => {
    if (isRequestingRef.current) {
      console.log('🌍 [Geolocation] Location request already in progress');
      return locationData;
    }

    if (!navigator.geolocation) {
      const errorMsg = 'Geolocation is not supported by this browser';
      setError(errorMsg);
      toast({
        title: "Location Not Supported",
        description: errorMsg,
        variant: "destructive",
      });
      return locationData;
    }

    try {
      isRequestingRef.current = true;
      setIsRequesting(true);
      setError(null);
      
      console.log('🌍 [Geolocation] Requesting GPS location...');
      
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          (error) => {
            let errorMessage = 'Unknown geolocation error';
            
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = 'Location permission denied by user';
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage = 'Location information unavailable';
                break;
              case error.TIMEOUT:
                errorMessage = 'Location request timed out';
                break;
              default:
                errorMessage = `Geolocation error: ${error.message}`;
            }
            
            reject(new Error(errorMessage));
          },
          {
            timeout: 15000,
            enableHighAccuracy: false,
            maximumAge: 300000 // 5 minutes
          }
        );
      });

      const newLocationData: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        source: 'gps',
        timestamp: Date.now()
      };

      // Store GPS location
      localStorage.setItem('gpsLocation', JSON.stringify(newLocationData));
      
      setLocationData(newLocationData);
      setHasUserConsent(true);
      setPermissionStatus('granted');
      
      console.log('🌍 [Geolocation] GPS location obtained successfully:', newLocationData);
      
      toast({
        title: "Location Access Granted",
        description: "GPS location obtained successfully. Air quality data will now be fetched for your exact location.",
        variant: "default",
      });

      return newLocationData;

    } catch (error: any) {
      console.error('🌍 [Geolocation] GPS location request failed:', error);
      
      let errorMessage = 'Failed to get location permission';
      if (error.message.includes('permission denied')) {
        errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
        setPermissionStatus('denied');
      } else if (error.message.includes('unavailable')) {
        errorMessage = 'Location services unavailable. Please check your device settings.';
      } else if (error.message.includes('timed out')) {
        errorMessage = 'Location request timed out. Please try again.';
      }
      
      setError(errorMessage);
      
      toast({
        title: "Location Access Failed",
        description: errorMessage,
        variant: "destructive",
      });

      // Fall back to IP-based location
      console.log('🌍 [Geolocation] Falling back to IP-based location...');
      const ipLocation = await getIPBasedLocation();
      setLocationData(ipLocation);
      setHasUserConsent(false);
      return ipLocation;

    } finally {
      isRequestingRef.current = false;
      setIsRequesting(false);
    }
  }, [toast]);

  // Use IP-based location as fallback
  const getIPBasedLocationAsync = useCallback(async (): Promise<LocationData | null> => {
    try {
      console.log('🌍 [Geolocation] Switching to IP-based location...');
      const ipLocation = await getIPBasedLocation();
      
      setLocationData(ipLocation);
      setHasUserConsent(false);
      setError(null);
      
      toast({
        title: "Using IP-Based Location",
        description: "GPS location unavailable. Using approximate location based on your IP address.",
        variant: "default",
      });

      return ipLocation;
    } catch (error) {
      console.error('🌍 [Geolocation] IP-based location failed:', error);
      setError('Failed to get IP-based location');
      return locationData;
    }
  }, [toast]);

  // Clear stored location data
  const clearLocation = useCallback(() => {
    localStorage.removeItem('gpsLocation');
    localStorage.removeItem('ipBasedLocation');
    setLocationData(null);
    setHasUserConsent(false);
    setError(null);
    console.log('🌍 [Geolocation] Location data cleared');
  }, []);

  return {
    locationData,
    hasUserConsent,
    isRequesting,
    error,
    permissionStatus,
    requestLocation,
    getIPBasedLocationAsync,
    clearLocation,
    checkPermissionStatus,
  };
};
