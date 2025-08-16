import { useState, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import PollutantModal from "./PollutantModal";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { useUserPoints } from "@/hooks/useUserPoints";
import { usePerformanceMonitor, useDebounce } from "@/hooks/usePerformance";
import { useAirQuality } from "@/hooks/useAirQuality";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorDisplay } from "@/components/ui/ErrorDisplay";
import { StatCard, MiniChart } from "@/components/ui/StatCard";
import { BalanceChart } from "@/components/ui/BalanceChart";
import { ProgressGauge } from "@/components/ui/ProgressGauge";
import NewsCard from "@/components/NewsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Wallet, 
  Users, 
  DollarSign, 
  Activity, 
  TrendingUp, 
  TrendingDown,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  RefreshCw
} from "lucide-react";

export default function AirQualityDashboard(): JSX.Element {
  const [selectedPollutant, setSelectedPollutant] = useState<{
    name: string;
    value: number;
    unit: string;
  } | null>(null);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const { totalPoints: userPoints, currencyRewards, canWithdraw, refreshPoints } = useUserPoints();
  const { data, isLoading, error, refetch, isRefetching, hasUserConsent, requestLocationPermission } = useAirQuality();
  
  // Performance monitoring
  usePerformanceMonitor("AirQualityDashboard");
  
  // Debounced refresh function
  const debouncedRefresh = useDebounce(refreshPoints, 1000);

  const handlePollutantClick = (name: string, value: number, unit: string) => {
    setSelectedPollutant({ name, value, unit });
  };

  const handleRefresh = async () => {
    if (!hasUserConsent) {
      // Request location permission first
      const granted = await requestLocationPermission();
      if (granted) {
        refetch();
      } else {
        toast({
          title: "Location Required",
          description: "Please allow location access to get air quality data for your area.",
          variant: "destructive",
        });
      }
    } else {
      refetch();
    }
  };

  const resetLocationPermission = () => {
    localStorage.removeItem('breath-safe-location-permission');
    window.location.reload(); // Reload to reset the permission state
  };

  // Handle loading state
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Handle no location consent state
  if (!hasUserConsent) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md">
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-foreground">Enable Location Access</h1>
            <p className="text-muted-foreground">
              To provide you with accurate air quality data for your area, we need access to your location.
            </p>
            <div className="space-y-2">
              <button 
                onClick={handleRefresh}
                className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Enable Location & Get Air Quality
              </button>
              <p className="text-sm text-muted-foreground">
                Your location is only used to fetch relevant air quality data and is never stored permanently.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <ErrorDisplay 
        error={error instanceof Error ? error : new Error('Unknown error occurred')}
        onRetry={() => refetch()}
        onRefresh={() => window.location.reload()}
      />
    );
  }

  // Handle no data state
  if (!data) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">No air quality data available</p>
          <button onClick={handleRefresh} className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90">
            Refresh
          </button>
        </div>
      </div>
    );
  }

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  // Calculate AQI status and trends
  const getAQIStatus = (aqi: number) => {
    if (aqi <= 50) return { status: "Good", color: "text-success", type: "increase" as const };
    if (aqi <= 100) return { status: "Moderate", color: "text-warning", type: "neutral" as const };
    if (aqi <= 150) return { status: "Unhealthy for Sensitive", color: "text-warning", type: "decrease" as const };
    if (aqi <= 200) return { status: "Unhealthy", color: "text-error", type: "decrease" as const };
    if (aqi <= 300) return { status: "Very Unhealthy", color: "text-error", type: "decrease" as const };
    return { status: "Hazardous", color: "text-error", type: "decrease" as const };
  };

  const aqiStatus = getAQIStatus(data.aqi);

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <Header 
        title={`Hello, ${userName}!`}
        subtitle={`Air quality data for ${data.location}`}
        showRefresh={hasUserConsent}
        onRefresh={handleRefresh}
        isRefreshing={isRefetching}
      />

      {/* Stats Grid - Top Row with AQI Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard
          title="Air Quality Index"
          value={data.aqi}
          subtitle={aqiStatus.status}
          icon={<Activity className="h-4 w-4" />}
          chart={<MiniChart />}
          className={data.aqi <= 50 ? "bg-success text-success-foreground" : ""}
        />

        <StatCard
          title="PM2.5 Level"
          value={`${data.pm25?.toFixed(1) || 'N/A'} µg/m³`}
          change={{ 
            value: data.pm25 <= 12 ? "Good" : data.pm25 <= 35 ? "Moderate" : "High", 
            type: data.pm25 <= 12 ? "increase" : "decrease" 
          }}
          icon={<Wallet className="h-4 w-4" />}
          chart={<MiniChart />}
        />

        <StatCard
          title="Total Points"
          value={userPoints.toLocaleString()}
          subtitle="Earned points"
          icon={<DollarSign className="h-4 w-4" />}
        />

        <StatCard
          title="Currency Rewards"
          value={`$${currencyRewards.toFixed(2)}`}
          change={{ 
            value: canWithdraw ? "Ready to withdraw" : "Keep earning", 
            type: canWithdraw ? "increase" : "neutral" 
          }}
          chart={<MiniChart />}
          className="bg-primary text-primary-foreground"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* News Articles Card - Takes 2 columns */}
        <div className="lg:col-span-2">
          <NewsCard />
        </div>

        {/* AQI Progress Gauge */}
        <Card className="glass-card border-0">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <h3 className="heading-md font-semibold mb-1">Air Quality Index</h3>
                <p className="body-sm text-muted-foreground">Current reading for {data.location}</p>
              </div>
              
              <div className="text-2xl font-bold">{data.aqi}</div>
              
              <p className="body-sm text-muted-foreground">
                {data.aqi <= 50 ? "Air quality is good! Great for outdoor activities." :
                 data.aqi <= 100 ? "Air quality is moderate. Sensitive individuals should consider limiting outdoor activities." :
                 "Air quality is poor. Limit outdoor activities."}
              </p>

              <div className="flex justify-center py-4">
                <ProgressGauge 
                  value={Math.min((data.aqi / 300) * 100, 100)} 
                  size={120}
                  color={
                    data.aqi <= 50 ? "hsl(var(--success))" :
                    data.aqi <= 100 ? "hsl(var(--warning))" :
                    "hsl(var(--error))"
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Air Quality Chart */}
        <Card className="glass-card border-0">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="heading-md font-semibold">Pollutant Levels</h3>
                <Badge variant="outline" className={`${
                  data.aqi <= 50 ? "bg-success/10 text-success border-success/20" :
                  data.aqi <= 100 ? "bg-warning/10 text-warning border-warning/20" :
                  "bg-error/10 text-error border-error/20"
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full mr-1 ${
                    data.aqi <= 50 ? "bg-success" :
                    data.aqi <= 100 ? "bg-warning" :
                    "bg-error"
                  }`}></div>
                  {aqiStatus.status}
                </Badge>
              </div>
              <div className="body-sm text-muted-foreground">
                Updated {new Date(data.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-6 mb-6">
              {/* PM2.5 */}
              <div>
                <p className="body-sm text-muted-foreground mb-1">PM2.5</p>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold">{data.pm25?.toFixed(1) || 'N/A'}</span>
                  <span className="body-sm text-muted-foreground">µg/m³</span>
                  <div className={`flex items-center gap-1 body-sm ${
                    data.pm25 <= 12 ? 'text-success' : 'text-error'
                  }`}>
                    {data.pm25 <= 12 ? 
                      <TrendingUp className="h-3 w-3" /> : 
                      <TrendingDown className="h-3 w-3" />
                    }
                    <span>{data.pm25 <= 12 ? "Good" : "High"}</span>
                  </div>
                </div>
              </div>

              {/* PM10 */}
              <div>
                <p className="body-sm text-muted-foreground mb-1">PM10</p>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold">{data.pm10?.toFixed(1) || 'N/A'}</span>
                  <span className="body-sm text-muted-foreground">µg/m³</span>
                  <div className={`flex items-center gap-1 body-sm ${
                    data.pm10 <= 54 ? 'text-success' : 'text-error'
                  }`}>
                    {data.pm10 <= 54 ? 
                      <TrendingUp className="h-3 w-3" /> : 
                      <TrendingDown className="h-3 w-3" />
                    }
                    <span>{data.pm10 <= 54 ? "Good" : "High"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pollutant Chart Visualization */}
            <div className="h-32 w-full glass-surface rounded-ds-small flex items-end justify-center px-4 pb-4">
              <div className="w-full h-full flex items-end justify-around">
                {/* PM2.5 Bar */}
                <div className="flex flex-col items-center">
                  <div 
                    className="w-12 bg-primary rounded-t-ds-small mb-2"
                    style={{ 
                      height: `${Math.min((data.pm25 / 50) * 80, 80)}px` 
                    }}
                  ></div>
                  <span className="body-sm text-muted-foreground">PM2.5</span>
                </div>
                
                {/* PM10 Bar */}
                <div className="flex flex-col items-center">
                  <div 
                    className="w-12 bg-secondary rounded-t-ds-small mb-2"
                    style={{ 
                      height: `${Math.min((data.pm10 / 100) * 80, 80)}px` 
                    }}
                  ></div>
                  <span className="body-sm text-muted-foreground">PM10</span>
                </div>

                {/* NO2 Bar if available */}
                {data.no2 && (
                  <div className="flex flex-col items-center">
                    <div 
                      className="w-12 bg-accent rounded-t-ds-small mb-2"
                      style={{ 
                        height: `${Math.min((data.no2 / 200) * 80, 80)}px` 
                      }}
                    ></div>
                    <span className="body-sm text-muted-foreground">NO₂</span>
                  </div>
                )}

                {/* O3 Bar if available */}
                {data.o3 && (
                  <div className="flex flex-col items-center">
                    <div 
                      className="w-12 bg-warning rounded-t-ds-small mb-2"
                      style={{ 
                        height: `${Math.min((data.o3 / 180) * 80, 80)}px` 
                      }}
                    ></div>
                    <span className="body-sm text-muted-foreground">O₃</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pollutant Details */}
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="heading-md">Pollutant Details</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="body-sm text-muted-foreground mb-6">
              Detailed breakdown of air pollutants in your area. Click on any pollutant to learn more about its health effects.
            </p>
            
            {/* Pollutant List */}
            <div className="space-y-4">
              {[
                { name: 'PM2.5', value: data.pm25, key: 'pm25' },
                { name: 'PM10', value: data.pm10, key: 'pm10' },
                { name: 'NO₂', value: data.no2, key: 'no2' },
                { name: 'O₃', value: data.o3, key: 'o3' },
                { name: 'SO₂', value: data.so2, key: 'so2' },
                { name: 'CO', value: data.co, key: 'co' }
              ].map(({ name, value, key }) => {
                if (!value) return null;
                
                const getPollutantInfo = (pollutant: string, value: number) => {
                  switch (pollutant) {
                    case 'pm25':
                      return {
                        status: value <= 12 ? 'Good' : value <= 35 ? 'Moderate' : 'High',
                        color: value <= 12 ? 'bg-success' : value <= 35 ? 'bg-warning' : 'bg-error'
                      };
                    case 'pm10':
                      return {
                        status: value <= 54 ? 'Good' : value <= 154 ? 'Moderate' : 'High',
                        color: value <= 54 ? 'bg-success' : value <= 154 ? 'bg-warning' : 'bg-error'
                      };
                    case 'no2':
                      return {
                        status: value <= 53 ? 'Good' : value <= 100 ? 'Moderate' : 'High',
                        color: value <= 53 ? 'bg-success' : value <= 100 ? 'bg-warning' : 'bg-error'
                      };
                    case 'o3':
                      return {
                        status: value <= 54 ? 'Good' : value <= 70 ? 'Moderate' : 'High',
                        color: value <= 54 ? 'bg-success' : value <= 70 ? 'bg-warning' : 'bg-error'
                      };
                    default:
                      return { status: 'Unknown', color: 'bg-muted' };
                  }
                };

                const info = getPollutantInfo(key, value);
                
                return (
                  <div 
                    key={key}
                    className="cursor-pointer hover:bg-muted/50 rounded-ds-small p-2 transition-colors"
                    onClick={() => handlePollutantClick(name, value, 'µg/m³')}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 ${info.color} rounded-full`}></div>
                        <div>
                          <p className="body-sm font-medium">{name}</p>
                          <p className="body-sm text-muted-foreground">{value.toFixed(1)} µg/m³</p>
                        </div>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          info.status === 'Good' ? 'text-success border-success/20' :
                          info.status === 'Moderate' ? 'text-warning border-warning/20' :
                          'text-error border-error/20'
                        }`}
                      >
                        {info.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>

            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => debouncedRefresh()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </CardContent>
        </Card>

        {/* Points & Rewards */}
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="heading-md">Points & Rewards</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-8 bg-primary rounded-full"></div>
                  <div>
                    <p className="body-sm font-medium">Points Earned</p>
                    <p className="body-sm text-muted-foreground">For checking air quality</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-success body-sm">
                  <ArrowUpRight className="h-3 w-3" />
                  <span>+{Math.floor(userPoints / 100)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-8 bg-success rounded-full"></div>
                  <div>
                    <p className="body-sm font-medium">Currency Rewards</p>
                    <p className="body-sm text-muted-foreground">Ready to withdraw</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-success body-sm">
                  <DollarSign className="h-3 w-3" />
                  <span>${currencyRewards.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-8 bg-warning rounded-full"></div>
                  <div>
                    <p className="body-sm font-medium">Withdrawal Status</p>
                    <p className="body-sm text-muted-foreground">
                      {canWithdraw ? "Ready" : `Need ${500000 - userPoints} more points`}
                    </p>
                  </div>
                </div>
                <div className={`flex items-center gap-1 body-sm ${canWithdraw ? 'text-success' : 'text-warning'}`}>
                  {canWithdraw ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownLeft className="h-3 w-3" />
                  )}
                  <span>{canWithdraw ? "Available" : "Pending"}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Profile Card */}
        <Card className="glass-card border-0">
          <CardContent className="p-6 text-center">
            <div className="space-y-4">
              <Avatar className="h-16 w-16 mx-auto">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                  {userName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <h3 className="heading-md font-semibold">{userName}</h3>
                <p className="body-sm text-muted-foreground">{user?.email}</p>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4">
                <div className="text-center">
                  <div className="font-bold text-lg">{Math.floor(userPoints / 1000) || 0}</div>
                  <p className="body-sm text-muted-foreground">Check-ins</p>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg">{Math.floor(userPoints / 100) || 0}</div>
                  <p className="body-sm text-muted-foreground">Points (k)</p>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg">{Math.floor(currencyRewards) || 0}</div>
                  <p className="body-sm text-muted-foreground">Rewards ($)</p>
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <div className="p-4 bg-muted/50 rounded-ds-medium">
                  <div className="flex items-center justify-center mb-2">
                    <div className="w-12 h-12 bg-foreground rounded-full flex items-center justify-center">
                      <Activity className="w-6 h-6 text-background" />
                    </div>
                  </div>
                  <h4 className="font-semibold">Stay informed!</h4>
                  <p className="body-sm text-muted-foreground">Check air quality regularly for better health</p>
                </div>

                <Button 
                  className="w-full"
                  onClick={handleRefresh}
                  disabled={isRefetching}
                >
                  {isRefetching ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Activity className="w-4 h-4 mr-2" />
                  )}
                  Check Air Quality
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pollutant Modal */}
      {selectedPollutant && (
        <PollutantModal
          pollutant={selectedPollutant}
          onClose={() => setSelectedPollutant(null)}
        />
      )}
    </div>
  );
}