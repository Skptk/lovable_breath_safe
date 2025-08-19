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
  RefreshCw,
  User
} from "lucide-react";

interface AirQualityDashboardProps {
  onNavigate?: (route: string) => void;
  showMobileMenu?: boolean;
  onMobileMenuToggle?: () => void;
}

export default function AirQualityDashboard({ onNavigate, showMobileMenu, onMobileMenuToggle }: AirQualityDashboardProps = {}): JSX.Element {
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
        isRefetching={isRefetching}
        onNavigate={onNavigate}
        showMobileMenu={showMobileMenu}
        onMobileMenuToggle={onMobileMenuToggle}
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
          className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 text-green-900"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* News Articles Card - Takes 2 columns */}
        <div className="lg:col-span-2">
          <NewsCard />
        </div>

        {/* Enhanced Air Quality Card with Pollutant Details and Points Info */}
        <Card className="glass-card border-0">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="heading-md font-semibold">Air Quality Details</h3>
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
          
          <CardContent className="space-y-6">
            {/* AQI Progress Gauge */}
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">{data.aqi}</div>
              <p className="body-sm text-muted-foreground mb-4">
                {data.aqi <= 50 ? "Air quality is good! Great for outdoor activities." :
                 data.aqi <= 100 ? "Air quality is moderate. Sensitive individuals should consider limiting outdoor activities." :
                 "Air quality is poor. Limit outdoor activities."}
              </p>
              <div className="flex justify-center">
                <ProgressGauge 
                  value={Math.min((data.aqi / 300) * 100, 100)} 
                  size={100}
                  color={
                    data.aqi <= 50 ? "hsl(var(--success))" :
                    data.aqi <= 100 ? "hsl(var(--warning))" :
                    "hsl(var(--error))"
                  }
                />
              </div>
            </div>

            {/* Pollutant Levels Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* PM2.5 */}
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <p className="body-sm text-muted-foreground mb-1">PM2.5</p>
                <div className="text-xl font-bold">{data.pm25?.toFixed(1) || 'N/A'}</div>
                <span className="body-sm text-muted-foreground">µg/m³</span>
                <div className={`flex items-center justify-center gap-1 mt-1 ${
                  data.pm25 <= 12 ? 'text-success' : 'text-error'
                }`}>
                  {data.pm25 <= 12 ? 
                    <TrendingUp className="h-3 w-3" /> : 
                    <TrendingDown className="h-3 w-3" />
                  }
                  <span className="text-xs">{data.pm25 <= 12 ? "Good" : "High"}</span>
                </div>
              </div>

              {/* PM10 */}
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <p className="body-sm text-muted-foreground mb-1">PM10</p>
                <div className="text-xl font-bold">{data.pm10?.toFixed(1) || 'N/A'}</div>
                <span className="body-sm text-muted-foreground">µg/m³</span>
                <div className={`flex items-center justify-center gap-1 mt-1 ${
                  data.pm10 <= 54 ? 'text-success' : 'text-error'
                }`}>
                  {data.pm10 <= 54 ? 
                    <TrendingUp className="h-3 w-3" /> : 
                    <TrendingDown className="h-3 w-3" />
                  }
                  <span className="text-xs">{data.pm10 <= 54 ? "Good" : "High"}</span>
                </div>
              </div>
            </div>

            {/* Additional Pollutants if available */}
            {(data.no2 || data.o3 || data.so2 || data.co) && (
              <div className="space-y-2">
                <p className="body-sm font-medium text-muted-foreground">Other Pollutants</p>
                <div className="grid grid-cols-2 gap-2">
                  {data.no2 && (
                    <div className="text-center p-2 bg-muted/20 rounded text-xs">
                      <div className="font-medium">NO₂</div>
                      <div>{data.no2.toFixed(1)} µg/m³</div>
                    </div>
                  )}
                  {data.o3 && (
                    <div className="text-center p-2 bg-muted/20 rounded text-xs">
                      <div className="font-medium">O₃</div>
                      <div>{data.o3.toFixed(1)} µg/m³</div>
                    </div>
                  )}
                  {data.so2 && (
                    <div className="text-center p-2 bg-muted/20 rounded text-xs">
                      <div className="font-medium">SO₂</div>
                      <div>{data.so2.toFixed(1)} µg/m³</div>
                    </div>
                  )}
                  {data.co && (
                    <div className="text-center p-2 bg-muted/20 rounded text-xs">
                      <div className="font-medium">CO</div>
                      <div>{data.co.toFixed(1)} µg/m³</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Points & Rewards Summary */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-6 bg-primary rounded-full"></div>
                  <span className="body-sm font-medium">Points Earned</span>
                </div>
                <div className="flex items-center gap-1 text-success body-sm">
                  <ArrowUpRight className="h-3 w-3" />
                  <span>{Math.floor(userPoints / 100)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-6 bg-success rounded-full"></div>
                  <span className="body-sm font-medium">Currency Rewards</span>
                </div>
                <div className="flex items-center gap-1 text-success body-sm">
                  <DollarSign className="h-3 w-3" />
                  <span>${currencyRewards.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-6 bg-warning rounded-full"></div>
                  <span className="body-sm font-medium">Withdrawal Status</span>
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

            {/* Refresh Button */}
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => debouncedRefresh()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
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