import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAppStore } from '@/store';
import { supabase } from '@/integrations/supabase/client';
import { 
  Database, 
  Download, 
  Upload, 
  Trash2, 
  RotateCcw, 
  AlertTriangle,
  FileText,
  HardDrive
} from 'lucide-react';
import { defaultSettings } from '@/constants/defaultSettings';
import { validateSettingsStructure, sanitizeSettings } from '@/utils/settingsValidator';
import { clearAppStorage, clearCacheStorage, getStorageSize, formatBytes } from '@/utils/storageManager';
import { MAX_IMPORT_FILE_SIZE } from '@/constants/defaultSettings';

interface DataSettingsProps {
  currentSettings: typeof defaultSettings;
  onSettingsUpdate: (settings: typeof defaultSettings) => void;
}

export default function DataSettings({ currentSettings, onSettingsUpdate }: DataSettingsProps) {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [clearCacheDialogOpen, setClearCacheDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [storageInfo, setStorageInfo] = useState(getStorageSize());

  // Update storage info periodically
  const updateStorageInfo = useCallback(() => {
    setStorageInfo(getStorageSize());
  }, []);

  const handleExportData = useCallback(async () => {
    try {
      const exportData = {
        settings: currentSettings,
        exportDate: new Date().toISOString(),
        appVersion: '1.0.0', // Could be from package.json
        exportedFrom: navigator.userAgent,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `breath-safe-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: "Your settings have been exported successfully",
      });
    } catch (error: any) {
      console.error('Export failed:', error);
      toast({
        title: "Export Failed",
        description: error?.message || "Failed to export settings. Please try again.",
        variant: "destructive",
      });
    }
  }, [currentSettings, toast]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > MAX_IMPORT_FILE_SIZE) {
      toast({
        title: "File too large",
        description: `File size exceeds ${formatBytes(MAX_IMPORT_FILE_SIZE)}. Please select a smaller file.`,
        variant: "destructive",
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Validate file type
    if (!file.name.endsWith('.json')) {
      toast({
        title: "Invalid file type",
        description: "Please select a JSON file.",
        variant: "destructive",
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setImportDialogOpen(true);
  }, [toast]);

  const handleImportData = useCallback(async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      // Read file
      const text = await file.text();
      
      // Parse JSON
      let parsedData;
      try {
        parsedData = JSON.parse(text);
      } catch (parseError) {
        throw new Error('Invalid JSON format. The file may be corrupted.');
      }

      // Validate structure
      const validation = validateSettingsStructure(parsedData);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid file format');
      }

      // Sanitize and apply settings
      const sanitized = sanitizeSettings(parsedData);
      onSettingsUpdate(sanitized);

      // Save to localStorage
      localStorage.setItem('breath-safe-app-settings', JSON.stringify(sanitized));

      toast({
        title: "Import successful",
        description: "Your settings have been imported successfully.",
      });

      setImportDialogOpen(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      updateStorageInfo();
    } catch (error: any) {
      console.error('Import failed:', error);
      toast({
        title: "Import failed",
        description: error?.message || "Failed to import settings. Please check the file format.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [onSettingsUpdate, toast, updateStorageInfo]);

  const handleClearCache = useCallback(() => {
    try {
      // Clear app store cache
      useAppStore.getState().clearCache();
      
      // Clear cache-prefixed localStorage
      const result = clearCacheStorage();
      
      updateStorageInfo();

      toast({
        title: "Cache cleared",
        description: `Cleared ${result.cleared} cache entries.`,
      });

      setClearCacheDialogOpen(false);
    } catch (error: any) {
      console.error('Clear cache failed:', error);
      toast({
        title: "Clear failed",
        description: "Failed to clear cache. Please try again.",
        variant: "destructive",
      });
    }
  }, [toast, updateStorageInfo]);

  const handleResetSettings = useCallback(() => {
    try {
      // Apply default settings
      onSettingsUpdate(defaultSettings);
      
      // Save to localStorage
      localStorage.setItem('breath-safe-app-settings', JSON.stringify(defaultSettings));

      toast({
        title: "Settings reset",
        description: "All settings have been reset to defaults.",
      });

      setResetDialogOpen(false);
      updateStorageInfo();
    } catch (error: any) {
      console.error('Reset failed:', error);
      toast({
        title: "Reset failed",
        description: "Failed to reset settings. Please try again.",
        variant: "destructive",
      });
    }
  }, [onSettingsUpdate, toast, updateStorageInfo]);

  const handleDeleteAllData = useCallback(async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User ID not found. Please try refreshing the page.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Delete profile from database
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      // Clear all app-specific localStorage
      clearAppStorage();

      // Sign out user
      await signOut();

      toast({
        title: "Account deleted",
        description: "All your data has been deleted successfully.",
      });

      // Navigate to home
      navigate('/');
    } catch (error: any) {
      console.error('Delete all data failed:', error);
      toast({
        title: "Delete failed",
        description: error?.message || "We could not delete your data. Please try again later or contact support if the problem persists.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setDeleteAllDialogOpen(false);
    }
  }, [user?.id, signOut, toast, navigate]);

  return (
    <div className="space-y-4">
      {/* Storage Information */}
      <GlassCard variant="default">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Storage Information
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">App Data:</span>
            <span className="font-medium">{formatBytes(storageInfo.app)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Cache:</span>
            <span className="font-medium">{formatBytes(storageInfo.cache)}</span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t">
            <span className="text-muted-foreground">Total:</span>
            <span className="font-medium">{formatBytes(storageInfo.total)}</span>
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Data Export */}
      <GlassCard variant="default">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Data Export
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Export Settings</Label>
            <p className="text-sm text-muted-foreground">
              Export your settings and preferences as a JSON file
            </p>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2"
              onClick={handleExportData}
            >
              <Download className="h-4 w-4" />
              Export Settings
            </Button>
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Data Import */}
      <GlassCard variant="default">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Data Import
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Import Settings</Label>
            <p className="text-sm text-muted-foreground">
              Import settings from a previously exported JSON file (max {formatBytes(MAX_IMPORT_FILE_SIZE)})
            </p>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Choose File
            </Button>
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Cache Management */}
      <GlassCard variant="default">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Cache Management
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Clear Cache</Label>
            <p className="text-sm text-muted-foreground">
              Clear all cached data to free up storage space
            </p>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2"
              onClick={() => setClearCacheDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Clear Cache
            </Button>
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Reset Settings */}
      <GlassCard variant="default">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Reset Settings
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Reset to Defaults</Label>
            <p className="text-sm text-muted-foreground">
              Reset all settings to their default values
            </p>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2"
              onClick={() => setResetDialogOpen(true)}
            >
              <RotateCcw className="h-4 w-4" />
              Reset Settings
            </Button>
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Danger Zone - Delete All Data */}
      <GlassCard variant="default" className="border-destructive/50 bg-destructive/5">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-destructive">Delete All Data</Label>
            <p className="text-sm text-muted-foreground">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <Button 
              variant="destructive" 
              className="w-full justify-start gap-2"
              onClick={() => setDeleteAllDialogOpen(true)}
              disabled={isProcessing}
            >
              <Trash2 className="h-4 w-4" />
              {isProcessing ? 'Deleting...' : 'Delete All Data'}
            </Button>
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Import Confirmation Dialog */}
      <AlertDialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import Settings</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to import settings from this file? This will replace your current settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleImportData} disabled={isProcessing}>
              {isProcessing ? 'Importing...' : 'Import'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear Cache Confirmation Dialog */}
      <AlertDialog open={clearCacheDialogOpen} onOpenChange={setClearCacheDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Cache</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear all cached data. The app may need to reload some data. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearCache}>
              Clear Cache
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Settings Confirmation Dialog */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Settings</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset all settings to their default values. This action cannot be undone. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetSettings} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Data Confirmation Dialog */}
      <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Delete All Data</AlertDialogTitle>
            <AlertDialogDescription>
              Are you absolutely sure? This will permanently delete your account and all associated data including your profile, points, history, and settings. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllData}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? 'Deleting...' : 'Delete All Data'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

