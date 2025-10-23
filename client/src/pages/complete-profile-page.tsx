import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const logoPath = "/thinklink-logo.png";

export default function CompleteProfilePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    fullName: "",
    profilePictureUrl: "",
    birthdate: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateFormData = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculateAge = (birthdate: string): number => {
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Age validation
      const age = calculateAge(formData.birthdate);
      if (age < 18) {
        toast({
          title: "ההרשמה מותרת מגיל 18 ומעלה בלבד",
          description: "אנא בדקו את תאריך הלידה שהזנתם",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast({
          title: "שגיאה באימות המשתמש",
          description: "אנא התחברו מחדש",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      // Prepare profile data with snake_case keys
      const profileData = {
        id: user.id,
        full_name: formData.fullName,
        avatar_url: formData.profilePictureUrl || null,
        birthdate: formData.birthdate
      };

      // Save profile data
      const { error: saveError } = await supabase
        .from('profiles')
        .upsert(profileData);

      if (saveError) {
        console.error('Error saving profile:', saveError);
        toast({
          title: "שגיאה בשמירת הפרופיל",
          description: "אנא נסו שוב מאוחר יותר",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      // Success - refresh profile status and navigate to homepage
      toast({
        title: "הפרופיל נשמר בהצלחה!",
        description: "ברוכים הבאים ל-ThinkLink"
      });
      
      // Refresh the profile completion status in the auth context
      // This will trigger the ProfileGatekeeper to allow access to the app
      window.location.reload();
      
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "שגיאה לא צפויה",
        description: "אנא נסו שוב מאוחר יותר",
        variant: "destructive"
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f9ff] flex items-center justify-center px-6" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-4">
            <img src={logoPath} alt="ThinkLink" className="h-12 w-auto" />
          </div>
          <CardTitle className="text-2xl font-bold text-[#1b1b1b]">
            השלמת פרופיל
          </CardTitle>
          <p className="text-[#9AA0A6] text-sm mt-2">
            כדי להתחיל להשתמש באפליקציה, אנא מלאו את הפרטים הבאים
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <div>
              <Label htmlFor="fullName" className="text-[#1b1b1b] font-medium">
                שם מלא (בעברית) *
              </Label>
              <Input
                id="fullName"
                type="text"
                value={formData.fullName}
                onChange={(e) => updateFormData("fullName", e.target.value)}
                placeholder="הקלדו את שמכם המלא"
                required
                className="mt-2"
                data-testid="input-full-name"
              />
            </div>

            {/* Profile Picture URL */}
            <div>
              <Label htmlFor="profilePictureUrl" className="text-[#1b1b1b] font-medium">
                קישור לתמונת פרופיל (URL)
              </Label>
              <Input
                id="profilePictureUrl"
                type="url"
                value={formData.profilePictureUrl}
                onChange={(e) => updateFormData("profilePictureUrl", e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="mt-2"
                data-testid="input-profile-picture-url"
              />
              <p className="text-[#9AA0A6] text-xs mt-1">
                בהמשך נוסיף אפשרות להעלאת קובץ
              </p>
            </div>

            {/* Birthdate */}
            <div>
              <Label htmlFor="birthdate" className="text-[#1b1b1b] font-medium">
                תאריך לידה *
              </Label>
              <Input
                id="birthdate"
                type="date"
                value={formData.birthdate}
                onChange={(e) => updateFormData("birthdate", e.target.value)}
                required
                className="mt-2 [&::-webkit-calendar-picker-indicator]:ml-2"
                dir="ltr"
                data-testid="input-birthdate"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-[#8c52ff] to-[#5ce1e6] hover:opacity-90 text-white font-semibold py-3 mt-8 disabled:opacity-50"
              data-testid="button-submit-profile"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  שומר...
                </>
              ) : (
                "שמירה והמשך לאפליקציה"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
