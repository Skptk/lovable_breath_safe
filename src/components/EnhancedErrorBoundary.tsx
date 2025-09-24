import React, { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { logConnection } from '@/lib/logger';

const MAX_RECOVERY_ATTEMPTS = 3;

interface EnhancedErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  retryCount?: number;
  maxRetries?: number;
}

interface EnhancedErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
  isRecovering: boolean;
}
class ErrorBoundaryBridge extends React.Component<{
  onCatch: (error: Error, errorInfo: React.ErrorInfo) => void;
  children: React.ReactNode;
}, { hasError: boolean }> {
  override state: { hasError: boolean } = { hasError: false };

  static override getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onCatch(error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}

export function EnhancedErrorBoundary({
  children,
  fallback,
  onError,
  retryCount = 0,
  maxRetries = 3
}: EnhancedErrorBoundaryProps) {
  const [state, setState] = useState<EnhancedErrorBoundaryState>(
    () => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount,
      isRecovering: false
    })
  );
  const [boundaryKey, setBoundaryKey] = useState(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recoveryAttemptsRef = useRef(0);
  const isUnmountedRef = useRef(false);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const clearScheduledRecovery = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      clearScheduledRecovery();
    };
  }, [clearScheduledRecovery]);

  const effectiveMaxRetries = maxRetries ?? 3;

  const recoverFromNullReference = useCallback(async () => {
    logConnection.info('Recovering from null reference error');

    if (typeof window !== 'undefined' && (window as any).gc) {
      try {
        (window as any).gc();
        logConnection.info('Garbage collection triggered');
      } catch (error) {
        logConnection.warn('Failed to trigger garbage collection', { error });
      }
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }, []);

  const recoverFromWebSocketError = useCallback(async () => {
    logConnection.info('Recovering from WebSocket error');

    try {
      const { supabase } = await import('@/integrations/supabase/client');

      if (supabase.realtime) {
        await supabase.realtime.disconnect();
        await new Promise(resolve => setTimeout(resolve, 2000));
        await supabase.realtime.connect();

        logConnection.info('WebSocket reconnection successful');
      }
    } catch (error) {
      logConnection.warn('WebSocket reconnection failed', { error });
    }
  }, []);

  const recoverFromSubscriptionError = useCallback(async () => {
    logConnection.info('Recovering from subscription error');

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
  }, []);

  const recoverFromConnectionError = useCallback(async () => {
    logConnection.info('Recovering from connection error');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }, []);

  const performGenericRecovery = useCallback(async () => {
    logConnection.info('Performing generic error recovery');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }, []);

  const getErrorType = useCallback((errorMessage: string): string => {
    if (errorMessage.includes('cannot read properties of null') || errorMessage.includes('cannot read properties of undefined')) {
      return 'null_reference';
    }
    if (errorMessage.includes('websocket closed')) {
      return 'websocket_connection';
    }
    if (errorMessage.includes('subscription error') || errorMessage.includes('channel error')) {
      return 'subscription';
    }
    if (errorMessage.includes('connection failed')) {
      return 'connection';
    }
    return 'unknown';
  }, []);

  const isRecoverableError = useCallback((errorMessage: string) => {
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
  }, []);

  const performRecovery = useCallback(async () => {
    try {
      logConnection.info('Performing error recovery');

      const currentError = stateRef.current.error;
      const errorType = currentError ? getErrorType(currentError.message.toLowerCase()) : 'unknown';

      switch (errorType) {
        case 'null_reference':
          await recoverFromNullReference();
          break;
        case 'websocket_connection':
          await recoverFromWebSocketError();
          break;
        case 'subscription':
          await recoverFromSubscriptionError();
          break;
        case 'connection':
          await recoverFromConnectionError();
          break;
        default:
          await performGenericRecovery();
      }

      setState(prev => ({
        ...prev,
        hasError: false,
        error: null,
        errorInfo: null,
        isRecovering: false
      }));
      recoveryAttemptsRef.current = 0;
      setBoundaryKey(key => key + 1);

      logConnection.info('Error recovery completed successfully');
    } catch (recoveryError) {
      logConnection.error('Error recovery failed', {
        originalError: stateRef.current.error?.message,
        recoveryError: recoveryError instanceof Error ? recoveryError.message : recoveryError,
        recoveryAttempt: recoveryAttemptsRef.current
      });

      setState(prev => ({ ...prev, isRecovering: false }));
    } finally {
      clearScheduledRecovery();
    }
  }, [
    clearScheduledRecovery,
    getErrorType,
    recoverFromConnectionError,
    recoverFromNullReference,
    recoverFromSubscriptionError,
    recoverFromWebSocketError,
    performGenericRecovery
  ]);

  const attemptAutomaticRecovery = useCallback((error: Error) => {
    const errorMessage = error.message.toLowerCase();

    if (recoveryAttemptsRef.current >= MAX_RECOVERY_ATTEMPTS) {
      logConnection.warn('Max recovery attempts exceeded, not attempting automatic recovery');
      return;
    }

    if (isRecoverableError(errorMessage)) {
      const nextAttempt = recoveryAttemptsRef.current + 1;
      logConnection.info('Attempting automatic recovery for recoverable error', {
        errorType: getErrorType(errorMessage),
        recoveryAttempt: nextAttempt
      });

      setState(prev => ({ ...prev, isRecovering: true }));
      recoveryAttemptsRef.current = nextAttempt;

      const delay = Math.min(1000 * Math.pow(2, nextAttempt - 1), 10000);

      clearScheduledRecovery();
      retryTimeoutRef.current = setTimeout(() => {
        if (!isUnmountedRef.current) {
          performRecovery();
        }
      }, delay);
    }
  }, [
    clearScheduledRecovery,
    getErrorType,
    isRecoverableError,
    performRecovery
  ]);

  const handleErrorCapture = useCallback((error: Error, errorInfo: React.ErrorInfo) => {
    logConnection.error('Error boundary caught error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    });

    setState(prev => ({
      ...prev,
      hasError: true,
      error,
      errorInfo
    }));

    onError?.(error, errorInfo);
    attemptAutomaticRecovery(error);
  }, [attemptAutomaticRecovery, onError]);

  const handleRetry = useCallback(() => {
    let shouldReset = false;

    setState(prev => {
      if (prev.retryCount >= effectiveMaxRetries) {
        return prev;
      }

      shouldReset = true;
      return {
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prev.retryCount + 1,
        isRecovering: false
      };
    });

    if (shouldReset) {
      clearScheduledRecovery();
      recoveryAttemptsRef.current = 0;
      setBoundaryKey(key => key + 1);
    }
  }, [clearScheduledRecovery, effectiveMaxRetries]);

  const handleReset = useCallback(() => {
    clearScheduledRecovery();
    recoveryAttemptsRef.current = 0;
    setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount,
      isRecovering: false
    });
    setBoundaryKey(key => key + 1);
  }, [clearScheduledRecovery, retryCount]);

  if (state.hasError) {
    if (state.isRecovering) {
      return (
        <div className="error-boundary-fallback">
          <div className="recovery-progress">
            <h3>🔄 Recovering from Error</h3>
            <p>Attempting to automatically recover from the error...</p>
            <div className="progress-bar">
              <div className="progress-fill"></div>
            </div>
            <p className="recovery-attempt">
              Recovery attempt {recoveryAttemptsRef.current} of {MAX_RECOVERY_ATTEMPTS}
            </p>
          </div>
        </div>
      );
    }

    if (fallback) {
      return fallback;
    }

    return (
      <div className="error-boundary-fallback">
        <div className="error-content">
          <h3>⚠️ Something went wrong</h3>
          <p>An error occurred in the application. We're working to fix it.</p>

          {state.error && (
            <details className="error-details">
              <summary>Error Details</summary>
              <pre className="error-message">{state.error.message}</pre>
              {state.errorInfo && (
                <pre className="error-stack">{state.errorInfo.componentStack}</pre>
              )}
            </details>
          )}

          <div className="error-actions">
            <button
              onClick={handleRetry}
              disabled={state.retryCount >= effectiveMaxRetries}
              className="retry-button"
            >
              Try Again ({state.retryCount}/{effectiveMaxRetries})
            </button>

            <button onClick={handleReset} className="reset-button">
              Reset
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundaryBridge key={boundaryKey} onCatch={handleErrorCapture}>
      {children}
    </ErrorBoundaryBridge>
  );
}

// HOC for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Partial<EnhancedErrorBoundaryProps>
) {
  const WrappedComponent = (props: P) => (
    <EnhancedErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </EnhancedErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;
  return WrappedComponent;
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
