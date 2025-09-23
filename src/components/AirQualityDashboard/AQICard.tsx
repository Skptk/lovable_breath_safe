import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard, GlassCardContent, GlassCardHeader } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, RefreshCw, Clock, User, Satellite } from 'lucide-react';
import { getAQIColor, getAQILabel } from '@/config/maps';

interface AQICardProps {
  data: any;
  timeUntilRefresh: number;
  isRefreshing: boolean;
  onRefresh: () => void;
  onNavigate?: (route: string) => void;
  showMobileMenu?: boolean;
  onMobileMenuToggle?: () => void;
  isDemoMode?: boolean;
  setSelectedPollutant: (p: any | null) => void;
}

export const AQICard: React.FC<AQICardProps> = React.memo(({
  data,
  timeUntilRefresh,
  isRefreshing,
  onRefresh,
  onNavigate,
  showMobileMenu,
  onMobileMenuToggle,
  isDemoMode,
  setSelectedPollutant,
}) => {
  const aqiColor = getAQIColor(data?.aqi ?? 0);
  const aqiLabel = getAQILabel(data?.aqi ?? 0);

  const isUserLocation =
    data?.dataSource === "OpenWeatherMap API" &&
    data?.coordinates?.lat === data?.userCoordinates?.lat &&
    data?.coordinates?.lon === data?.userCoordinates?.lon;

  const locationSource = isUserLocation ? "Your Location" : "Nearest Sensor";
  const locationIcon = isUserLocation ? User : Satellite;

  // CRITICAL FIX: Remove useMemo and create pollutants array directly
  const pollutants = [
    { name: "PM2.5", value: data?.pm25 ?? 0, unit: "μg/m³", color: "text-blue-500" },
    { name: "PM10", value: data?.pm10 ?? 0, unit: "μg/m³", color: "text-green-500" },
    { name: "NO₂", value: data?.no2 ?? 0, unit: "μg/m³", color: "text-orange-500" },
    { name: "SO₂", value: data?.so2 ?? 0, unit: "μg/m³", color: "text-red-500" },
    { name: "CO", value: data?.co ?? 0, unit: "μg/m³", color: "text-purple-500" },
    { name: "O₃", value: data?.o3 ?? 0, unit: "μg/m³", color: "text-yellow-500" },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <GlassCard variant="elevated" className="p-6">
        <GlassCardHeader className="text-center pb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-black text-primary">Current Air Quality</h2>
          </div>
          <p className="text-muted-foreground">Last updated: {data?.timestamp ?? "—"}</p>
        </GlassCardHeader>
        <GlassCardContent className="text-center space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="text-center space-y-4">
              <div className="text-6xl font-bold mb-2" style={{ color: aqiColor }}>
                {data?.aqi ?? "—"}
              </div>
              <Badge 
                variant="outline" 
                className="px-4 py-2 text-sm font-semibold" 
                style={{ 
                  borderColor: aqiColor, 
                  color: aqiColor, 
                  backgroundColor: `${aqiColor}10`  
                }}
              >
                {aqiLabel}
              </Badge>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  {React.createElement(locationIcon, { className: "w-4 h-4" })}
                  <span>{locationSource}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Data source: {data?.dataSource ?? "—"}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button 
                  onClick={onRefresh} 
                  disabled={isRefreshing} 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 sm:flex-none"
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

                <Button 
                  onClick={() => onNavigate?.("history")} 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 sm:flex-none"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  View History
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-center">Pollutant Breakdown</h3>
              <div className="grid grid-cols-2 gap-3">
                {pollutants.map((pollutant) => (
                  <GlassCard
                    key={pollutant.name}
                    variant="subtle"
                    className="p-3 text-center cursor-pointer hover:scale-105 transition-transform"
                    onClick={() =>
                      setSelectedPollutant({
                        name: pollutant.name,
                        value: pollutant.value,
                        unit: pollutant.unit,
                        description: `Detailed information about ${pollutant.name}`,
                        color: pollutant.color,
                      })
                    }
                  >
                    <div className={`text-lg font-bold ${pollutant.color}`}>
                      {pollutant.value.toFixed(1)}
                    </div>
                    <div className="text-xs text-muted-foreground">{pollutant.name}</div>
                    <div className="text-xs text-muted-foreground">{pollutant.unit}</div>
                  </GlassCard>
                ))}
              </div>
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>
    </motion.div>
  );
});

AQICard.displayName = 'AQICard';
