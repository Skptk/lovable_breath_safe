import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { supabase } from '@/integrations/supabase/client';
import { User, LogOut, Trash2, Mail, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function AccountSettings() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [memberSince, setMemberSince] = useState<string | null>(null);

  // Fetch member since date from profile
  useEffect(() => {
    const fetchMemberSince = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('created_at')
          .eq('user_id', user.id)
          .single();

        if (!error && data?.created_at) {
          setMemberSince(data.created_at);
        }
      } catch (error) {
        console.error('Failed to fetch member since date:', error);
      }
    };

    fetchMemberSince();
  }, [user?.id]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
      // Navigate to home after sign out
      navigate('/');
    } catch (error: any) {
      console.error('Error signing out:', error);
      toast({
        title: "Sign out failed",
        description: error?.message || "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  }, [signOut, toast, navigate]);

  const handleDeleteAccount = useCallback(async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User ID not found. Please try refreshing the page.",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);

    try {
      // Delete profile from database
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      // Clear app-specific localStorage keys
      const appKeys = [
        'breath-safe-app-settings',
        'breath-safe-store',
        'breath-safe-cache',
        'breath-safe-',
      ];

      // Remove all keys that start with app prefixes
      Object.keys(localStorage).forEach(key => {
        if (
          appKeys.some(prefix => key.startsWith(prefix)) ||
          key.includes('breath-safe')
        ) {
          localStorage.removeItem(key);
        }
      });

      // Sign out user
      await signOut();

      toast({
        title: "Account deleted",
        description: "Your account has been deleted successfully.",
      });

      // Navigate to home
      navigate('/');
    } catch (error: any) {
      console.error('Failed to delete account:', error);
      toast({
        title: "Delete failed",
        description: error?.message || "We could not delete your account. Please try again later or contact support if the problem persists.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  }, [user?.id, signOut, toast, navigate]);

  if (!user) {
    return (
      <GlassCard variant="default">
        <GlassCardContent className="p-6 text-center">
          <p className="text-muted-foreground">Please sign in to view account settings.</p>
        </GlassCardContent>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Account Information */}
      <GlassCard variant="default">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account Information
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Email
            </Label>
            <p className="text-sm font-medium">{user.email || 'Not provided'}</p>
          </div>

          {memberSince && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Member Since
              </Label>
              <p className="text-sm font-medium">
                {format(new Date(memberSince), 'MMMM d, yyyy')}
              </p>
            </div>
          )}
        </GlassCardContent>
      </GlassCard>

      {/* Account Actions */}
      <GlassCard variant="default">
        <GlassCardHeader>
          <GlassCardTitle>Account Actions</GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent className="space-y-4">
          {/* Sign Out */}
          <div className="space-y-2">
            <Label>Sign Out</Label>
            <p className="text-sm text-muted-foreground">
              Sign out of your account. You can sign back in anytime.
            </p>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => setSignOutDialogOpen(true)}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>

          {/* Delete Account */}
          <div className="space-y-2 pt-4 border-t">
            <Label className="text-destructive">Delete Account</Label>
            <p className="text-sm text-muted-foreground">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <Button
              variant="destructive"
              className="w-full justify-start gap-2"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? 'Deleting...' : 'Delete Account'}
            </Button>
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Sign Out Confirmation Dialog */}
      <AlertDialog open={signOutDialogOpen} onOpenChange={setSignOutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out? You can sign back in anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOut}>
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete your account? This action cannot be undone. All your data, including your profile, points, and history, will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete Account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

