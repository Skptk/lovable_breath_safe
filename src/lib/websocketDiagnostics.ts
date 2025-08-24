import { supabase } from '@/integrations/supabase/client';

export interface WebSocketDiagnosticResult {
  timestamp: string;
  environment: string;
  supabaseUrl: string;
  restApiStatus: 'success' | 'failed';
  restApiResponse?: number;
  restApiError?: string;
  websocketStatus: 'success' | 'failed';
  websocketError?: string;
  websocketCloseCode?: number;
  websocketCloseReason?: string;
  realtimeStatus: 'connected' | 'disconnected' | 'connecting';
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
  recommendations: string[];
}

/**
 * Comprehensive WebSocket connection diagnostics for troubleshooting
 * connection issues on Netlify and other environments
 */
export class WebSocketDiagnostics {
  private static instance: WebSocketDiagnostics;
  private diagnosticResults: WebSocketDiagnosticResult[] = [];

  private constructor() {}

  static getInstance(): WebSocketDiagnostics {
    if (!WebSocketDiagnostics.instance) {
      WebSocketDiagnostics.instance = new WebSocketDiagnostics();
    }
    return WebSocketDiagnostics.instance;
  }

  /**
   * Run comprehensive connection diagnostics
   */
  async runDiagnostics(): Promise<WebSocketDiagnosticResult> {
    const timestamp = new Date().toISOString();
    const environment = this.detectEnvironment();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'Not configured';
    
    console.log('🔍 [WebSocketDiagnostics] Starting comprehensive connection diagnosis...');
    
    // Test REST API connectivity
    const restApiResult = await this.testRestApi();
    
    // Test direct WebSocket connection
    const websocketResult = await this.testDirectWebSocket();
    
    // Check Supabase realtime status
    const realtimeStatus = this.checkRealtimeStatus();
    
    // Determine connection quality
    const connectionQuality = this.assessConnectionQuality(restApiResult, websocketResult, realtimeStatus);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(restApiResult, websocketResult, realtimeStatus, environment);
    
    const result: WebSocketDiagnosticResult = {
      timestamp,
      environment,
      supabaseUrl,
      restApiStatus: restApiResult.success ? 'success' : 'failed',
      restApiResponse: restApiResult.response,
      restApiError: restApiResult.error,
      websocketStatus: websocketResult.success ? 'success' : 'failed',
      websocketError: websocketResult.error,
      websocketCloseCode: websocketResult.closeCode,
      websocketCloseReason: websocketResult.closeReason,
      realtimeStatus,
      connectionQuality,
      recommendations
    };

    // Store result
    this.diagnosticResults.push(result);
    
    // Log results
    this.logDiagnosticResults(result);
    
    return result;
  }

  /**
   * Detect current environment
   */
  private detectEnvironment(): string {
    if (typeof window === 'undefined') return 'server';
    
    const hostname = window.location.hostname;
    if (hostname.includes('netlify.app') || hostname.includes('netlify.com')) {
      return 'netlify';
    } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'development';
    } else if (hostname.includes('vercel.app')) {
      return 'vercel';
    } else {
      return 'production';
    }
  }

  /**
   * Test REST API connectivity
   */
  private async testRestApi(): Promise<{ success: boolean; response?: number; error?: string }> {
    try {
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!url || !key) {
        return { success: false, error: 'Missing environment variables' };
      }

      const response = await fetch(`${url}/rest/v1/`, {
        headers: { 'apikey': key },
        method: 'HEAD' // Use HEAD to avoid downloading data
      });

      return { success: true, response: response.status };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Test direct WebSocket connection
   */
  private async testDirectWebSocket(): Promise<{ 
    success: boolean; 
    error?: string; 
    closeCode?: number; 
    closeReason?: string 
  }> {
    return new Promise((resolve) => {
      try {
        const url = import.meta.env.VITE_SUPABASE_URL;
        const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        if (!url || !key) {
          resolve({ success: false, error: 'Missing environment variables' });
          return;
        }

        const wsUrl = url.replace('https://', 'wss://') + '/realtime/v1/websocket';
        const fullWsUrl = wsUrl + `?apikey=${key}&vsn=1.0.0`;
        
        console.log('🔍 [WebSocketDiagnostics] Testing WebSocket connection to:', fullWsUrl);
        
        const testWs = new WebSocket(fullWsUrl);
        
        const timeout = setTimeout(() => {
          testWs.close();
          resolve({ success: false, error: 'Connection timeout' });
        }, 10000); // 10 second timeout
        
        testWs.onopen = () => {
          clearTimeout(timeout);
          console.log('✅ [WebSocketDiagnostics] Direct WebSocket connection successful');
          testWs.close();
          resolve({ success: true });
        };
        
        testWs.onerror = (error) => {
          clearTimeout(timeout);
          console.error('❌ [WebSocketDiagnostics] Direct WebSocket connection failed:', error);
          resolve({ success: false, error: 'WebSocket error event' });
        };
        
        testWs.onclose = (event) => {
          clearTimeout(timeout);
          console.log('🔍 [WebSocketDiagnostics] WebSocket closed:', event.code, event.reason);
          resolve({ 
            success: false, 
            closeCode: event.code, 
            closeReason: event.reason || 'No reason provided' 
          });
        };
      } catch (error) {
        resolve({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });
  }

  /**
   * Check current Supabase realtime status
   */
  private checkRealtimeStatus(): 'connected' | 'disconnected' | 'connecting' {
    try {
      if (supabase.realtime.isConnected()) {
        return 'connected';
      } else if (supabase.realtime.isConnecting()) {
        return 'connecting';
      } else {
        return 'disconnected';
      }
    } catch (error) {
      console.error('❌ [WebSocketDiagnostics] Error checking realtime status:', error);
      return 'disconnected';
    }
  }

  /**
   * Assess overall connection quality
   */
  private assessConnectionQuality(
    restApi: { success: boolean },
    websocket: { success: boolean },
    realtimeStatus: string
  ): 'excellent' | 'good' | 'poor' | 'disconnected' {
    if (restApi.success && websocket.success && realtimeStatus === 'connected') {
      return 'excellent';
    } else if (restApi.success && realtimeStatus === 'connected') {
      return 'good';
    } else if (restApi.success) {
      return 'poor';
    } else {
      return 'disconnected';
    }
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    restApi: { success: boolean; error?: string },
    websocket: { success: boolean; error?: string; closeCode?: number },
    realtimeStatus: string,
    environment: string
  ): string[] {
    const recommendations: string[] = [];

    // REST API issues
    if (!restApi.success) {
      recommendations.push('Check VITE_SUPABASE_URL environment variable');
      recommendations.push('Verify Supabase project is active and accessible');
      recommendations.push('Check network connectivity and firewall settings');
    }

    // WebSocket issues
    if (!websocket.success) {
      if (websocket.closeCode === 1006) {
        recommendations.push('WebSocket connection aborted - check network stability');
      } else if (websocket.closeCode === 1015) {
        recommendations.push('TLS handshake failed - check SSL configuration');
      } else if (websocket.error?.includes('timeout')) {
        recommendations.push('WebSocket connection timeout - check network latency');
      }
      
      if (environment === 'netlify') {
        recommendations.push('Check Netlify function timeout settings');
        recommendations.push('Verify Netlify environment variables are set correctly');
        recommendations.push('Check if Netlify is blocking WebSocket connections');
      }
    }

    // Realtime status issues
    if (realtimeStatus === 'disconnected') {
      recommendations.push('Check Supabase realtime settings in dashboard');
      recommendations.push('Verify RLS policies allow realtime subscriptions');
      recommendations.push('Check if database triggers are properly configured');
    }

    // Environment-specific recommendations
    if (environment === 'netlify') {
      recommendations.push('Consider using polling fallback for Netlify deployments');
      recommendations.push('Check Netlify function cold start times');
      recommendations.push('Verify Netlify edge function configuration');
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('Connection appears healthy - monitor for intermittent issues');
    }

    return recommendations;
  }

  /**
   * Log diagnostic results
   */
  private logDiagnosticResults(result: WebSocketDiagnosticResult): void {
    console.group('🔍 [WebSocketDiagnostics] Diagnostic Results');
    console.log('Environment:', result.environment);
    console.log('Timestamp:', result.timestamp);
    console.log('Supabase URL:', result.supabaseUrl);
    console.log('REST API:', result.restApiStatus, result.restApiResponse || result.restApiError);
    console.log('WebSocket:', result.websocketStatus, result.websocketError || 'Connected');
    console.log('Realtime Status:', result.realtimeStatus);
    console.log('Connection Quality:', result.connectionQuality);
    console.log('Recommendations:', result.recommendations);
    console.groupEnd();
  }

  /**
   * Get all diagnostic results
   */
  getDiagnosticResults(): WebSocketDiagnosticResult[] {
    return [...this.diagnosticResults];
  }

  /**
   * Clear diagnostic history
   */
  clearDiagnosticHistory(): void {
    this.diagnosticResults = [];
  }

  /**
   * Export diagnostic results as JSON
   */
  exportDiagnostics(): string {
    return JSON.stringify(this.diagnosticResults, null, 2);
  }

  /**
   * Run diagnostics and return formatted report
   */
  async generateReport(): Promise<string> {
    const result = await this.runDiagnostics();
    
    return `
WebSocket Connection Diagnostic Report
====================================

Environment: ${result.environment}
Timestamp: ${result.timestamp}
Supabase URL: ${result.supabaseUrl}

REST API Status: ${result.restApiStatus}
${result.restApiResponse ? `Response Code: ${result.restApiResponse}` : `Error: ${result.restApiError}`}

WebSocket Status: ${result.websocketStatus}
${result.websocketError ? `Error: ${result.websocketError}` : ''}
${result.websocketCloseCode ? `Close Code: ${result.websocketCloseCode}` : ''}
${result.websocketCloseReason ? `Close Reason: ${result.websocketCloseReason}` : ''}

Realtime Status: ${result.realtimeStatus}
Connection Quality: ${result.connectionQuality}

Recommendations:
${result.recommendations.map(rec => `- ${rec}`).join('\n')}

Generated by Breath Safe WebSocket Diagnostics
    `.trim();
  }
}

// Export singleton instance
export const webSocketDiagnostics = WebSocketDiagnostics.getInstance();

// Export convenience functions
export const runWebSocketDiagnostics = () => webSocketDiagnostics.runDiagnostics();
export const generateWebSocketReport = () => webSocketDiagnostics.generateReport();
export const getWebSocketDiagnosticHistory = () => webSocketDiagnostics.getDiagnosticResults();
