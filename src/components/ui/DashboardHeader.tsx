import { Button } from "@/components/ui/button";
import { RefreshCw, MapPin, Shield, Settings } from "lucide-react";

interface DashboardHeaderProps {
  location: string;
  isRefetching: boolean;
  onRefresh: () => void;
  hasLocationPermission?: boolean;
  onResetPermission?: () => void;
}

export const DashboardHeader = ({ 
  location, 
  isRefetching, 
  onRefresh, 
  hasLocationPermission = true,
  onResetPermission 
}: DashboardHeaderProps): JSX.Element => (
  <div className="flex justify-between items-center">
    <div>
      <h1 className="heading-lg bg-gradient-primary bg-clip-text text-transparent">
        Air Quality
      </h1>
      <p className="body-md text-muted-foreground flex items-center gap-1">
        <MapPin className="h-4 w-4" />
        {location}
        {hasLocationPermission && (
          <span className="flex items-center gap-1 ml-2 text-success">
            <Shield className="h-3 w-3" />
            Location enabled
          </span>
        )}
      </p>
    </div>
    
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={isRefetching}
        className="bg-background/50 border-border hover:bg-card"
      >
        <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
        {isRefetching ? 'Refreshing...' : 'Refresh'}
      </Button>
      
      {onResetPermission && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onResetPermission}
          className="text-muted-foreground hover:text-foreground"
          title="Reset location permission"
        >
          <Settings className="h-4 w-4" />
        </Button>
      )}
      
      <div className="body-sm text-muted-foreground bg-muted/50 px-2 py-1 rounded-ds-small">
        Auto-refresh: 2min
      </div>
    </div>
  </div>
);
