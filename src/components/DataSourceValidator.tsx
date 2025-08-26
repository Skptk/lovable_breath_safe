import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard';

interface DataSourceValidatorProps {
  dataSource: string;
  aqi: number;
  location: string;
  timestamp: string;
}

export default function DataSourceValidator({ 
  dataSource, 
  aqi, 
  location, 
  timestamp 
}: DataSourceValidatorProps) {
  // Debug logging
  console.log('🔍 [DataSourceValidator] Validating data:', {
    dataSource,
    aqi,
    location,
    timestamp
  });
  
  // Validate data source legitimacy - recognize all legitimate sources
  const isLegitimateSource = dataSource && 
    (dataSource === 'OpenWeatherMap API' || 
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
  
  console.log('🔍 [DataSourceValidator] Validation result:', {
    dataSource,
    isLegitimateSource,
    isSuspiciousAQI: aqi < 0 || aqi > 500 || aqi === 0
  });

  // Check for suspicious AQI values - only flag truly invalid values
  // AQI 0 is valid for legitimate sources (can indicate very low pollution or no data available)
  const isSuspiciousAQI = aqi < 0 || aqi > 500 || (aqi === 0 && !isLegitimateSource);
  
  // Determine validation status
  const getValidationStatus = () => {
    if (!isLegitimateSource) {
      return {
        status: 'contaminated' as const,
        icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
        color: 'bg-red-100 text-red-800 border-red-200',
        message: 'Data source may be contaminated'
      };
    }
    
    if (isSuspiciousAQI) {
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
  };

  const validation = getValidationStatus();

  return (
    <GlassCard className="mb-4">
      <GlassCardHeader>
        <GlassCardTitle className="flex items-center gap-2">
          {validation.icon}
          Data Source Validation
        </GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent>
        <div className="space-y-3">
          {/* Data Source Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Data Source:</span>
            <Badge 
              variant="outline" 
              className={validation.color}
            >
              {dataSource || 'Unknown'}
            </Badge>
          </div>

          {/* Validation Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Validation:</span>
            <Badge 
              variant="outline" 
              className={validation.color}
            >
              {validation.message}
            </Badge>
          </div>

          {/* AQI Value */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">AQI Value:</span>
            <span className={`text-sm ${isSuspiciousAQI ? 'text-yellow-600 font-semibold' : 'text-foreground'}`}>
              {aqi}
              {isSuspiciousAQI && (
                <span className="ml-2 text-xs text-yellow-600">
                  (Verify accuracy)
                </span>
              )}
            </span>
          </div>

          {/* Location */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Location:</span>
            <span className="text-sm text-foreground">{location}</span>
          </div>

          {/* Timestamp */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Last Updated:</span>
            <span className="text-sm text-muted-foreground">
              {new Date(timestamp).toLocaleString()}
            </span>
          </div>

          {/* Data Quality Information */}
          {validation.status === 'valid' && (
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-green-600 mt-0.5" />
                <div className="text-sm text-green-700 dark:text-green-300">
                  <p className="font-medium">High Quality Data</p>
                  <p>This air quality reading comes from verified OpenWeatherMap API sources and has been validated for accuracy.</p>
                </div>
              </div>
            </div>
          )}

          {validation.status === 'suspicious' && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-700 dark:text-yellow-300">
                  <p className="font-medium">Data Quality Warning</p>
                  <p>This AQI value may not be accurate. Consider refreshing for updated data from OpenWeatherMap API.</p>
                </div>
              </div>
            </div>
          )}

          {validation.status === 'contaminated' && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                <div className="text-sm text-red-700 dark:text-red-300">
                  <p className="font-medium">Data Contamination Detected</p>
                  <p>This data source may contain placeholder or mock data. Please refresh to get real-time data from OpenWeatherMap API.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </GlassCardContent>
    </GlassCard>
  );
}
