import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { RefreshCw, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RefreshProgressBarProps {
  timeUntilRefresh: number;
  isRefreshing: boolean;
  onManualRefresh: () => void;
  isUsingCachedData?: boolean;
  className?: string;
}

export function RefreshProgressBar({
  timeUntilRefresh,
  isRefreshing,
  onManualRefresh,
  isUsingCachedData = false,
  className
}: RefreshProgressBarProps) {
  // Calculate progress percentage (15 minutes = 900 seconds)
  const totalTime = 900; // 15 minutes in seconds
  const progress = ((totalTime - timeUntilRefresh) / totalTime) * 100;
  
  // Format time remaining
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Get progress bar color based on time remaining
  const getProgressColor = (): string => {
    if (timeUntilRefresh > 600) return 'bg-green-500'; // > 10 minutes
    if (timeUntilRefresh > 300) return 'bg-yellow-500'; // > 5 minutes
    if (timeUntilRefresh > 60) return 'bg-orange-500'; // > 1 minute
    return 'bg-red-500'; // < 1 minute
  };

  return (
    <div className={cn(
      "w-full bg-card border border-border rounded-lg p-4 space-y-3",
      isUsingCachedData && "border-amber-200 bg-amber-50/10",
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            {isUsingCachedData ? 'Showing cached data' : 'Next automatic refresh'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-muted-foreground">
            {formatTime(timeUntilRefresh)}
          </span>
          
          <Button
            size="sm"
            variant="outline"
            onClick={onManualRefresh}
            disabled={isRefreshing}
            className="h-8 px-3"
          >
            {isRefreshing ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            <span className="ml-1 text-xs">Refresh</span>
          </Button>
        </div>
      </div>
      
      <div className="space-y-2">
        <Progress 
          value={progress} 
          className="h-2"
          indicatorClassName={getProgressColor()}
        />
        
        {isUsingCachedData && (
          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            <span>Data from last automatic refresh - fresh data available in {formatTime(timeUntilRefresh)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
