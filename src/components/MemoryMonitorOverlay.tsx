/**
 * Memory Monitor Overlay - Development tool for tracking memory usage
 * Only visible in development mode
 */

import { useState, useEffect, useRef } from 'react';
import { memoryBudgetManager } from '@/utils/memoryBudgetManager';
import { X, AlertTriangle, CheckCircle2, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function MemoryMonitorOverlay() {
  const [isVisible, setIsVisible] = useState(false);
  const [memoryUsage, setMemoryUsage] = useState<number | null>(null);
  const [status, setStatus] = useState<'ok' | 'warn' | 'critical' | 'emergency'>('ok');
  const intervalRef = useRef<number | null>(null);

  // Only show in development
  if (import.meta.env.PROD) {
    return null;
  }

  useEffect(() => {
    const updateMemory = () => {
      const usage = memoryBudgetManager.getCurrentMemoryUsage();
      setMemoryUsage(usage);
      
      if (usage !== null) {
        const budgetStatus = memoryBudgetManager.checkBudget();
        setStatus(budgetStatus);
      }
    };

    // Update every 2 seconds
    intervalRef.current = window.setInterval(updateMemory, 2000);
    updateMemory();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-[9999] p-2 bg-primary/80 hover:bg-primary text-white rounded-full shadow-lg backdrop-blur-sm"
        title="Show Memory Monitor"
      >
        <Activity className="h-5 w-5" />
      </button>
    );
  }

  const getStatusColor = () => {
    switch (status) {
      case 'emergency':
        return 'text-red-600 bg-red-50 dark:bg-red-950/20';
      case 'critical':
        return 'text-orange-600 bg-orange-50 dark:bg-orange-950/20';
      case 'warn':
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20';
      default:
        return 'text-green-600 bg-green-50 dark:bg-green-950/20';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'emergency':
      case 'critical':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <CheckCircle2 className="h-4 w-4" />;
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-80 bg-card/95 backdrop-blur-md border border-border rounded-lg shadow-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Memory Monitor
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsVisible(false)}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className={`p-3 rounded-md ${getStatusColor()}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium">Heap Usage</span>
          {getStatusIcon()}
        </div>
        <div className="text-2xl font-bold">
          {memoryUsage !== null ? `${memoryUsage.toFixed(1)} MB` : 'N/A'}
        </div>
        <div className="text-xs mt-1 opacity-75">
          Status: {status.toUpperCase()}
        </div>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Warning:</span>
          <span>60 MB</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Critical:</span>
          <span>100 MB</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Emergency:</span>
          <span>140 MB</span>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => memoryBudgetManager.performCleanup('Manual cleanup')}
        className="w-full text-xs"
      >
        Force Cleanup
      </Button>
    </div>
  );
}

