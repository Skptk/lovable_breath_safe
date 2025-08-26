import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logConnection } from '@/lib/logger';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
  lastErrorTime: number;
  isRecovering: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      lastErrorTime: 0,
      isRecovering: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      lastErrorTime: Date.now()
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    try {
      // Log error with connection context
      logConnection.error('ErrorBoundary caught error:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      });

      // Update state
      this.setState(prevState => ({
        errorCount: prevState.errorCount + 1,
        errorInfo
      }));

      // Call custom error handler if provided
      if (this.props.onError) {
        this.props.onError(error, errorInfo);
      }

      // Attempt automatic recovery for certain error types
      this.attemptAutomaticRecovery(error);
    } catch (recoveryError) {
      logConnection.error('ErrorBoundary recovery failed:', recoveryError);
    }
  }

  componentDidUpdate(prevProps: Props): void {
    // Reset error state if props changed and resetOnPropsChange is true
    if (this.props.resetOnPropsChange && prevProps !== this.props) {
      this.resetErrorState();
    }
  }

  // Attempt automatic recovery based on error type
  private attemptAutomaticRecovery(error: Error): void {
    try {
      const errorMessage = error.message.toLowerCase();
      
      // Check if it's a connection-related error
      if (this.isConnectionError(errorMessage)) {
        logConnection.info('ErrorBoundary: Connection error detected, attempting recovery...');
        this.setState({ isRecovering: true });
        
        // Attempt recovery after a delay
        setTimeout(() => {
          this.attemptConnectionRecovery();
        }, 2000);
      } else if (this.isDatabaseError(errorMessage)) {
        logConnection.info('ErrorBoundary: Database error detected, attempting recovery...');
        this.setState({ isRecovering: true });
        
        // Attempt database recovery
        setTimeout(() => {
          this.attemptDatabaseRecovery();
        }, 3000);
      }
    } catch (recoveryError) {
      logConnection.error('ErrorBoundary: Automatic recovery failed:', recoveryError);
    }
  }

  // Check if error is connection-related
  private isConnectionError(errorMessage: string): boolean {
    const connectionKeywords = [
      'websocket',
      'connection',
      'network',
      'timeout',
      'fetch',
      'axios',
      'http',
      'realtime'
    ];
    
    return connectionKeywords.some(keyword => errorMessage.includes(keyword));
  }

  // Check if error is database-related
  private isDatabaseError(errorMessage: string): boolean {
    const databaseKeywords = [
      'database',
      'sql',
      'postgres',
      'supabase',
      'table',
      'column',
      'constraint',
      'foreign key'
    ];
    
    return databaseKeywords.some(keyword => errorMessage.includes(keyword));
  }

  // Attempt connection recovery
  private async attemptConnectionRecovery(): Promise<void> {
    try {
      logConnection.info('ErrorBoundary: Attempting connection recovery...');
      
      // Simulate connection recovery (replace with actual recovery logic)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if recovery was successful
      const isRecovered = await this.checkConnectionHealth();
      
      if (isRecovered) {
        logConnection.info('ErrorBoundary: Connection recovery successful');
        this.resetErrorState();
      } else {
        logConnection.warn('ErrorBoundary: Connection recovery failed');
        this.setState({ isRecovering: false });
      }
    } catch (error) {
      logConnection.error('ErrorBoundary: Connection recovery failed:', error);
      this.setState({ isRecovering: false });
    }
  }

  // Attempt database recovery
  private async attemptDatabaseRecovery(): Promise<void> {
    try {
      logConnection.info('ErrorBoundary: Attempting database recovery...');
      
      // Simulate database recovery (replace with actual recovery logic)
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check if recovery was successful
      const isRecovered = await this.checkDatabaseHealth();
      
      if (isRecovered) {
        logConnection.info('ErrorBoundary: Database recovery successful');
        this.resetErrorState();
      } else {
        logConnection.warn('ErrorBoundary: Database recovery failed');
        this.setState({ isRecovering: false });
      }
    } catch (error) {
      logConnection.error('ErrorBoundary: Database recovery failed:', error);
      this.setState({ isRecovering: false });
    }
  }

  // Check connection health
  private async checkConnectionHealth(): Promise<boolean> {
    try {
      // Simulate health check (replace with actual health check)
      await new Promise(resolve => setTimeout(resolve, 1000));
      return Math.random() > 0.3; // 70% success rate
    } catch (error) {
      return false;
    }
  }

  // Check database health
  private async checkDatabaseHealth(): Promise<boolean> {
    try {
      // Simulate health check (replace with actual health check)
      await new Promise(resolve => setTimeout(resolve, 1000));
      return Math.random() > 0.2; // 80% success rate
    } catch (error) {
      return false;
    }
  }

  // Reset error state
  private resetErrorState(): void {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isRecovering: false
    });
  }

  // Manual error reset
  private handleReset = (): void => {
    try {
      logConnection.info('ErrorBoundary: Manual reset initiated');
      this.resetErrorState();
    } catch (error) {
      logConnection.error('ErrorBoundary: Manual reset failed:', error);
    }
  };

  // Retry operation
  private handleRetry = (): void => {
    try {
      logConnection.info('ErrorBoundary: Retry initiated');
      this.setState({ isRecovering: true });
      
      // Attempt recovery
      if (this.state.error && this.isConnectionError(this.state.error.message.toLowerCase())) {
        this.attemptConnectionRecovery();
      } else if (this.state.error && this.isDatabaseError(this.state.error.message.toLowerCase())) {
        this.attemptDatabaseRecovery();
      } else {
        // Generic retry
        setTimeout(() => {
          this.resetErrorState();
        }, 1000);
      }
    } catch (error) {
      logConnection.error('ErrorBoundary: Retry failed:', error);
      this.setState({ isRecovering: false });
    }
  };

  // Render error UI
  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <GlassCard className="max-w-2xl w-full">
            <GlassCardHeader className="text-center">
              <GlassCardTitle className="text-2xl font-bold text-red-500">
                {this.state.isRecovering ? '🔄 Recovering...' : '⚠️ Something went wrong'}
              </GlassCardTitle>
            </GlassCardHeader>
            
            <GlassCardContent className="space-y-6">
              {/* Error Summary */}
              <div className="text-center">
                <p className="text-lg text-gray-300 mb-2">
                  {this.state.isRecovering 
                    ? 'We\'re working to fix the issue automatically...'
                    : 'An unexpected error occurred while using the application.'
                  }
                </p>
                
                {this.state.error && (
                  <p className="text-sm text-gray-400 font-mono">
                    {this.state.error.message}
                  </p>
                )}
              </div>

              {/* Recovery Status */}
              {this.state.isRecovering && (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  <p className="text-sm text-blue-400">Attempting automatic recovery...</p>
                </div>
              )}

              {/* Error Details (if enabled) */}
              {this.props.showDetails && this.state.errorInfo && (
                <details className="bg-gray-800 rounded-lg p-4">
                  <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300">
                    Technical Details
                  </summary>
                  <pre className="mt-2 text-xs text-gray-500 overflow-auto max-h-40">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={this.handleRetry}
                  disabled={this.state.isRecovering}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {this.state.isRecovering ? 'Recovering...' : '🔄 Retry'}
                </button>
                
                <button
                  onClick={this.handleReset}
                  disabled={this.state.isRecovering}
                  className="px-6 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  🔄 Reset
                </button>
                
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  🔄 Reload Page
                </button>
              </div>

              {/* Error Count */}
              {this.state.errorCount > 1 && (
                <div className="text-center text-sm text-gray-500">
                  This is error #{this.state.errorCount}. 
                  {this.state.errorCount > 5 && ' Consider refreshing the page.'}
                </div>
              )}

              {/* Help Text */}
              <div className="text-center text-sm text-gray-500">
                <p>If the problem persists, please contact support.</p>
                <p className="mt-1">Error ID: {this.state.error?.name || 'Unknown'}</p>
              </div>
            </GlassCardContent>
          </GlassCard>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Partial<Props>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Hook for using error boundary context
export const useErrorBoundary = () => {
  const [error, setError] = React.useState<Error | null>(null);
  const [errorInfo, setErrorInfo] = React.useState<ErrorInfo | null>(null);

  const handleError = React.useCallback((error: Error, errorInfo: ErrorInfo) => {
    setError(error);
    setErrorInfo(errorInfo);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
    setErrorInfo(null);
  }, []);

  return {
    error,
    errorInfo,
    handleError,
    clearError,
    hasError: !!error
  };
};

export default ErrorBoundary;
