export const LoadingSkeleton = (): JSX.Element => (
  <div className="min-h-screen bg-background p-4 space-y-6">
    {/* Skeleton Header */}
    <div className="flex justify-between items-center">
      <div className="space-y-2">
        <div className="h-8 w-32 bg-muted animate-pulse rounded"></div>
        <div className="h-4 w-48 bg-muted animate-pulse rounded"></div>
      </div>
      <div className="h-9 w-24 bg-muted animate-pulse rounded"></div>
    </div>
    
    {/* Skeleton Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="h-48 bg-muted animate-pulse rounded-lg"></div>
      <div className="h-48 bg-muted animate-pulse rounded-lg"></div>
    </div>
    
    {/* Skeleton Content */}
    <div className="space-y-4">
      <div className="h-32 bg-muted animate-pulse rounded-lg"></div>
      <div className="h-32 bg-muted animate-pulse rounded-lg"></div>
      <div className="h-32 bg-muted animate-pulse rounded-lg"></div>
    </div>
  </div>
);
