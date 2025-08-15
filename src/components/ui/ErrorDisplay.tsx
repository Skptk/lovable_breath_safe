import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorDisplayProps {
  error: Error;
  onRetry: () => void;
  onRefresh: () => void;
}

export const ErrorDisplay = ({ error, onRetry, onRefresh }: ErrorDisplayProps): JSX.Element => {
  const isLocationError = error.message.includes('Location') || 
    error.message.includes('location') ||
    error.message.includes('timeout') ||
    error.message.includes('permission');

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <div className="text-center space-y-4 max-w-md">
        <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        
        <h2 className="text-xl font-semibold">
          {isLocationError ? 'Location Access Required' : 'Failed to load data'}
        </h2>
        
        <p className="text-muted-foreground">{error.message}</p>

        {isLocationError && (
          <div className="text-sm text-muted-foreground space-y-2 p-3 bg-muted/50 rounded-lg">
            <p><strong>Location Access Required</strong></p>
            <p>This app needs your location to show air quality data:</p>
            <ol className="text-left list-decimal list-inside space-y-1">
              <li>Allow location access when prompted</li>
              <li>Check browser settings if no prompt appears</li>
              <li>On mobile: Settings → Privacy → Location Services</li>
              <li>Refresh the page after enabling location</li>
            </ol>
          </div>
        )}
        
        <div className="flex flex-col gap-2">
          <Button onClick={onRetry} variant="outline" className="w-full">
            Try Again
          </Button>
          
          {isLocationError && (
            <Button onClick={onRefresh} variant="secondary" className="w-full">
              Refresh Page
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
