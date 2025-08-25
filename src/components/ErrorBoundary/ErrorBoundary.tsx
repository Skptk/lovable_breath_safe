import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isPromiseRejection: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    isPromiseRejection: false
  };

  constructor(props: Props) {
    super(props);
    
    // Listen for unhandled promise rejections
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', this.handlePromiseRejection);
    }
  }

  componentWillUnmount() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('unhandledrejection', this.handlePromiseRejection);
    }
  }

  private handlePromiseRejection = (event: PromiseRejectionEvent) => {
    console.error('Unhandled promise rejection caught by ErrorBoundary:', event.reason);
    
    this.setState({
      hasError: true,
      error: new Error(`Unhandled Promise Rejection: ${event.reason?.message || event.reason}`),
      errorInfo: null,
      isPromiseRejection: true
    });

    // Prevent the default browser behavior
    event.preventDefault();
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      isPromiseRejection: false
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
      isPromiseRejection: false
    });
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isPromiseRejection: false
    });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isPromiseRejection = this.state.isPromiseRejection;
      const errorMessage = this.state.error?.message || 'An unexpected error occurred';
      const errorStack = this.state.errorInfo?.componentStack || '';

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <GlassCard className="w-full max-w-2xl">
            <GlassCardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                {isPromiseRejection ? (
                  <Bug className="h-8 w-8 text-destructive" />
                ) : (
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                )}
              </div>
              <GlassCardTitle className="text-xl">
                {isPromiseRejection ? 'Promise Rejection Error' : 'Something went wrong'}
              </GlassCardTitle>
              <p className="text-muted-foreground">
                {isPromiseRejection 
                  ? 'An unhandled promise rejection occurred. This usually means there was an issue with an API call or async operation.'
                  : 'An error occurred while rendering this component. Please try again or contact support if the problem persists.'
                }
              </p>
            </GlassCardHeader>
            <GlassCardContent className="space-y-4">
              {/* Error Details */}
              <div className="rounded-lg bg-muted p-4">
                <h4 className="font-semibold mb-2">Error Details:</h4>
                <p className="text-sm text-muted-foreground font-mono break-words">
                  {errorMessage}
                </p>
                {errorStack && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-muted-foreground">
                      Component Stack Trace
                    </summary>
                    <pre className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap overflow-auto max-h-32">
                      {errorStack}
                    </pre>
                  </details>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button onClick={this.handleRetry} variant="default" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
                <Button onClick={this.handleGoHome} variant="outline" className="gap-2">
                  <Home className="h-4 w-4" />
                  Go Home
                </Button>
                <Button onClick={this.handleReload} variant="outline" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Reload Page
                </Button>
              </div>

              {/* Additional Help */}
              <div className="text-center text-sm text-muted-foreground">
                <p>
                  If this error persists, please check your internet connection and try again.
                </p>
                {isPromiseRejection && (
                  <p className="mt-1">
                    This might be related to a temporary API issue or network problem.
                  </p>
                )}
              </div>
            </GlassCardContent>
          </GlassCard>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
