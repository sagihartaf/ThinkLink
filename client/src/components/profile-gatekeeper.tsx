import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export function ProfileGatekeeper({ children }: { children: React.ReactNode }) {
  const { user, isLoading, profileComplete } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Only run redirect logic if we have a user and profile check is complete
    if (user && profileComplete !== null) {
      // If profile is incomplete, redirect to complete-profile page
      if (!profileComplete) {
        setLocation("/complete-profile");
      }
    }
  }, [user, profileComplete, setLocation]);

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
