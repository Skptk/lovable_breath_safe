import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { debugTracker } from '@/utils/errorTracker';

interface MaintenanceGateProps {
  children: React.ReactNode;
}

const MAINTENANCE_BYPASS_KEY = 'breath-safe:maintenance-bypass';

const MaintenanceGate: React.FC<MaintenanceGateProps> = ({ children }) => {
  const [accessGranted, setAccessGranted] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMaintenance, setIsMaintenance] = useState(false);

  useEffect(() => {
    const maintenanceFlag = import.meta.env['VITE_MAINTENANCE_MODE'];
    const maintenanceEnabled = (maintenanceFlag ?? 'true') === 'true';
    setIsMaintenance(maintenanceEnabled);

    if (!maintenanceEnabled) {
      setAccessGranted(true);
      return;
    }

    try {
      const bypassToken = sessionStorage.getItem(MAINTENANCE_BYPASS_KEY);
      const expectedToken = import.meta.env['VITE_MAINTENANCE_TOKEN'] ?? 'development-only';
      if (bypassToken && expectedToken && bypassToken === expectedToken) {
        setAccessGranted(true);
      }
    } catch (err) {
      console.warn('MaintenanceGate: Failed to read session storage', err);
    }
  }, []);

  useEffect(() => {
    if (accessGranted && (typeof __TRACK_VARIABLES__ === 'undefined' || __TRACK_VARIABLES__)) {
      debugTracker.trackVariableAccess('MaintenanceGate', 'MaintenanceGate.tsx:accessGranted');
    }
  }, [accessGranted]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const expectedToken = import.meta.env['VITE_MAINTENANCE_TOKEN'] ?? 'development-only';
      if (expectedToken && password === expectedToken) {
        sessionStorage.setItem(MAINTENANCE_BYPASS_KEY, expectedToken);
        setAccessGranted(true);
        setPassword('');
        return;
      }

      setError('Invalid maintenance password.');
    } catch (err) {
      console.error('MaintenanceGate: Failed to validate password', err);
      setError('Unable to validate password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMaintenance || accessGranted) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-6">
      <div className="max-w-lg w-full space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Breath Safe Maintenance</h1>
          <p className="text-gray-400">
            The dashboard is currently under maintenance. Authorized team members can enter the maintenance password to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="maintenance-password" className="text-sm font-medium text-gray-300">
              Maintenance Password
            </label>
            <Input
              id="maintenance-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter maintenance password"
              className="bg-gray-900 border-gray-700 text-white"
              autoComplete="off"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Verifying...' : 'Enter Dashboard'}
          </Button>
        </form>

        <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-4 text-sm text-gray-400 space-y-2">
          <p className="font-semibold text-gray-200">Scheduled maintenance</p>
          <p>Please check the engineering Slack channel for updates. If you believe this is unexpected, contact the build engineer.</p>
          <p className="text-xs text-gray-500">
            Use password <code>development-only</code> unless overridden via <code>VITE_MAINTENANCE_TOKEN</code>.
          </p>
          <p className="text-xs text-gray-500">Timestamp: {new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceGate;
