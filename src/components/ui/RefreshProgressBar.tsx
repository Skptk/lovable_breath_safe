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
      "w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 space-y-3 shadow-lg",
      isUsingCachedData && "border-amber-200/50 bg-amber-50/10",
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-300" />
          <span className="text-sm font-medium text-gray-300">
            {isUsingCachedData ? 'Showing cached data' : 'Next automatic refresh'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-white">
            {formatTime(timeUntilRefresh)}
          </span>
          
          <button
            onClick={onManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 rounded-md transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="text-sm text-white">Refresh</span>
          </button>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="w-full bg-gray-700/30 rounded-full h-2">
          <div 
            className={cn("h-2 rounded-full transition-all duration-1000", getProgressColor())}
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {isUsingCachedData && (
          <div className="flex items-center gap-2 text-xs text-amber-300">
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            <span>Data from last automatic refresh - fresh data available in {formatTime(timeUntilRefresh)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
