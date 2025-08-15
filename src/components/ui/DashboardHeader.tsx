import { Button } from "@/components/ui/button";
import { RefreshCw, MapPin } from "lucide-react";

interface DashboardHeaderProps {
  location: string;
  isRefetching: boolean;
  onRefresh: () => void;
}

export const DashboardHeader = ({ location, isRefetching, onRefresh }: DashboardHeaderProps): JSX.Element => (
  <div className="flex justify-between items-center">
    <div>
      <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
        Air Quality
      </h1>
      <p className="text-sm text-muted-foreground flex items-center gap-1">
        <MapPin className="h-4 w-4" />
        {location}
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
      <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
        Auto-refresh: 2min
      </div>
    </div>
  </div>
);
