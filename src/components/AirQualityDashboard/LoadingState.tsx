import React from 'react';
import Header from '@/components/Header';

interface LoadingStateProps {
  title?: string;
  subtitle?: string;
}

function LoadingStateComponent({
  title = "Loading",
  subtitle = "Please wait...",
}: LoadingStateProps) {
  return (
    <div className="space-y-6 lg:space-y-8">
      <Header title={title} subtitle={subtitle} />
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
        <p className="mt-4 text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

export const LoadingState: React.FC<LoadingStateProps> = React.memo(LoadingStateComponent);

LoadingState.displayName = 'LoadingState';
