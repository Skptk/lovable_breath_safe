import React, { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load the Header component
const LazyHeaderComponent = React.lazy(() => import('./Header'));

// Fallback skeleton that maintains the same height as the Header
const HeaderSkeleton = () => (
  <div className="flex items-center justify-between mb-6">
    {/* Left side skeleton */}
    <div className="flex items-center gap-4">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
    
    {/* Right side skeleton */}
    <div className="flex items-center gap-4">
      <Skeleton className="h-9 w-48 rounded-full" />
      <Skeleton className="h-8 w-8 rounded-full" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="hidden lg:block space-y-1">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  </div>
);

interface LazyHeaderProps {
  title: string;
  subtitle?: string;
  showRefresh?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onNavigate?: (route: string) => void;
  showMobileMenu?: boolean;
  onMobileMenuToggle?: () => void;
}

export default function LazyHeader(props: LazyHeaderProps): JSX.Element {
  return (
    <Suspense fallback={<HeaderSkeleton />}>
      <LazyHeaderComponent {...props} />
    </Suspense>
  );
}

// Also export the skeleton for use in other components if needed
export { HeaderSkeleton };
