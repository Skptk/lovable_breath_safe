import React, { useState } from 'react';
import { MapPin, MapPinOff, X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface LocationPermissionBannerProps {
  onLocationRequest: () => Promise<void>;
  onSkip: () => void;
  permissionStatus: 'granted' | 'denied' | 'prompt' | 'unknown';
  locationSource?: 'gps' | 'ip-based' | 'default-fallback';
  city?: string;
  country?: string;
}

export default function LocationPermissionBanner({
  onLocationRequest,
  onSkip,
  permissionStatus,
  locationSource,
  city,
  country
}: LocationPermissionBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [hasDeclined, setHasDeclined] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  // Don't show banner if user has already granted permission or declined
  if (!isVisible || hasDeclined || permissionStatus === 'granted') {
    return null;
  }

  const handleLocationRequest = async () => {
    try {
      setIsRequesting(true);
      await onLocationRequest();
      setIsVisible(false);
    } catch (error) {
      console.error('Location request failed:', error);
      // Keep banner visible if request failed
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSkip = () => {
    setHasDeclined(true);
    setIsVisible(false);
    onSkip();
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  const getLocationSourceInfo = () => {
    switch (locationSource) {
      case 'ip-based':
        return {
          icon: <MapPin className="h-4 w-4 text-blue-500" />,
          label: 'IP-Based Location',
          description: 'Approximate location based on your IP address',
          color: 'bg-blue-100 text-blue-800'
        };
      case 'default-fallback':
        return {
          icon: <MapPinOff className="h-4 w-4 text-gray-500" />,
          label: 'Default Location',
          description: 'Using default location (Nairobi, Kenya)',
          color: 'bg-gray-100 text-gray-800'
        };
      default:
        return {
          icon: <MapPin className="h-4 w-4 text-yellow-500" />,
          label: 'Location Not Set',
          description: 'No location information available',
          color: 'bg-yellow-100 text-yellow-800'
        };
    }
  };

  const sourceInfo = getLocationSourceInfo();

  return (
    <TooltipProvider>
      <div className="floating-card border border-blue-200 rounded-lg p-4 mb-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className="flex-shrink-0 mt-1">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <MapPin className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <h3 className="text-sm font-semibold text-blue-900">
                  Enable Precise Location Services
                </h3>
                <Badge variant="secondary" className={sourceInfo.color}>
                  {sourceInfo.icon}
                  <span className="ml-1">{sourceInfo.label}</span>
                </Badge>
              </div>
              
              <p className="text-sm text-blue-700 mb-3">
                Get personalized air quality data and weather information for your exact location. 
                Currently using {locationSource === 'ip-based' ? 'approximate' : 'default'} location.
                {city && country && (
                  <span className="font-medium"> ({city}, {country})</span>
                )}
              </p>
              
              <div className="flex items-center space-x-4">
                <Button
                  onClick={handleLocationRequest}
                  disabled={isRequesting}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isRequesting ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                      Enabling...
                    </>
                  ) : (
                    <>
                      <MapPin className="h-4 w-4 mr-2" />
                      Enable GPS Location
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={handleSkip}
                  variant="outline"
                  size="sm"
                  className="text-blue-600 border-blue-300 hover:bg-blue-50"
                >
                  Skip for Now
                </Button>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-500 hover:text-blue-700 hover:bg-blue-100"
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <div className="space-y-2">
                      <p className="font-medium">Why Enable Location?</p>
                      <ul className="text-sm space-y-1">
                        <li>• Accurate air quality data for your area</li>
                        <li>• Personalized weather forecasts</li>
                        <li>• Location-specific health recommendations</li>
                        <li>• Better environmental monitoring</li>
                      </ul>
                      <p className="text-xs text-muted-foreground mt-2">
                        Your location data is stored locally and never shared with third parties.
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
          
          <Button
            onClick={handleDismiss}
            variant="ghost"
            size="sm"
            className="text-blue-400 hover:text-blue-600 hover:bg-blue-100 ml-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {permissionStatus === 'denied' && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center space-x-2">
              <MapPinOff className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-red-800">
                Location Access Denied
              </span>
            </div>
            <p className="text-sm text-red-700 mt-1">
              To enable location services, please update your browser settings or click the location icon in your browser's address bar.
            </p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
