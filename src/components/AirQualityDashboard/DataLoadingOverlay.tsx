import type { Key } from "react";
import { memo } from "react";
import Header from "@/components/Header";

interface DataLoadingOverlayProps {
  userName: string;
  showMobileMenu?: boolean;
  onMobileMenuToggle?: () => void;
}

const skeletonRow = (key: Key, width: string) => (
  <div
    key={key}
    className="h-3 rounded-full bg-muted/40 animate-pulse"
    style={{ width }}
  />
);

function DataLoadingOverlayComponent({
  userName,
  showMobileMenu,
  onMobileMenuToggle,
}: DataLoadingOverlayProps) {
  return (
    <div className="space-y-6 lg:space-y-8">
      <Header
        title={`Hello, ${userName}!`}
        subtitle="Preparing your personalized air quality insights..."
        showMobileMenu={showMobileMenu}
        onMobileMenuToggle={onMobileMenuToggle}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-background/60 backdrop-blur-sm p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="h-6 w-24 rounded-full bg-primary/10 animate-pulse" />
            <div className="h-6 w-16 rounded-full bg-muted/40 animate-pulse" />
          </div>
          <div className="mt-6 space-y-4">
            <div className="h-10 rounded-xl bg-primary/10 animate-pulse" />
            <div className="space-y-2">
              {["78%", "62%", "92%"].map((width, index) =>
                skeletonRow(`aqi-${index}`, width)
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-background/60 backdrop-blur-sm p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-muted/40 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded-full bg-muted/40 animate-pulse" />
              <div className="h-4 w-20 rounded-full bg-muted/30 animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`metric-${index}`}
                className="h-16 rounded-xl bg-primary/5 border border-primary/10 animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-background/60 backdrop-blur-sm p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="h-6 w-28 rounded-full bg-muted/40 animate-pulse" />
          <div className="h-6 w-16 rounded-full bg-muted/30 animate-pulse" />
        </div>
        <div className="mt-4 grid gap-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={`history-${index}`}
              className="flex items-center gap-4 rounded-xl border border-border/50 bg-accent/10 p-4 animate-pulse"
            >
              <div className="h-10 w-10 rounded-full bg-muted/40" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-40 rounded-full bg-muted/40" />
                <div className="h-3 w-28 rounded-full bg-muted/30" />
              </div>
              <div className="h-8 w-12 rounded-lg bg-muted/40" />
            </div>
          ))}
        </div>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        Pulling in live readings, rewards, and localized weather. This usually takes just a moment.
      </div>
    </div>
  );
}

export const DataLoadingOverlay = memo(DataLoadingOverlayComponent);
