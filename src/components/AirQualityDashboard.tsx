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
  Plus
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <Header 
        title={`Hello, ${userName}!`}
        subtitle="Explore information and activity about your air quality"
        showRefresh={hasUserConsent}
        onRefresh={handleRefresh}
        isRefreshing={isRefetching}
      />

      {/* Stats Grid - Top Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Spent this month"
          value={`$${userPoints ? (userPoints * 0.0001).toFixed(1) : '0.0'}`}
          icon={<Wallet className="h-4 w-4" />}
          chart={<MiniChart />}
        />

        <StatCard
          title="New clients"
          value="321"
          change={{ value: "+2.45%", type: "increase" }}
          icon={<Users className="h-4 w-4" />}
          chart={<MiniChart />}
        />

        <StatCard
          title="Earnings"
          value={`$${currencyRewards.toFixed(2)}`}
          icon={<DollarSign className="h-4 w-4" />}
        />

        <StatCard
          title="Activity"
          value={`$${(userPoints * 0.0054).toFixed(2)}`}
          chart={<MiniChart />}
          className="bg-primary text-primary-foreground"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Balance Chart - Takes 2 columns */}
        <div className="lg:col-span-2">
          <BalanceChart
            title="Balance"
            status="On track"
            period="Monthly"
            savings={{
              percentage: 43.50,
              change: "+2.45%",
              type: "increase"
            }}
            balance={{
              amount: `$${(userPoints * 0.052).toFixed(0)}`,
              change: "-4.75%",
              type: "decrease"
            }}
          />
        </div>

        {/* Earnings Card with Progress Gauge */}
        <Card className="border-0">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <h3 className="heading-md font-semibold mb-1">Earnings</h3>
                <p className="body-sm text-muted-foreground">Total Expense</p>
              </div>
              
              <div className="text-2xl font-bold">${(userPoints * 0.006).toFixed(2)}</div>
              
              <p className="body-sm text-muted-foreground">
                Profit is 34% More than last Month
              </p>

              <div className="flex justify-center py-4">
                <ProgressGauge value={80} size={120} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Credit Cards */}
        <Card className="border-0">
          <CardHeader>
            <CardTitle className="heading-md">Available Credit Card in Wallet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="body-sm text-muted-foreground mb-6">
              Lorem ipsum dolor sit amet consectetur. Facillis tincidunt purus id hendrerit cras massa bibendum adipiscing. Sit egestas risus sed sit auctor.
            </p>
            
            {/* Mock Credit Cards Stack */}
            <div className="relative h-32 mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-success rounded-ds-large p-4 transform rotate-2">
                <div className="flex justify-between items-start text-primary-foreground">
                  <div>
                    <p className="body-sm opacity-80">MASTERCARD</p>
                    <p className="font-mono text-sm mt-2">**** **** **** 1234</p>
                  </div>
                  <div className="w-8 h-8 bg-primary-foreground/20 rounded-full"></div>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-accent to-secondary rounded-ds-large p-4 transform -rotate-1 z-10">
                <div className="flex justify-between items-start text-foreground">
                  <div>
                    <p className="body-sm opacity-80">VISA</p>
                    <p className="font-mono text-sm mt-2">**** **** **** 5678</p>
                  </div>
                  <div className="w-8 h-8 bg-foreground/20 rounded-full"></div>
                </div>
              </div>
            </div>

            <Button variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add New Card +
            </Button>
          </CardContent>
        </Card>

        {/* Transfers */}
        <Card className="border-0">
          <CardHeader>
            <CardTitle className="heading-md">Your Transfers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-8 bg-primary rounded-full"></div>
                  <div>
                    <p className="body-sm font-medium">From Anna Jones</p>
                    <p className="body-sm text-muted-foreground">Today, 14:34</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-success body-sm">
                  <ArrowDownLeft className="h-3 w-3" />
                  <span>+2.45%</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-8 bg-error rounded-full"></div>
                  <div>
                    <p className="body-sm font-medium">To Carlos Brown III</p>
                    <p className="body-sm text-muted-foreground">Today, 12:15</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-error body-sm">
                  <ArrowUpRight className="h-3 w-3" />
                  <span>-4.75%</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-8 bg-success rounded-full"></div>
                  <div>
                    <p className="body-sm font-medium">From Joel Cannan</p>
                    <p className="body-sm text-muted-foreground">Today, 17:04</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-success body-sm">
                  <ArrowDownLeft className="h-3 w-3" />
                  <span>+2.45%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Profile Card */}
        <Card className="border-0">
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
                  <div className="font-bold text-lg">{Math.floor(userPoints / 1000)}</div>
                  <p className="body-sm text-muted-foreground">Projects</p>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg">{Math.floor(userPoints / 100)}</div>
                  <p className="body-sm text-muted-foreground">Followers</p>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg">{Math.floor(userPoints / 500)}</div>
                  <p className="body-sm text-muted-foreground">Following</p>
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <div className="p-4 bg-muted/50 rounded-ds-medium">
                  <div className="flex items-center justify-center mb-2">
                    <div className="w-12 h-12 bg-foreground rounded-full flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-background rounded-full"></div>
                    </div>
                  </div>
                  <h4 className="font-semibold">Keep you safe!</h4>
                  <p className="body-sm text-muted-foreground">Update your security password</p>
                </div>

                <Button className="w-full">
                  Update Your Security
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