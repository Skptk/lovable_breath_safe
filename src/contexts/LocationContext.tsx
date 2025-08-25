import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

interface LocationContextType {
  hasUserConsent: boolean;
  hasRequestedPermission: boolean;
  isRequestingPermission: boolean;
  locationPermission: 'granted' | 'denied' | 'prompt' | 'unknown';
  requestLocationPermission: () => Promise<boolean>;
  resetLocationPermission: () => void;
  getCurrentLocation: () => Promise<GeolocationPosition>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

interface LocationProviderProps {
  children: React.ReactNode;
}

export function LocationProvider({ children }: LocationProviderProps) {
  const [hasUserConsent, setHasUserConsent] = useState(false);
  const [hasRequestedPermission, setHasRequestedPermission] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  
  // Use refs to prevent multiple permission checks
  const permissionCheckedRef = useRef(false);
  const permissionCheckInProgressRef = useRef(false);

  // Check location permission on mount
  useEffect(() => {
    // Prevent multiple permission checks
    if (permissionCheckedRef.current || permissionCheckInProgressRef.current) {
      return;
    }
    
    permissionCheckInProgressRef.current = true;
    console.log('📍 Starting location permission check...');
    
    const checkLocationPermission = async () => {
      try {
        // Check if we have stored permission
        const storedPermission = localStorage.getItem('breath-safe-location-permission');
        
        if (storedPermission === 'granted') {
          // Check if browser still has permission
          if (navigator.permissions && navigator.permissions.query) {
            try {
              const permissionStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
              setLocationPermission(permissionStatus.state);
              
              if (permissionStatus.state === 'granted') {
                setHasUserConsent(true);
                setHasRequestedPermission(true);
                permissionCheckedRef.current = true;
                console.log('📍 Permission check completed - user has consent');
                return;
              } else if (permissionStatus.state === 'denied') {
                setHasUserConsent(false);
                setHasRequestedPermission(true);
                localStorage.removeItem('breath-safe-location-permission');
                permissionCheckedRef.current = true;
                console.log('📍 Permission check completed - user denied consent');
                return;
              }
            } catch (error) {
              console.log('📍 Permission API not supported, using stored permission');
            }
          }
          
          // If permission API not supported, trust stored permission
          setHasUserConsent(true);
          setHasRequestedPermission(true);
          setLocationPermission('granted');
          permissionCheckedRef.current = true;
          console.log('📍 Permission check completed - using stored permission');
        } else if (storedPermission === 'denied') {
          setHasUserConsent(false);
          setHasRequestedPermission(true);
          setLocationPermission('denied');
          permissionCheckedRef.current = true;
          console.log('📍 Permission check completed - stored permission denied');
        } else {
          // No stored permission, mark as checked but not consented
          setHasUserConsent(false);
          setHasRequestedPermission(true);
          setLocationPermission('prompt');
          permissionCheckedRef.current = true;
          console.log('📍 Permission check completed - no stored permission');
        }
      } catch (error) {
        console.error('📍 Error during permission check:', error);
        // Mark as checked even if there was an error
        setHasUserConsent(false);
        setHasRequestedPermission(true);
        setLocationPermission('unknown');
        permissionCheckedRef.current = true;
      } finally {
        permissionCheckInProgressRef.current = false;
      }
    };

    checkLocationPermission();
  }, []);

  // Function to request location permission
  const requestLocationPermission = useCallback(async (): Promise<boolean> => {
    if (!navigator.geolocation) {
      console.log('📍 Geolocation not supported by browser');
      return false;
    }

    // Prevent multiple simultaneous permission requests
    if (isRequestingPermission) {
      console.log('📍 Location permission request already in progress, skipping duplicate request');
      return false;
    }

    try {
      setIsRequestingPermission(true);
      console.log('📍 Starting location permission request...');
      
      // Request location permission
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 30000,
          enableHighAccuracy: false,
          maximumAge: 10 * 60 * 1000
        });
      });

      if (position) {
        console.log('📍 Location permission granted successfully');
        setHasUserConsent(true);
        setLocationPermission('granted');
        // Store permission in localStorage
        localStorage.setItem('breath-safe-location-permission', 'granted');
        return true;
      }
      return false;
    } catch (error) {
      // Handle specific error types, reduce console noise
      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case 1: // PERMISSION_DENIED
            console.log('📍 Location permission denied by user');
            setLocationPermission('denied');
            localStorage.setItem('breath-safe-location-permission', 'denied');
            break;
          case 2: // POSITION_UNAVAILABLE
            console.log('📍 Location position unavailable');
            setLocationPermission('prompt');
            break;
          case 3: // TIMEOUT
            console.log('📍 Location request timed out');
            setLocationPermission('prompt');
            break;
          default:
            console.log('📍 Location permission error:', error.message);
        }
      } else {
        console.log('📍 Location permission request failed:', error);
      }
      
      return false;
    } finally {
      setIsRequestingPermission(false);
    }
  }, [isRequestingPermission]);

  // Function to get current location (only if permission granted)
  const getCurrentLocation = useCallback(async (): Promise<GeolocationPosition> => {
    if (!hasUserConsent) {
      throw new Error('Location access not yet granted. Please request permission first.');
    }

    if (!navigator.geolocation) {
      throw new Error('Geolocation not supported by your browser');
    }

    return new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 30000,
        enableHighAccuracy: false,
        maximumAge: 10 * 60 * 1000
      });
    });
  }, [hasUserConsent]);

  // Function to reset location permission
  const resetLocationPermission = useCallback(() => {
    console.log('📍 Resetting location permission...');
    localStorage.removeItem('breath-safe-location-permission');
    setHasUserConsent(false);
    setHasRequestedPermission(false);
    setLocationPermission('unknown');
    permissionCheckedRef.current = false;
    permissionCheckInProgressRef.current = false;
  }, []);

  const value: LocationContextType = {
    hasUserConsent,
    hasRequestedPermission,
    isRequestingPermission,
    locationPermission,
    requestLocationPermission,
    resetLocationPermission,
    getCurrentLocation
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation(): LocationContextType {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
