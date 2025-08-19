import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, RefreshCw, Award, Zap, Clock, MapPin } from "lucide-react";
import { useAirQuality } from "@/hooks/useAirQuality";
import { useAuth } from "@/hooks/useAuth";
import { useUserPoints } from "@/hooks/useUserPoints";
import { StatCard } from "@/components/ui/StatCard";
import NewsCard from "@/components/NewsCard";
import { ProgressGauge } from "@/components/ui/ProgressGauge";
import Header from "@/components/Header";
import PollutantModal from "./PollutantModal";

interface AirQualityDashboardProps {
  onNavigate?: (route: string) => void;
  showMobileMenu?: boolean;
  onMobileMenuToggle?: () => void;
}

export default function AirQualityDashboard({ 
  onNavigate, 
  showMobileMenu, 
  onMobileMenuToggle 
}: AirQualityDashboardProps) {
  const { user } = useAuth();
  const { data, isRefetching, refetch, hasUserConsent } = useAirQuality();
  const { totalPoints, currencyRewards } = useUserPoints();
  const [showPollutantModal, setShowPollutantModal] = useState(false);

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  const handleRefresh = () => {
    if (hasUserConsent) {
      refetch();
    }
  };

  const aqiStatus = {
    status: data.aqi <= 50 ? "Good" : data.aqi <= 100 ? "Moderate" : "Poor",
    color: data.aqi <= 50 ? "text-success" : data.aqi <= 100 ? "text-warning" : "text-error"
  };

  if (!data) {
    return (
      <div className="space-y-6 lg:space-y-8">
        <Header
          title={`Hello, ${userName}!`}
          subtitle="Loading air quality data..."
          showMobileMenu={showMobileMenu}
          onMobileMenuToggle={onMobileMenuToggle}
        />
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading air quality data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <Header
          title={`Hello, ${userName}!`}
          subtitle={`Air quality data for ${data.location}`}
          showRefresh={hasUserConsent}
          onRefresh={handleRefresh}
          isRefreshing={isRefetching}
          onNavigate={onNavigate}
          showMobileMenu={showMobileMenu}
          onMobileMenuToggle={onMobileMenuToggle}
        />
      </motion.div>

      {/* Stats Grid - Top Row with AQI Data */}
      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
      >
        <StatCard
          title="Current AQI"
          value={data.aqi}
          subtitle="Air Quality Index"
          icon={<TrendingUp className="h-5 w-5" />}
          change={{
            value: "Good",
            type: data.aqi <= 50 ? "increase" : data.aqi <= 100 ? "neutral" : "decrease"
          }}
        />
        
        <StatCard
          title="PM2.5"
          value={`${data.pm25?.toFixed(1) || 'N/A'} µg/m³`}
          subtitle="Fine particles"
          icon={<MapPin className="h-5 w-5" />}
          change={{
            value: data.pm25 <= 12 ? "Good" : "High",
            type: data.pm25 <= 12 ? "increase" : "decrease"
          }}
        />
        
        <StatCard
          title="PM10"
          value={`${data.pm10?.toFixed(1) || 'N/A'} µg/m³`}
          subtitle="Coarse particles"
          icon={<Clock className="h-5 w-5" />}
          change={{
            value: data.pm10 <= 54 ? "Good" : "High",
            type: data.pm10 <= 54 ? "increase" : "decrease"
          }}
        />
        
        <StatCard
          title="Total Points"
          value={totalPoints.toLocaleString()}
          subtitle="Earned rewards"
          icon={<Award className="h-5 w-5" />}
          change={{
            value: `$${currencyRewards.toFixed(2)}`,
            type: "increase"
          }}
        />
      </motion.div>

      {/* Main Content Grid */}
      <motion.div 
        className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
      >
        {/* News Articles Card - Takes 2 columns on large screens */}
        <div className="xl:col-span-2">
          <NewsCard />
        </div>

        {/* Enhanced Air Quality Card with Pollutant Details and Points Info */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
          whileHover={{ scale: 1.02 }}
        >
          <Card className="relative overflow-hidden bg-gradient-to-br from-card/80 via-card/60 to-card/40 backdrop-blur-sm border border-border/20 shadow-xl hover:shadow-2xl transition-all duration-300">
            {/* Glowing border effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-secondary/20 opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
            
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 rounded-lg"></div>
            
            <CardHeader className="relative pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="heading-md font-semibold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">Air Quality Details</h3>
                  <Badge variant="outline" className={`${
                    data.aqi <= 50 ? "bg-success/20 text-success border-success/30" :
                    data.aqi <= 100 ? "bg-warning/20 text-warning border-warning/30" :
                    "bg-error/20 text-error border-error/30"
                  } backdrop-blur-sm`}>
                    <div className={`w-1.5 h-1.5 rounded-full mr-1 ${
                      data.aqi <= 50 ? "bg-success" :
                      data.aqi <= 100 ? "bg-warning" :
                      "bg-error"
                    }`}></div>
                    {aqiStatus.status}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground/80">
                  Updated {new Date(data.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </CardHeader>

            <CardContent className="relative space-y-6">
              {/* AQI Progress Gauge */}
              <div className="text-center">
                <motion.div 
                  className="text-3xl sm:text-4xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4, duration: 0.4, ease: "easeOut" }}
                >
                  {data.aqi}
                </motion.div>
                <p className="text-sm text-muted-foreground/80 mb-6 leading-relaxed">
                  {data.aqi <= 50 ? "Air quality is good! Great for outdoor activities." :
                   data.aqi <= 100 ? "Air quality is moderate. Sensitive individuals should consider limiting outdoor activities." :
                   "Air quality is poor. Limit outdoor activities."}
                </p>
                <div className="flex justify-center">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.5, ease: "easeOut" }}
                  >
                    <ProgressGauge
                      value={Math.min((data.aqi / 300) * 100, 100)}
                      size={100}
                      color={
                        data.aqi <= 50 ? "hsl(var(--success))" :
                        data.aqi <= 100 ? "hsl(var(--warning))" :
                        "hsl(var(--error))"
                      }
                    />
                  </motion.div>
                </div>
              </div>

              {/* Pollutant Levels Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* PM2.5 */}
                <motion.div 
                  className="text-center p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/20 backdrop-blur-sm"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.4 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <p className="text-sm text-muted-foreground/80 mb-2 font-medium">PM2.5</p>
                  <div className="text-xl sm:text-2xl font-bold text-primary">{data.pm25?.toFixed(1) || 'N/A'}</div>
                  <span className="text-sm text-muted-foreground/70">µg/m³</span>
                  <div className={`flex items-center justify-center gap-1 mt-2 ${
                    data.pm25 <= 12 ? 'text-success' : 'text-error'
                  }`}>
                    {data.pm25 <= 12 ?
                      <TrendingUp className="h-4 w-4" /> :
                      <TrendingDown className="h-4 w-4" />
                    }
                    <span className="text-xs font-medium">{data.pm25 <= 12 ? "Good" : "High"}</span>
                  </div>
                </motion.div>

                {/* PM10 */}
                <motion.div 
                  className="text-center p-4 bg-gradient-to-br from-secondary/10 to-secondary/5 rounded-xl border border-secondary/20 backdrop-blur-sm"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.4 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <p className="text-sm text-muted-foreground/80 mb-2 font-medium">PM10</p>
                  <div className="text-xl sm:text-2xl font-bold text-secondary">{data.pm10?.toFixed(1) || 'N/A'}</div>
                  <span className="text-sm text-muted-foreground/70">µg/m³</span>
                  <div className={`flex items-center justify-center gap-1 mt-2 ${
                    data.pm10 <= 54 ? 'text-success' : 'text-error'
                  }`}>
                    {data.pm10 <= 54 ?
                      <TrendingUp className="h-4 w-4" /> :
                      <TrendingDown className="h-4 w-4" />
                    }
                    <span className="text-xs font-medium">{data.pm10 <= 54 ? "Good" : "High"}</span>
                  </div>
                </motion.div>
              </div>

              {/* Additional Pollutants if available */}
              {(data.no2 || data.o3 || data.so2 || data.co) && (
                <motion.div 
                  className="space-y-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.4 }}
                >
                  <p className="text-sm font-medium text-muted-foreground/80">Other Pollutants</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {data.no2 && (
                      <motion.div 
                        className="text-center p-3 bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-lg border border-blue-500/20 backdrop-blur-sm"
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="font-medium text-blue-600">NO₂</div>
                        <div className="text-base sm:text-lg font-bold text-blue-700">{data.no2.toFixed(1)} µg/m³</div>
                      </motion.div>
                    )}
                    {data.o3 && (
                      <motion.div 
                        className="text-center p-3 bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-lg border border-green-500/20 backdrop-blur-sm"
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="font-medium text-green-600">O₃</div>
                        <div className="text-base sm:text-lg font-bold text-green-700">{data.o3.toFixed(1)} µg/m³</div>
                      </motion.div>
                    )}
                    {data.so2 && (
                      <motion.div 
                        className="text-center p-3 bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 rounded-lg border border-yellow-500/20 backdrop-blur-sm"
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="font-medium text-yellow-600">SO₂</div>
                        <div className="text-base sm:text-lg font-bold text-yellow-700">{data.so2.toFixed(1)} µg/m³</div>
                      </motion.div>
                    )}
                    {data.co && (
                      <motion.div 
                        className="text-center p-3 bg-gradient-to-br from-red-500/10 to-red-500/5 rounded-lg border border-red-500/20 backdrop-blur-sm"
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="font-medium text-red-600">CO</div>
                        <div className="text-base sm:text-lg font-bold text-red-700">{data.co.toFixed(1)} µg/m³</div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Points & Rewards Summary */}
              <motion.div 
                className="text-center p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/20 backdrop-blur-sm"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.4 }}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold text-primary">Points & Rewards</h4>
                </div>
                <div className="text-2xl font-bold text-primary mb-1">{totalPoints.toLocaleString()}</div>
                <p className="text-sm text-muted-foreground/80">Total Points Earned</p>
                <div className="mt-2 text-lg font-semibold text-success">
                  ${currencyRewards.toFixed(2)} Available
                </div>
              </motion.div>

              {/* Refresh Button */}
              <motion.div 
                className="text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0, duration: 0.4 }}
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    onClick={handleRefresh} 
                    disabled={isRefetching}
                    className="w-full"
                    variant="outline"
                  >
                    {isRefetching ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Refresh Data
                  </Button>
                </motion.div>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Pollutant Modal */}
      <PollutantModal 
        pollutant={null}
        onClose={() => setShowPollutantModal(false)}
      />
    </div>
  );
}