import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { availableTopics } from "@/constants/topics";

const logoPath = "/thinklink-logo.png";

export default function CompleteProfilePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { refreshProfileStatus } = useAuth();
  
  const [formData, setFormData] = useState({
    fullName: "",
    birthdate: "",
    instagramUrl: "",
    aboutMe: ""
  });
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateFormData = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleInterestToggle = (interest: string) => {
    setSelectedInterests(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
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

      // Handle avatar file upload if selected
      let avatarUrl: string | null = null;
      if (avatarFile) {
        try {
          // Create unique file path
          const fileExtension = avatarFile.name.split('.').pop();
          const filePath = `${user.id}/avatar-${Date.now()}.${fileExtension}`;
          
          // Upload file to Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, avatarFile);
          
          if (uploadError) {
            console.error('Error uploading avatar:', uploadError);
            toast({
              title: "שגיאה בהעלאת התמונה",
              description: "אנא נסו שוב מאוחר יותר",
              variant: "destructive"
            });
            setIsSubmitting(false);
            return;
          }
          
          // Get public URL for the uploaded file
          const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);
          
          avatarUrl = urlData.publicUrl;
        } catch (error) {
          console.error('Unexpected error uploading avatar:', error);
          toast({
            title: "שגיאה בהעלאת התמונה",
            description: "אנא נסו שוב מאוחר יותר",
            variant: "destructive"
          });
          setIsSubmitting(false);
          return;
        }
      }

      // Prepare profile data with snake_case keys
      const profileData = {
        id: user.id,
        full_name: formData.fullName,
        avatar_url: avatarUrl,
        birthdate: formData.birthdate,
        instagram_url: formData.instagramUrl || null,
        about_me: formData.aboutMe || null,
        interests: selectedInterests.length > 0 ? selectedInterests : null
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
      
      // Refresh profile status and navigate to homepage
      await refreshProfileStatus();
      setLocation('/');
      
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

            {/* Profile Picture Upload */}
            <div>
              <Label htmlFor="avatarFile" className="text-[#1b1b1b] font-medium">
                העלאת תמונת פרופיל
              </Label>
              <Input
                id="avatarFile"
                type="file"
                accept="image/png, image/jpeg, image/jpg"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setAvatarFile(file);
                }}
                className="mt-2"
                data-testid="input-avatar-file"
              />
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

            {/* Instagram URL */}
            <div>
              <Label htmlFor="instagramUrl" className="text-[#1b1b1b] font-medium">
                קישור לאינסטגרם
              </Label>
              <Input
                id="instagramUrl"
                type="url"
                value={formData.instagramUrl}
                onChange={(e) => updateFormData("instagramUrl", e.target.value)}
                placeholder="https://instagram.com/yourusername"
                className="mt-2"
                data-testid="input-instagram-url"
              />
            </div>

            {/* About Me */}
            <div>
              <Label htmlFor="aboutMe" className="text-[#1b1b1b] font-medium">
                קצת עליי
              </Label>
              <Textarea
                id="aboutMe"
                value={formData.aboutMe}
                onChange={(e) => updateFormData("aboutMe", e.target.value)}
                placeholder="ספרו קצת על עצמכם..."
                rows={4}
                className="mt-2 resize-none"
                data-testid="textarea-about-me"
              />
            </div>

            {/* Interests */}
            <div>
              <Label className="text-[#1b1b1b] font-medium">
                תחומי עניין
              </Label>
              <div className="mt-2 grid grid-cols-2 gap-3">
                {availableTopics.map((topic) => (
                  <div key={topic} className="flex items-center space-x-2">
                    <Checkbox
                      id={`interest-${topic}`}
                      checked={selectedInterests.includes(topic)}
                      onCheckedChange={() => handleInterestToggle(topic)}
                    />
                    <Label
                      htmlFor={`interest-${topic}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {topic}
                    </Label>
                  </div>
                ))}
              </div>
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
