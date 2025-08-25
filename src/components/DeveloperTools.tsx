import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { GlassCard, GlassCardContent, GlassCardDescription, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Bug, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Download, 
  Trash2,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { 
  runWebSocketDiagnostics, 
  generateWebSocketReport, 
  getWebSocketDiagnosticHistory,
  webSocketDiagnostics,
  type WebSocketDiagnosticResult 
} from '@/lib/websocketDiagnostics';
import { diagnoseConnection } from '@/integrations/supabase/client';

interface DeveloperToolsProps {
  isVisible?: boolean;
  onToggle?: () => void;
}

export function DeveloperTools({ isVisible = false, onToggle }: DeveloperToolsProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<WebSocketDiagnosticResult | null>(null);
  const [diagnosticHistory, setDiagnosticHistory] = useState<WebSocketDiagnosticResult[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Run diagnostics
  const handleRunDiagnostics = async () => {
    setIsRunning(true);
    try {
      const result = await runWebSocketDiagnostics();
      setLastResult(result);
      setDiagnosticHistory(getWebSocketDiagnosticHistory());
      
      // Show success/error notification
      if (result.connectionQuality === 'excellent' || result.connectionQuality === 'good') {
        console.log('✅ [DeveloperTools] Diagnostics completed successfully');
      } else {
        console.warn('⚠️ [DeveloperTools] Diagnostics completed with issues');
      }
    } catch (error) {
      console.error('❌ [DeveloperTools] Diagnostics failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  // Generate report
  const handleGenerateReport = async () => {
    try {
      const report = await generateWebSocketReport();
      
      // Create and download report file
      const blob = new Blob([report], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `websocket-diagnostics-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('✅ [DeveloperTools] Report downloaded successfully');
    } catch (error) {
      console.error('❌ [DeveloperTools] Failed to generate report:', error);
    }
  };

  // Clear history
  const handleClearHistory = () => {
    webSocketDiagnostics.clearDiagnosticHistory();
    setDiagnosticHistory([]);
    setLastResult(null);
    console.log('🗑️ [DeveloperTools] Diagnostic history cleared');
  };

  // Run basic connection test
  const handleBasicTest = () => {
    console.log('🔍 [DeveloperTools] Running basic connection test...');
    diagnoseConnection();
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  // Get quality badge color
  const getQualityBadgeVariant = (quality: string) => {
    switch (quality) {
      case 'excellent':
        return 'default';
      case 'good':
        return 'secondary';
      case 'poor':
        return 'destructive';
      case 'disconnected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-[80vh] overflow-y-auto">
      <GlassCard className="shadow-lg border-2">
        <GlassCardHeader className="pb-3">
          <GlassCardTitle className="flex items-center space-x-2 text-lg">
            <Bug className="h-5 w-5" />
            <span>Developer Tools</span>
          </GlassCardTitle>
          <GlassCardDescription>
            WebSocket connection diagnostics and troubleshooting
          </GlassCardDescription>
        </GlassCardHeader>
        
        <GlassCardContent className="space-y-4">
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleRunDiagnostics}
              disabled={isRunning}
              className="flex-1"
              variant="default"
            >
              {isRunning ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Wifi className="h-4 w-4 mr-2" />
              )}
              {isRunning ? 'Running...' : 'Run Diagnostics'}
            </Button>
            
            <Button
              onClick={handleBasicTest}
              variant="outline"
              size="sm"
            >
              <Wifi className="h-4 w-4 mr-2" />
              Basic Test
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleGenerateReport}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
            
            <Button
              onClick={handleClearHistory}
              variant="outline"
              size="sm"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>

          {/* Last Result */}
          {lastResult && (
            <div className="space-y-3">
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Last Diagnostic Result</span>
                  <Badge variant={getQualityBadgeVariant(lastResult.connectionQuality)}>
                    {lastResult.connectionQuality}
                  </Badge>
                </div>
                
                <div className="text-xs space-y-1">
                  <div className="flex items-center space-x-2">
                    <span>Environment:</span>
                    <Badge variant="outline">{lastResult.environment}</Badge>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span>REST API:</span>
                    {getStatusIcon(lastResult.restApiStatus)}
                    <span className={lastResult.restApiStatus === 'success' ? 'text-green-600' : 'text-red-600'}>
                      {lastResult.restApiStatus}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span>WebSocket:</span>
                    {getStatusIcon(lastResult.websocketStatus)}
                    <span className={lastResult.websocketStatus === 'success' ? 'text-green-600' : 'text-red-600'}>
                      {lastResult.websocketStatus}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span>Realtime:</span>
                    <Badge variant="outline">{lastResult.realtimeStatus}</Badge>
                  </div>
                </div>

                {/* Recommendations */}
                {lastResult.recommendations.length > 0 && (
                  <div className="mt-3">
                    <span className="text-xs font-medium text-muted-foreground">Recommendations:</span>
                    <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                      {lastResult.recommendations.slice(0, 3).map((rec, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="text-yellow-500 mt-1">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                      {lastResult.recommendations.length > 3 && (
                        <li className="text-xs text-muted-foreground">
                          +{lastResult.recommendations.length - 3} more recommendations
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* History Toggle */}
          {diagnosticHistory.length > 0 && (
            <div>
              <Button
                onClick={() => setShowHistory(!showHistory)}
                variant="ghost"
                size="sm"
                className="w-full"
              >
                {showHistory ? 'Hide' : 'Show'} History ({diagnosticHistory.length})
              </Button>
              
              {showHistory && (
                <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                  {diagnosticHistory.slice(-5).reverse().map((result, index) => (
                    <div key={index} className="text-xs p-2 bg-muted rounded border">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">
                          {new Date(result.timestamp).toLocaleTimeString()}
                        </span>
                        <Badge variant={getQualityBadgeVariant(result.connectionQuality)} size="sm">
                          {result.connectionQuality}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground">
                        {result.environment} • {result.restApiStatus} • {result.websocketStatus}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Close Button */}
          {onToggle && (
            <Button
              onClick={onToggle}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Close Tools
            </Button>
          )}
        </GlassCardContent>
      </GlassCard>
    </div>
  );
}
