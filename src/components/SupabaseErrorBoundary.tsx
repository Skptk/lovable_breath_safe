import React from 'react';
import { AlertTriangle, RefreshCw, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface SupabaseErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface SupabaseErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class SupabaseErrorBoundary extends React.Component<
  SupabaseErrorBoundaryProps,
  SupabaseErrorBoundaryState
> {
  constructor(props: SupabaseErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): SupabaseErrorBoundaryState {
    // Check if this is a Supabase configuration error
    const isSupabaseError = error.message.includes('Missing Supabase environment variables') ||
                           error.message.includes('Invalid Supabase URL format') ||
                           error.message.includes('Supabase');
    
    return { hasError: true, error: isSupabaseError ? error : undefined };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('SupabaseErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-xl">Configuration Required</CardTitle>
              <CardDescription>
                The application needs to be configured with the proper environment variables.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <h4 className="font-medium mb-2">Setup Instructions:</h4>
                <ol className="text-sm space-y-1 list-decimal list-inside">
                  <li>Go to your Netlify dashboard</li>
                  <li>Select your site</li>
                  <li>Go to Site settings → Environment variables</li>
                  <li>Add the required variables:
                    <ul className="mt-2 space-y-1 list-disc list-inside ml-4">
                      <li><code>VITE_SUPABASE_URL</code></li>
                      <li><code>VITE_SUPABASE_ANON_KEY</code></li>
                      <li><code>VITE_OPENWEATHERMAP_API_KEY</code></li>
                    </ul>
                  </li>
                  <li>Trigger a new deployment</li>
                </ol>
              </div>
              
              {this.state.error && (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3">
                  <p className="text-sm text-red-700 dark:text-red-300">
                    <strong>Error:</strong> {this.state.error.message}
                  </p>
                </div>
              )}
              
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={() => window.location.reload()} 
                  className="w-full"
                  variant="default"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Page
                </Button>
                
                <Button 
                  onClick={() => {
                    // Open Netlify dashboard in new tab
                    window.open('https://app.netlify.com/', '_blank');
                  }} 
                  variant="outline"
                  className="w-full"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Open Netlify Dashboard
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground text-center">
                After setting up the environment variables, refresh this page to continue.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
