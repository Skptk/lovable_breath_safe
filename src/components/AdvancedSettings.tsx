import { useState, useEffect } from 'react';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { 
  Settings, 
  Code, 
  Eye, 
  Type, 
  Contrast,
  Gauge,
  Activity,
  Monitor
} from 'lucide-react';

export default function AdvancedSettings() {
  const {
    fontSize,
    highContrast,
    reducedMotion,
    setFontSize,
    setHighContrast,
    setReducedMotion,
  } = useAccessibility();

  const [developerMode, setDeveloperMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('breath-safe-developer-mode') === 'true';
    }
    return false;
  });

  const [debugLogging, setDebugLogging] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('breath-safe-debug-logging') === 'true';
    }
    return false;
  });

  const [performanceMetrics, setPerformanceMetrics] = useState({
    memoryUsage: 0,
    renderTime: 0,
  });

  // Update developer mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('breath-safe-developer-mode', String(developerMode));
    }
  }, [developerMode]);

  // Update debug logging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('breath-safe-debug-logging', String(debugLogging));
      // Could set a global flag for debug logging here
      if ((window as any).__DEBUG_LOGGING__ !== undefined) {
        (window as any).__DEBUG_LOGGING__ = debugLogging;
      }
    }
  }, [debugLogging]);

  // Performance monitoring
  useEffect(() => {
    if (!developerMode) return;

    const updateMetrics = () => {
      // Memory usage (if available)
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setPerformanceMetrics(prev => ({
          ...prev,
          memoryUsage: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
        }));
      }

      // Measure render time
      const start = performance.now();
      requestAnimationFrame(() => {
        const end = performance.now();
        setPerformanceMetrics(prev => ({
          ...prev,
          renderTime: Math.round(end - start),
        }));
      });
    };

    const interval = setInterval(updateMetrics, 2000);
    updateMetrics();

    return () => clearInterval(interval);
  }, [developerMode]);

  // Get API endpoint (from environment)
  const apiEndpoint = import.meta.env.VITE_SUPABASE_URL || 'Not configured';

  return (
    <div className="space-y-4">
      {/* Developer Options */}
      <GlassCard variant="default">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Developer Options
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="developer-mode">Developer Mode</Label>
              <p className="text-sm text-muted-foreground">
                Enable developer tools and advanced features
              </p>
            </div>
            <Switch
              id="developer-mode"
              checked={developerMode}
              onCheckedChange={setDeveloperMode}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="debug-logging">Debug Logging</Label>
              <p className="text-sm text-muted-foreground">
                Enable verbose console logging for debugging
              </p>
            </div>
            <Switch
              id="debug-logging"
              checked={debugLogging}
              onCheckedChange={setDebugLogging}
            />
          </div>

          {developerMode && (
            <div className="space-y-2 pt-4 border-t">
              <Label>API Endpoint</Label>
              <p className="text-sm font-mono text-muted-foreground break-all">
                {apiEndpoint}
              </p>
            </div>
          )}
        </GlassCardContent>
      </GlassCard>

      {/* Performance Metrics */}
      {developerMode && (
        <GlassCard variant="default">
          <GlassCardHeader>
            <GlassCardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              Performance Metrics
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Memory Usage</Label>
                <p className="text-lg font-semibold">{performanceMetrics.memoryUsage} MB</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Render Time</Label>
                <p className="text-lg font-semibold">{performanceMetrics.renderTime} ms</p>
              </div>
            </div>
          </GlassCardContent>
        </GlassCard>
      )}

      {/* Accessibility Settings */}
      <GlassCard variant="default">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Accessibility Settings
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="font-size">Font Size</Label>
            <p className="text-sm text-muted-foreground">
              Adjust the base font size for better readability
            </p>
            <Select
              value={fontSize}
              onValueChange={(value: 'small' | 'medium' | 'large') => setFontSize(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small (14px)</SelectItem>
                <SelectItem value="medium">Medium (16px)</SelectItem>
                <SelectItem value="large">Large (18px)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="high-contrast">High Contrast Mode</Label>
              <p className="text-sm text-muted-foreground">
                Increase contrast for better visibility
              </p>
            </div>
            <Switch
              id="high-contrast"
              checked={highContrast}
              onCheckedChange={setHighContrast}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="reduced-motion">Reduced Motion</Label>
              <p className="text-sm text-muted-foreground">
                Disable animations and transitions
              </p>
            </div>
            <Switch
              id="reduced-motion"
              checked={reducedMotion}
              onCheckedChange={setReducedMotion}
            />
          </div>
        </GlassCardContent>
      </GlassCard>
    </div>
  );
}

