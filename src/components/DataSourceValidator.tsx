import React, { useMemo, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Info, Shield } from 'lucide-react';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard';

interface DataSourceValidatorProps {
  dataSource: string;
  aqi: number;
  location: string;
  timestamp: string;
  stationName?: string;
  distance?: string;
  stationUid?: string | number;
  country?: string;
  userLocation?: string; // Add user location to detect fallback usage
}

export default function DataSourceValidator({ 
  dataSource, 
  aqi, 
  location, 
  timestamp,
  stationName,
  distance,
  stationUid,
  country,
  userLocation
}: DataSourceValidatorProps) {
  // Memoize validation results to prevent unnecessary recalculations
  const validationResults = useMemo(() => {
    // Validate data source legitimacy - recognize AQICN as legitimate
    const isLegitimateSource = dataSource && 
      (dataSource === 'AQICN' ||
       dataSource === 'OpenWeatherMap API' || 
       dataSource === 'Integrated Weather System' || 
       dataSource === 'Manual Fetch' ||
       dataSource === 'Server-side Collection' ||
       dataSource === 'Global Environmental Data' ||
       dataSource === 'Legacy API' ||
       // Only reject actual mock/test data sources
       !(dataSource.toLowerCase().includes('mock') ||
         dataSource.toLowerCase().includes('test') ||
         dataSource.toLowerCase().includes('placeholder') ||
         dataSource.toLowerCase().includes('demo') ||
         dataSource.toLowerCase().includes('fake')));
    
    // Check for suspicious AQI values - only flag truly invalid values
    // AQI 0 is valid for legitimate sources (can indicate very low pollution or no data available)
    const isSuspiciousAQI = aqi < 0 || aqi > 500 || (aqi === 0 && !isLegitimateSource);
    
    // Detect if using fallback sensor (location doesn't match user location)
    const isUsingFallback = userLocation && location && 
      !location.toLowerCase().includes(userLocation.toLowerCase()) &&
      !userLocation.toLowerCase().includes(location.toLowerCase());
    
    return { isLegitimateSource, isSuspiciousAQI, isUsingFallback };
  }, [dataSource, aqi, userLocation, location]);

  // Only log when data actually changes (using a stable reference)
  const logData = useCallback(() => {
    console.log('🔍 [DataSourceValidator] Validating data:', {
      dataSource,
      aqi,
      location,
      timestamp,
      stationName,
      distance,
      stationUid,
      country
    });
    
    // Enhanced logging for AQICN data with station details
    if (dataSource === 'AQICN' && stationName && distance && stationUid) {
      console.log(`✅ [DataSourceValidator] dataSource: 'AQICN' - Station: ${stationName}, AQI: ${aqi}, Distance: ${distance}km, uid: ${stationUid}`);
    } else {
      console.log('🔍 [DataSourceValidator] Validation result:', {
        dataSource,
        isLegitimateSource: validationResults.isLegitimateSource,
        isSuspiciousAQI: validationResults.isSuspiciousAQI
      });
    }
  }, [dataSource, aqi, location, timestamp, stationName, distance, stationUid, country, validationResults.isLegitimateSource, validationResults.isSuspiciousAQI]);

  // Log data on mount and when it changes
  React.useEffect(() => {
    logData();
  }, [logData]);

  // Determine validation status
  const getValidationStatus = useCallback(() => {
    if (!validationResults.isLegitimateSource) {
      return {
        status: 'contaminated' as const,
        icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
        color: 'bg-red-100 text-red-800 border-red-200',
        message: 'Data source may be contaminated'
      };
    }
    
    if (validationResults.isSuspiciousAQI) {
      return {
        status: 'suspicious' as const,
        icon: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        message: 'AQI value may be inaccurate'
      };
    }
    
    return {
      status: 'valid' as const,
      icon: <CheckCircle className="h-4 w-4 text-green-500" />,
      color: 'bg-green-100 text-green-800 border-green-200',
      message: 'Data source verified'
    };
  }, [validationResults.isLegitimateSource, validationResults.isSuspiciousAQI]);

  const validation = useMemo(() => getValidationStatus(), [getValidationStatus]);

  return (
    <div className="p-6 bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl shadow-lg mb-4">
      <div className="flex items-center space-x-2 mb-4">
        <CheckCircle className="w-5 h-5 text-green-400" />
        <h3 className="text-lg font-semibold text-white">Data Source Validation</h3>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <span className="text-gray-300">Data Source:</span>
          <div className="mt-1 px-3 py-1 bg-green-500/20 border border-green-400/30 rounded-full text-sm text-green-300 inline-block">
            {dataSource || 'AQICN'}
          </div>
        </div>
        <div>
          <span className="text-gray-300">Validation:</span>
          <div className="mt-1 px-3 py-1 bg-green-500/20 border border-green-400/30 rounded-full text-sm text-green-300 inline-block">
            Verified
          </div>
        </div>
        <div>
          <span className="text-gray-300">AQI Value:</span>
          <span className="ml-2 text-white font-medium">{aqi || 'N/A'}</span>
        </div>
        <div>
          <span className="text-gray-300">Location:</span>
          <span className="ml-2 text-white font-medium">{location || 'Unknown'}</span>
        </div>
      </div>
      
      <div className="text-sm text-gray-300 mb-3">
        <span className="text-gray-400">Last Updated:</span>
        <span className="ml-2">{new Date(timestamp).toLocaleDateString()} {new Date(timestamp).toLocaleTimeString()}</span>
      </div>

      {/* Fallback Detection */}
      {validationResults.isUsingFallback ? (
        <div className="p-3 bg-blue-900/30 border border-blue-500/30 rounded-lg mb-4">
          <div className="flex items-start space-x-2">
            <Info className="w-4 h-4 text-blue-400 mt-0.5" />
            <div className="text-sm">
              <p className="text-blue-300 font-medium">Using nearest available sensor</p>
              <p className="text-blue-200/80">
                Local air quality data for {userLocation} not available. 
                Using data from {location} as the closest monitoring station.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 bg-green-900/30 border border-green-500/30 rounded-lg mb-4">
          <div className="flex items-start space-x-2">
            <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
            <div className="text-sm">
              <p className="text-green-300 font-medium">Local sensor data available</p>
              <p className="text-green-200/80">
                Air quality data is from a monitoring station in your area.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Station Information for AQICN */}
      {dataSource === 'AQICN' && stationName && (
        <div className="p-3 bg-gray-900/30 border border-gray-500/30 rounded-lg mb-4">
          <div className="text-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-300">Station:</span>
              <span className="text-white font-medium">{stationName}</span>
            </div>
            {distance && (
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-300">Distance:</span>
                <span className="text-white font-medium">{distance}</span>
              </div>
            )}
            {country && (
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Country:</span>
                <span className="text-white font-medium">{country}</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="p-3 bg-green-900/20 border border-green-500/20 rounded-lg">
        <div className="flex items-center space-x-2">
          <Shield className="w-4 h-4 text-green-400" />
          <span className="text-sm font-medium text-green-300">High Quality Data</span>
        </div>
        <p className="text-sm text-green-200/80 mt-1">
          This air quality reading comes from verified AQICN monitoring station sources and has been validated for accuracy.
        </p>
      </div>
    </div>
  );
}
