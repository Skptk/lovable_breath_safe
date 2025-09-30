import * as React from 'react';
import { motion } from 'framer-motion';
import { GlassCard, GlassCardContent, GlassCardHeader } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, RefreshCw, Clock, User, Satellite } from 'lucide-react';
import { getAQIColor, getAQILabel } from '@/config/maps';
import { useEventTimingObserver } from '@/hooks/usePerformance';

// Define interfaces at the top level to avoid hoisting issues
export interface Pollutant {
  name: string;
  value: number;
  unit: string;
  color: string;
  description?: string;
}

export interface AQIData {
  aqi?: number;
  pm25?: number;
  pm10?: number;
  no2?: number;
  so2?: number;
  co?: number;
  o3?: number;
  timestamp?: string;
  dataSource?: string;
  coordinates?: {
    lat: number;
    lon: number;
  };
  userCoordinates?: {
    lat: number;
    lon: number;
  };
  location?: string;
}

export interface AQICardProps {
  data: AQIData | null;
  timeUntilRefresh: number;
  isRefreshing: boolean;
  onRefresh: () => void;
  onNavigate?: (route: string) => void;
  showMobileMenu?: boolean;
  onMobileMenuToggle?: () => void;
  isDemoMode?: boolean;
  setSelectedPollutant: (p: Pollutant | null) => void;
}

function formatRefreshCountdown(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

// Export the component as a named function to help with debugging
function AQICardComponent(props: AQICardProps) {
  const {
    data,
    timeUntilRefresh,
    isRefreshing,
    onRefresh,
    onNavigate,
    setSelectedPollutant,
  } = props;
  const cardRef = React.useRef<HTMLDivElement | null>(null);

  useEventTimingObserver({
    label: 'AQICard',
    minDuration: 120,
    targetRef: cardRef,
    onEntry: (entry) => {
      console.log('[INP][AQICard]', {
        duration: Number(entry.duration.toFixed(2)),
        startTime: Number(entry.startTime.toFixed(2)),
        interactionName: entry.name,
        interactionId: (entry as any).interactionId ?? null,
      });
    },
  });

  const aqiColor = getAQIColor(data?.aqi ?? 0);
  const aqiLabel = getAQILabel(data?.aqi ?? 0);

  const isUserLocation =
    data?.dataSource === "OpenWeatherMap API" &&
    data?.coordinates?.lat === data?.userCoordinates?.lat &&
    data?.coordinates?.lon === data?.userCoordinates?.lon;

  const locationSource = isUserLocation ? "Your Location" : "Nearest Sensor";
  const locationIcon = isUserLocation ? User : Satellite;

  const formattedRefreshCountdown = React.useMemo(
    () => formatRefreshCountdown(timeUntilRefresh),
    [timeUntilRefresh]
  );

  // Create pollutants array directly to avoid potential issues with useMemo
  const pollutants: Pollutant[] = React.useMemo(() => [
    { 
      name: "PM2.5", 
      value: data?.pm25 ?? 0, 
      unit: "μg/m³", 
      color: "text-blue-500",
      description: "Fine particulate matter (PM2.5) can penetrate deep into the lungs and even enter the bloodstream."
    },
    { 
      name: "PM10", 
      value: data?.pm10 ?? 0, 
      unit: "μg/m³", 
      color: "text-green-500",
      description: "Coarse particulate matter (PM10) can irritate the eyes, nose, and throat."
    },
    { 
      name: "NO₂", 
      value: data?.no2 ?? 0, 
      unit: "μg/m³", 
      color: "text-orange-500",
      description: "Nitrogen dioxide (NO₂) can cause respiratory problems and contributes to the formation of smog."
    },
    { 
      name: "SO₂", 
      value: data?.so2 ?? 0, 
      unit: "μg/m³", 
      color: "text-red-500",
      description: "Sulfur dioxide (SO₂) can cause breathing problems and aggravate existing heart and lung diseases."
    },
    { 
      name: "CO", 
      value: data?.co ?? 0, 
      unit: "μg/m³", 
      color: "text-purple-500",
      description: "Carbon monoxide (CO) reduces oxygen delivery to the body's organs and tissues."
    },
    { 
      name: "O₃", 
      value: data?.o3 ?? 0, 
      unit: "μg/m³", 
      color: "text-yellow-500",
      description: "Ground-level ozone (O₃) can cause breathing problems, trigger asthma, and reduce lung function."
    },
  ], [data]);

  const initialMotion = React.useMemo(() => ({ opacity: 0, y: 12 }), []);
  const animateMotion = React.useMemo(() => ({ opacity: 1, y: 0 }), []);

  // Early return if no data is available
  if (!data) {
    return (
      <motion.div 
        ref={cardRef}
        initial={initialMotion} 
        animate={animateMotion} 
        transition={{ duration: 0.28, ease: "easeOut" }}
      >
        <GlassCard variant="elevated" className="p-6">
          <GlassCardHeader className="text-center">
            <h2 className="text-2xl font-black text-primary">Air Quality Data Unavailable</h2>
          </GlassCardHeader>
          <GlassCardContent className="text-center py-6">
            <p className="text-muted-foreground mb-4">Unable to load air quality data at this time.</p>
            <Button 
              onClick={onRefresh} 
              disabled={isRefreshing} 
              variant="outline"
              className="mt-2"
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </>
              )}
            </Button>
          </GlassCardContent>
        </GlassCard>
      </motion.div>
    );
  }

  return (
    <motion.div 
      ref={cardRef}
      initial={initialMotion} 
      animate={animateMotion} 
      transition={{ duration: 0.28, ease: "easeOut" }}
      aria-live="polite"
      aria-atomic="true"
    >
      <GlassCard variant="elevated" className="p-4 md:p-6">
        <GlassCardHeader className="text-center pb-4">
          <div className="flex flex-col items-center gap-2 mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" aria-hidden="true" />
              <h2 className="text-xl md:text-2xl font-black text-primary">
                Current Air Quality
              </h2>
            </div>
            {data.timestamp && (
              <p className="text-sm text-muted-foreground">
                Last updated: {new Date(data.timestamp).toLocaleString()}
              </p>
            )}
          </div>
        </GlassCardHeader>
        
        <GlassCardContent className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-start">
            {/* AQI Display */}
            <div className="text-center space-y-4">
              <div 
                className="text-5xl md:text-6xl font-bold mb-2 transition-colors duration-300" 
                style={{ color: aqiColor }}
                aria-label={`Air Quality Index: ${data.aqi} - ${aqiLabel}`}
              >
                {data.aqi ?? "—"}
              </div>
              
              <Badge 
                variant="outline" 
                className="px-4 py-2 text-sm font-semibold transition-colors duration-300"
                style={{ 
                  borderColor: aqiColor, 
                  color: aqiColor, 
                  backgroundColor: `${aqiColor}10`,
                  minWidth: '120px'
                }}
                aria-label={`Air Quality: ${aqiLabel}`}
              >
                {aqiLabel}
              </Badge>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  {React.createElement(locationIcon, { 
                    className: "w-4 h-4",
                    'aria-hidden': 'true'
                  })}
                  <span>{locationSource}</span>
                </div>
                
                {data.dataSource && (
                  <div className="text-xs text-muted-foreground">
                    Data source: {data.dataSource}
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground">
                  Next auto refresh in {formattedRefreshCountdown}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                <Button 
                  onClick={onRefresh} 
                  disabled={isRefreshing} 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 sm:flex-none"
                  aria-label="Refresh air quality data"
                >
                  {isRefreshing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh Now
                    </>
                  )}
                </Button>

                {onNavigate && (
                  <Button 
                    onClick={() => onNavigate("history")} 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 sm:flex-none"
                    aria-label="View air quality history"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    View History
                  </Button>
                )}
              </div>
            </div>

            {/* Pollutant Breakdown */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-center">
                Pollutant Breakdown
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                {pollutants.map((pollutant) => (
                  <div
                    key={pollutant.name}
                    className="cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => setSelectedPollutant({
                      ...pollutant,
                      description: pollutant.description || `Detailed information about ${pollutant.name}`
                    })}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedPollutant({
                          ...pollutant,
                          description: pollutant.description || `Detailed information about ${pollutant.name}`
                        });
                      }
                    }}
                    aria-label={`${pollutant.name}: ${pollutant.value} ${pollutant.unit}`}
                  >
                    <GlassCard
                      variant="subtle"
                      className="p-3 text-center h-full flex flex-col justify-center"
                    >
                      <div className={`text-lg font-bold ${pollutant.color} mb-1`}>
                        {pollutant.value.toFixed(1)}
                      </div>
                      <div className="text-sm font-medium">
                        {pollutant.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {pollutant.unit}
                      </div>
                    </GlassCard>
                  </div>
                ))}
              </div>
              
              <div className="text-xs text-muted-foreground mt-2 text-center">
                Click on a pollutant for more information
              </div>
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>
    </motion.div>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const AQICard = React.memo(AQICardComponent, (prevProps, nextProps) => {
  // Only re-render if data or refresh status changes
  return (
    prevProps.data === nextProps.data &&
    prevProps.isRefreshing === nextProps.isRefreshing &&
    prevProps.timeUntilRefresh === nextProps.timeUntilRefresh
  );
});

AQICard.displayName = 'AQICard';
