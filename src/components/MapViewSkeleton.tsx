import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading skeleton specifically designed for WeatherStats/MapView component
 * Matches the layout of the weather and map interface
 */
export function MapViewSkeleton() {
  return (
    <div className="space-y-4 p-4 min-h-[60vh]">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Map container skeleton */}
      <div className="rounded-3xl border border-border/40 bg-card/70 p-8 shadow-lg mb-6">
        <Skeleton className="h-96 w-full mb-4" />
        <div className="flex gap-4 justify-center">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Weather stats grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-border/40 bg-card/50 p-4">
            <Skeleton className="h-6 w-24 mb-2" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

