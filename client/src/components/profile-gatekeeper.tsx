import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function ProfileGatekeeper({ children }: { children: React.ReactNode }) {
  const { user, isLoading, profileComplete } = useAuth();
  const [location, setLocation] = useLocation();

  // Function to refresh profile completion status
  const refreshProfileStatus = async () => {
    if (user) {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // Profile doesn't exist, trigger re-check in auth context
            window.location.reload();
          }
        } else if (profile?.full_name) {
          // Profile is complete, trigger re-check in auth context
          window.location.reload();
        }
      } catch (error) {
        console.error('Error refreshing profile status:', error);
      }
    }
  };

  useEffect(() => {
    // Only run redirect logic if we have a user and profile check is complete
    if (user && profileComplete !== null) {
      // If profile is incomplete, redirect to complete-profile page
      if (!profileComplete) {
        setLocation("/complete-profile");
      }
    }
  }, [user, profileComplete, setLocation]);

  // Listen for route changes to refresh profile status when leaving complete-profile page
  useEffect(() => {
    if (location === '/' && user && profileComplete === false) {
      // User navigated to homepage but profile is still incomplete
      // Refresh profile status to check if it was completed
      refreshProfileStatus();
    }
  }, [location, user, profileComplete]);

  // Show loading while checking auth or profile
  if (isLoading || (user && profileComplete === null)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f4f9ff]">
        <Loader2 className="h-8 w-8 animate-spin text-[#8c52ff]" />
      </div>
    );
  }

  return <>{children}</>;
}
