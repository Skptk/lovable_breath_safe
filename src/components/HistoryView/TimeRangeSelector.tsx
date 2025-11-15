import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { TimeRange } from './utils/chartDataTransform';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { useState } from 'react';

interface TimeRangeSelectorProps {
  selectedRange: TimeRange;
  onRangeChange: (range: TimeRange) => void;
}

const QUICK_RANGES: Array<{ type: TimeRange['type']; label: string }> = [
  { type: '24h', label: '24h' },
  { type: '7d', label: '7d' },
  { type: '30d', label: '30d' },
  { type: '90d', label: '90d' },
  { type: 'ALL', label: 'All' },
];

export function TimeRangeSelector({ selectedRange, onRangeChange }: TimeRangeSelectorProps) {
  const [customDateOpen, setCustomDateOpen] = useState(false);
  const [customStart, setCustomStart] = useState<Date | undefined>(selectedRange.start);
  const [customEnd, setCustomEnd] = useState<Date | undefined>(selectedRange.end);

  const handleQuickRange = (type: TimeRange['type']) => {
    onRangeChange({ type });
  };

  const handleCustomRange = () => {
    if (customStart && customEnd) {
      onRangeChange({
        type: 'CUSTOM',
        start: customStart,
        end: customEnd,
      });
      setCustomDateOpen(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {QUICK_RANGES.map((range) => (
        <Button
          key={range.type}
          variant={selectedRange.type === range.type ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleQuickRange(range.type)}
          aria-label={`Select ${range.label} time range`}
        >
          {range.label}
        </Button>
      ))}
      
      <Popover open={customDateOpen} onOpenChange={setCustomDateOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={selectedRange.type === 'CUSTOM' ? 'default' : 'outline'}
            size="sm"
            aria-label="Select custom date range"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Custom
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <CalendarComponent
                mode="single"
                selected={customStart}
                onSelect={setCustomStart}
                initialFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <CalendarComponent
                mode="single"
                selected={customEnd}
                onSelect={setCustomEnd}
                disabled={(date) => customStart ? date < customStart : false}
              />
            </div>
            {customStart && customEnd && (
              <div className="text-xs text-muted-foreground">
                {format(customStart, 'MMM d, yyyy')} - {format(customEnd, 'MMM d, yyyy')}
              </div>
            )}
            <Button
              onClick={handleCustomRange}
              disabled={!customStart || !customEnd}
              className="w-full"
            >
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

