import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home, AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isRecovering: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    isRecovering: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true, 
      error, 
      errorInfo: null,
      isRecovering: false,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to error reporting service if available
    this.logErrorToService(error, errorInfo);
  }

  private logErrorToService(error: Error, errorInfo: ErrorInfo) {
    try {
      // Log error with additional context
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        // Add any other relevant error context
      };

      console.error('Error logged:', errorData);
      
      // Here you could send to an error reporting service like Sentry
      // if (window.Sentry) {
      //   window.Sentry.captureException(error, { extra: errorData });
      // }
    } catch (loggingError) {
      console.error('Failed to log error:', loggingError);
    }
  }

  private handleRetry = () => {
    this.setState({ isRecovering: true });
    
    // Clear the error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isRecovering: false,
    });
  };

  private handleGoHome = () => {
    // Navigate to home page
    window.location.href = '/';
  };

  private handleReload = () => {
    // Reload the page
    window.location.reload();
  };

  private isModuleLoadingError(): boolean {
    return this.state.error?.message?.includes('Failed to fetch dynamically imported module') ||
           this.state.error?.message?.includes('Loading chunk') ||
           this.state.error?.message?.includes('Loading CSS chunk');
  }

  private isNetworkError(): boolean {
    return this.state.error?.message?.includes('Failed to fetch') ||
           this.state.error?.message?.includes('NetworkError') ||
           this.state.error?.message?.includes('ERR_NETWORK');
  }

  private renderErrorContent() {
    const { error, isRecovering } = this.state;
    
    if (isRecovering) {
      return (
        <div className="flex items-center justify-center p-8">
          <RefreshCw className="h-6 w-6 animate-spin text-primary mr-3" />
          <span className="text-lg">Recovering...</span>
        </div>
      );
    }

    const isModuleError = this.isModuleLoadingError();
    const isNetworkError = this.isNetworkError();

    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-secondary/30 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card rounded-lg shadow-lg border border-border p-6 text-center">
          {/* Error Icon */}
          <div className="flex justify-center mb-4">
            {isModuleError || isNetworkError ? (
              <AlertCircle className="h-16 w-16 text-amber-500" />
            ) : (
              <AlertTriangle className="h-16 w-16 text-destructive" />
            )}
          </div>

          {/* Error Title */}
          <h1 className="text-xl font-semibold text-foreground mb-2">
            {isModuleError ? 'Module Loading Error' : 
             isNetworkError ? 'Network Error' : 'Something went wrong'}
          </h1>

          {/* Error Message */}
          <p className="text-muted-foreground mb-6">
            {isModuleError ? 
              'Failed to load a component. This might be due to a network issue or deployment problem.' :
             isNetworkError ?
              'Unable to connect to the server. Please check your internet connection.' :
              'An unexpected error occurred. Please try again or contact support if the problem persists.'
            }
          </p>

          {/* Error Details (Development only) */}
          {import.meta.env.DEV && error && (
            <details className="mb-6 text-left">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground mb-2">
                Error Details (Development)
              </summary>
              <div className="bg-muted rounded p-3 text-xs font-mono text-muted-foreground overflow-auto max-h-32">
                <div className="mb-2">
                  <strong>Message:</strong> {error.message}
                </div>
                {error.stack && (
                  <div>
                    <strong>Stack:</strong>
                    <pre className="whitespace-pre-wrap mt-1">{error.stack}</pre>
                  </div>
                )}
              </div>
            </details>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {isModuleError || isNetworkError ? (
              <>
                <Button 
                  onClick={this.handleRetry} 
                  className="w-full"
                  disabled={isRecovering}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                
                <Button 
                  onClick={this.handleReload} 
                  variant="outline" 
                  className="w-full"
                >
                  Reload Page
                </Button>
              </>
            ) : (
              <Button 
                onClick={this.handleRetry} 
                className="w-full"
                disabled={isRecovering}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}
            
            <Button 
              onClick={this.handleGoHome} 
              variant="ghost" 
              className="w-full"
            >
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </div>

          {/* Additional Help */}
          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              If this problem continues, try clearing your browser cache or contact support.
            </p>
          </div>
        </div>
      </div>
    );
  }

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return this.renderErrorContent();
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
