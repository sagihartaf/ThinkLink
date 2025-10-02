import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Onboarding } from "@/components/onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import logoPath from "@assets/Untitled design 2.png";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  // Redirect if already logged in
  if (user) {
    setLocation("/home");
    return null;
  }

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setShowAuth(true);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLogin) {
      try {
        await loginMutation.mutateAsync({ email, password });
        setLocation("/home");
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
    
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ displayName, photoUrl: photoUrl || undefined })
      });
      
      if (response.ok) {
        setLocation("/home");
      }
    } catch (error) {
      console.error("Profile setup failed:", error);
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
