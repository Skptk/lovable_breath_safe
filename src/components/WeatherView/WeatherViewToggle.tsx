import { Button } from '@/components/ui/button';
import { BarChart3, LayoutGrid } from 'lucide-react';

interface WeatherViewToggleProps {
  viewMode: 'charts' | 'overview';
  onViewChange: (mode: 'charts' | 'overview') => void;
}

export function WeatherViewToggle({ viewMode, onViewChange }: WeatherViewToggleProps) {
  return (
    <div 
      className="flex items-center gap-2"
      role="tablist"
      aria-label="Weather view selection"
    >
      <Button
        variant={viewMode === 'charts' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onViewChange('charts')}
        aria-label="Switch to charts view"
        aria-pressed={viewMode === 'charts'}
        role="tab"
        tabIndex={viewMode === 'charts' ? 0 : -1}
      >
        <BarChart3 className="h-4 w-4 mr-2" aria-hidden="true" />
        Charts
      </Button>
      <Button
        variant={viewMode === 'overview' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onViewChange('overview')}
        aria-label="Switch to overview view"
        aria-pressed={viewMode === 'overview'}
        role="tab"
        tabIndex={viewMode === 'overview' ? 0 : -1}
      >
        <LayoutGrid className="h-4 w-4 mr-2" aria-hidden="true" />
        Overview
      </Button>
    </div>
  );
}

