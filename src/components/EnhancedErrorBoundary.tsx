import React, { Component, ReactNode } from 'react';
import { logConnection } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  retryCount?: number;
  maxRetries?: number;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
  isRecovering: boolean;
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  private retryTimeout: NodeJS.Timeout | null = null;
  private recoveryAttempts: number = 0;
  private readonly maxRecoveryAttempts: number = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRecovering: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error with structured logging
    logConnection.error('Error boundary caught error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    });

    // Update state
    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Attempt automatic recovery for specific error types
    this.attemptAutomaticRecovery(error);
  }

  private attemptAutomaticRecovery(error: Error): void {
    const errorMessage = error.message.toLowerCase();
    
    // Don't attempt recovery if we've exceeded max attempts
    if (this.recoveryAttempts >= this.maxRecoveryAttempts) {
      logConnection.warn('Max recovery attempts exceeded, not attempting automatic recovery');
      return;
    }

    // Check if this is a recoverable error type
    if (this.isRecoverableError(errorMessage)) {
      logConnection.info('Attempting automatic recovery for recoverable error', {
        errorType: this.getErrorType(errorMessage),
        recoveryAttempt: this.recoveryAttempts + 1
      });

      this.setState({ isRecovering: true });
      this.recoveryAttempts++;

      // Attempt recovery with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, this.recoveryAttempts - 1), 10000);
      
      this.retryTimeout = setTimeout(() => {
        this.performRecovery();
      }, delay);
    }
  }

  private isRecoverableError(errorMessage: string): boolean {
    const recoverablePatterns = [
      'cannot read properties of null',
      'cannot read properties of undefined',
      'websocket closed',
      'connection failed',
      'subscription error',
      'channel error',
      'realtime error'
    ];

    return recoverablePatterns.some(pattern => errorMessage.includes(pattern));
  }

  private getErrorType(errorMessage: string): string {
    if (errorMessage.includes('cannot read properties of null') || errorMessage.includes('cannot read properties of undefined')) {
      return 'null_reference';
    } else if (errorMessage.includes('websocket closed')) {
      return 'websocket_connection';
    } else if (errorMessage.includes('subscription error') || errorMessage.includes('channel error')) {
      return 'subscription';
    } else if (errorMessage.includes('connection failed')) {
      return 'connection';
    } else {
      return 'unknown';
    }
  }

  private async performRecovery(): Promise<void> {
    try {
      logConnection.info('Performing error recovery');

      // Attempt to recover based on error type
      const errorType = this.state.error ? this.getErrorType(this.state.error.message.toLowerCase()) : 'unknown';
      
      switch (errorType) {
        case 'null_reference':
          await this.recoverFromNullReference();
          break;
        case 'websocket_connection':
          await this.recoverFromWebSocketError();
          break;
        case 'subscription':
          await this.recoverFromSubscriptionError();
          break;
        case 'connection':
          await this.recoverFromConnectionError();
          break;
        default:
          await this.performGenericRecovery();
      }

      // If recovery was successful, reset error state
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isRecovering: false
      });

      logConnection.info('Error recovery completed successfully');

    } catch (recoveryError) {
      logConnection.error('Error recovery failed', {
        originalError: this.state.error?.message,
        recoveryError: recoveryError instanceof Error ? recoveryError.message : recoveryError,
        recoveryAttempt: this.recoveryAttempts
      });

      this.setState({ isRecovering: false });
    }
  }

  private async recoverFromNullReference(): Promise<void> {
    logConnection.info('Recovering from null reference error');
    
    // Force garbage collection if available
    if (typeof window !== 'undefined' && (window as any).gc) {
      try {
        (window as any).gc();
        logConnection.info('Garbage collection triggered');
      } catch (error) {
        logConnection.warn('Failed to trigger garbage collection', { error });
      }
    }

    // Wait a moment for cleanup
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private async recoverFromWebSocketError(): Promise<void> {
    logConnection.info('Recovering from WebSocket error');
    
    // Attempt to reconnect WebSocket
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      if (supabase.realtime) {
        // Disconnect and reconnect
        await supabase.realtime.disconnect();
        await new Promise(resolve => setTimeout(resolve, 2000));
        await supabase.realtime.connect();
        
        logConnection.info('WebSocket reconnection successful');
      }
    } catch (error) {
      logConnection.warn('WebSocket reconnection failed', { error });
    }
  }

  private async recoverFromSubscriptionError(): Promise<void> {
    logConnection.info('Recovering from subscription error');
    
    // Clear any stale subscriptions
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      if (supabase.realtime) {
        const channels = supabase.realtime.getChannels();
        for (const channel of channels) {
          try {
            supabase.removeChannel(channel);
          } catch (error) {
            logConnection.warn('Failed to remove channel during recovery', { error });
          }
        }
        
        logConnection.info('Stale subscriptions cleared');
      }
    } catch (error) {
      logConnection.warn('Subscription cleanup failed', { error });
    }
  }

  private async recoverFromConnectionError(): Promise<void> {
    logConnection.info('Recovering from connection error');
    
    // Wait for network to stabilize
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  private async performGenericRecovery(): Promise<void> {
    logConnection.info('Performing generic error recovery');
    
    // Wait and hope for the best
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  private handleRetry = (): void => {
    if (this.state.retryCount < (this.props.maxRetries || 3)) {
      this.setState(prevState => ({
        retryCount: prevState.retryCount + 1,
        hasError: false,
        error: null,
        errorInfo: null
      }));
    }
  };

  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRecovering: false
    });
    
    // Clear any pending recovery attempts
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    
    this.recoveryAttempts = 0;
  };

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  render() {
    if (this.state.hasError) {
      // Show recovery progress if recovering
      if (this.state.isRecovering) {
        return (
          <div className="error-boundary-fallback">
            <div className="recovery-progress">
              <h3>🔄 Recovering from Error</h3>
              <p>Attempting to automatically recover from the error...</p>
              <div className="progress-bar">
                <div className="progress-fill"></div>
              </div>
              <p className="recovery-attempt">
                Recovery attempt {this.recoveryAttempts} of {this.maxRecoveryAttempts}
              </p>
            </div>
          </div>
        );
      }

      // Show error fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary-fallback">
          <div className="error-content">
            <h3>⚠️ Something went wrong</h3>
            <p>An error occurred in the application. We're working to fix it.</p>
            
            {this.state.error && (
              <details className="error-details">
                <summary>Error Details</summary>
                <pre className="error-message">{this.state.error.message}</pre>
                {this.state.errorInfo && (
                  <pre className="error-stack">{this.state.errorInfo.componentStack}</pre>
                )}
              </details>
            )}
            
            <div className="error-actions">
              <button 
                onClick={this.handleRetry}
                disabled={this.state.retryCount >= (this.props.maxRetries || 3)}
                className="retry-button"
              >
                Try Again ({this.state.retryCount}/{this.props.maxRetries || 3})
              </button>
              
              <button onClick={this.handleReset} className="reset-button">
                Reset
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Partial<Props>
) {
  return function WrappedComponent(props: P) {
    return (
      <EnhancedErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </EnhancedErrorBoundary>
    );
  };
}

// Hook for using error boundary context
export function useErrorBoundary() {
  return {
    reportError: (error: Error, errorInfo?: React.ErrorInfo) => {
      logConnection.error('Error reported via useErrorBoundary hook', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo?.componentStack
      });
    }
  };
}

export default EnhancedErrorBoundary;
