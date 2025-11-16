import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading skeleton specifically designed for HistoryView component
 * Matches the layout and structure of the actual HistoryView
 */
export function HistoryViewSkeleton() {
  return (
    <div className="space-y-4 p-4 min-h-[60vh]">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-10 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* Time range selector skeleton */}
      <div className="flex gap-2 mb-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Chart area skeleton */}
      <div className="rounded-3xl border border-border/40 bg-card/70 p-8 shadow-lg mb-6">
        <Skeleton className="h-64 w-full mb-4" />
        <div className="flex justify-center gap-4">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>

      {/* Table/list skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 p-4 rounded-lg border border-border/40 bg-card/50">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

