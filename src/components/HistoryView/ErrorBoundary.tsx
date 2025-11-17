import { Component, ErrorInfo, ReactNode } from 'react';
import { GlassCard, GlassCardContent } from '@/components/ui/GlassCard';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChartErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onRetry?: () => void;
  resetKeys?: unknown[];
}

interface ChartErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

function haveResetKeysChanged(prev: unknown[] = [], next: unknown[] = []) {
  if (prev.length !== next.length) return true;
  return prev.some((value, index) => Object.is(value, next[index]) === false);
}

export class ChartErrorBoundary extends Component<ChartErrorBoundaryProps, ChartErrorBoundaryState> {
  state: ChartErrorBoundaryState = {
    hasError: false,
    error: undefined,
  };

  static getDerivedStateFromError(error: Error): ChartErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[HistoryView] ChartErrorBoundary captured an error', { error, info });
  }

  componentDidUpdate(prevProps: ChartErrorBoundaryProps) {
    if (this.state.hasError && this.props.resetKeys && haveResetKeysChanged(prevProps.resetKeys, this.props.resetKeys)) {
      this.setState({ hasError: false, error: undefined });
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onRetry?.();
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallbackTitle = 'Something went wrong', fallbackMessage = 'The chart failed to render. Please try again.' } = this.props;

    if (hasError) {
      return (
        <GlassCard>
          <GlassCardContent className="flex items-center justify-center h-[400px]">
            <div className="text-center space-y-4">
              <AlertTriangle className="h-8 w-8 mx-auto text-destructive" />
              <div>
                <p className="font-semibold">{fallbackTitle}</p>
                <p className="text-sm text-muted-foreground">{error?.message || fallbackMessage}</p>
              </div>
              {this.props.onRetry && (
                <Button variant="outline" onClick={this.handleRetry} className="inline-flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Retry
                </Button>
              )}
            </div>
          </GlassCardContent>
        </GlassCard>
      );
    }

    return children;
  }
}


