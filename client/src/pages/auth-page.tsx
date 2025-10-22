import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, useSearch } from "wouter";
import { Onboarding } from "@/components/onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
const logoPath = "/thinklink-logo.png";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  
  // Extract redirectTo parameter from URL
  const urlParams = new URLSearchParams(search);
  const redirectTo = urlParams.get('redirectTo');
  
  const [showOnboarding, setShowOnboarding] = useState(() => {
    // Check if onboarding was already completed in this session
    return sessionStorage.getItem('onboardingComplete') !== 'true';
  });
  const [showAuth, setShowAuth] = useState(() => {
    // If onboarding was completed and there's a redirectTo, show auth immediately
    return sessionStorage.getItem('onboardingComplete') === 'true' && !!redirectTo;
  });
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [rememberMe, setRememberMe] = useState(true); // Default to true for persistent login

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      // Use redirectTo parameter if available, otherwise go to home
      const destination = redirectTo || "/home";
      setLocation(destination);
    }
  }, [user, setLocation, redirectTo]);

  if (user) {
    return null;
  }

  const handleOnboardingComplete = () => {
    // Mark onboarding as completed in session storage
    sessionStorage.setItem('onboardingComplete', 'true');
    
    setShowOnboarding(false);
    // If there's a redirectTo parameter, go to auth instead of home
    if (redirectTo) {
      setShowAuth(true);
    } else {
      setLocation("/home"); // Go directly to home if no redirect needed
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLogin) {
      try {
        await loginMutation.mutateAsync({ email, password, rememberMe });
        // Redirect will be handled by useEffect when user state updates
      } catch (error) {
        // Error handled by mutation
      }
    } else {
      try {
        await registerMutation.mutateAsync({ 
          email, 
          password, 
          displayName: email.split('@')[0] // Temporary display name
        });
        setShowAuth(false);
        setShowProfileSetup(true);
      } catch (error) {
        // Error handled by mutation
      }
    }
  };

  const handleProfileSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "שגיאה",
        description: "משתמש לא מחובר",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          full_name: displayName,
          avatar_url: photoUrl || null
        });
      
      if (error) throw error;
      
      toast({
        title: "הפרופיל עודכן בהצלחה!",
        description: "המשך לאפליקציה"
      });
      
      // Redirect will be handled by useEffect when user state updates
    } catch (error: any) {
      console.error("Profile setup failed:", error);
      toast({
        title: "עדכון פרופיל נכשל",
        description: error.message || "שגיאת רשת",
        variant: "destructive"
      });
    }
  };

  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  if (showProfileSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#f4f9ff]" dir="rtl">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <img src={logoPath} alt="ThinkLink" className="mx-auto h-14" />
            <div>
              <CardTitle className="text-2xl">השלימו את הפרופיל</CardTitle>
              <p className="text-muted-foreground mt-2">ספרו לנו קצת על עצמכם</p>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSetup} className="space-y-6">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#8c52ff] to-[#5ce1e6] flex items-center justify-center text-white text-2xl font-bold">
                    {displayName.charAt(0).toUpperCase() || "👤"}
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="displayName">שם מלא *</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="שם פרטי ושם משפחה"
                    required
                    className="text-right"
                    data-testid="input-display-name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="photoUrl">תמונת פרופיל (אופציונלי)</Label>
                  <Input
                    id="photoUrl"
                    type="url"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    placeholder="קישור לתמונה"
                    dir="ltr"
                    data-testid="input-photo-url"
                  />
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full py-4 bg-gradient-to-r from-[#8c52ff] to-[#5ce1e6] hover:opacity-90"
                data-testid="button-complete-profile"
              >
                סיום והמשך לאפליקציה
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#f4f9ff]" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <img src={logoPath} alt="ThinkLink" className="mx-auto h-14" />
          <div>
            <CardTitle className="text-2xl">
              {isLogin ? "כניסה למערכת" : "הרשמה למערכת"}
            </CardTitle>
            <p className="text-muted-foreground mt-2">
              {isLogin ? "הזינו את פרטי הכניסה שלכם" : "הזינו את פרטיכם להרשמה"}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <Label htmlFor="email">כתובת אימייל</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                required
                dir="ltr"
                data-testid="input-email"
              />
            </div>
            
            <div>
              <Label htmlFor="password">סיסמה</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="סיסמה"
                required
                data-testid="input-password"
              />
            </div>
            
            {isLogin && (
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="rememberMe"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  data-testid="checkbox-remember-me"
                />
                <Label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer">
                  זכור אותי (הישאר מחובר לתמיד)
                </Label>
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full py-4 bg-gradient-to-r from-[#8c52ff] to-[#5ce1e6] hover:opacity-90"
              disabled={loginMutation.isPending || registerMutation.isPending}
              data-testid="button-submit-auth"
            >
              {(loginMutation.isPending || registerMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isLogin ? "כניסה" : "הרשמה"}
            </Button>
          </form>
          
          <div className="text-center mt-4">
            <Button
              variant="link"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm"
              data-testid="button-toggle-auth-mode"
            >
              {isLogin ? "אין לכם חשבון? הרשמו כאן" : "יש לכם חשבון? היכנסו כאן"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
