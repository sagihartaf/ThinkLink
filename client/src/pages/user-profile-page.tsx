import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { BottomNav } from "@/components/bottom-nav";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useLocation } from "wouter";

// Helper function to validate UUID
const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

export default function UserProfilePage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [profile, setProfile] = useState<{
    id: string;
    full_name: string;
    avatar_url: string | null;
    instagram_url: string | null;
    birthdate: string | null;
  } | null>(null);

  // Fetch profile data
  const { data: profileData, isLoading, error } = useQuery({
    queryKey: ["user-profile", id],
    queryFn: async () => {
      if (!id) throw new Error("User ID is required");
      
      // Validate UUID format before making the query
      if (!isValidUUID(id)) {
        throw new Error("מזהה משתמש לא תקין");
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, instagram_url, birthdate')
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error("משתמש לא נמצא");
        }
        throw error;
      }
      
      return data;
    },
    enabled: !!id && isValidUUID(id)
  });

  useEffect(() => {
    if (profileData) {
      setProfile(profileData);
    }
  }, [profileData]);

  const handleBack = () => {
    setLocation(-1); // Go back to previous page
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f4f9ff] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#8c52ff]" />
          <p className="text-[#1b1b1b]">טוען פרופיל...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f4f9ff] flex items-center justify-center">
        <Card className="p-8 max-w-md w-full mx-4">
          <div className="text-center space-y-4">
            <h1 className="text-xl font-bold text-[#1b1b1b]">שגיאה</h1>
            <p className="text-[#9AA0A6]">
              {error.message || "לא ניתן לטעון את הפרופיל"}
            </p>
            <Button onClick={handleBack} variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              חזרה
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#f4f9ff] flex items-center justify-center">
        <Card className="p-8 max-w-md w-full mx-4">
          <div className="text-center space-y-4">
            <h1 className="text-xl font-bold text-[#1b1b1b]">משתמש לא נמצא</h1>
            <p className="text-[#9AA0A6]">הפרופיל המבוקש אינו קיים</p>
            <Button onClick={handleBack} variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              חזרה
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f9ff]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            onClick={handleBack}
            variant="ghost"
            size="sm"
            className="p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-[#1b1b1b]">פרופיל משתמש</h1>
        </div>
      </div>

      {/* Profile Content */}
      <div className="p-4 space-y-6">
        <Card className="p-6">
          <div className="text-center space-y-4">
            {/* Avatar */}
            <div className="flex justify-center">
              <Avatar className="w-24 h-24">
                <AvatarImage 
                  src={profile.avatar_url || undefined} 
                  alt={profile.full_name}
                />
                <AvatarFallback className="bg-gradient-to-br from-[#8c52ff] to-[#5ce1e6] text-white text-2xl font-bold">
                  {profile.full_name?.charAt(0).toUpperCase() || "👤"}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Name */}
            <div>
              <h2 className="text-2xl font-bold text-[#1b1b1b]">
                {profile.full_name}
              </h2>
            </div>

            {/* Instagram Link */}
            {profile.instagram_url && (
              <div className="pt-2">
                <a 
                  href={profile.instagram_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[#8c52ff] hover:text-[#5ce1e6] transition-colors"
                >
                  <img 
                    src="/icons/instagram-color-svgrepo-com.svg" 
                    alt="Instagram" 
                    className="w-5 h-5" 
                  />
                  <span className="text-sm">אינסטגרם</span>
                </a>
              </div>
            )}
          </div>
        </Card>

        {/* Additional Info Card */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-[#1b1b1b] mb-4">מידע נוסף</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[#9AA0A6]">שם מלא:</span>
              <span className="text-[#1b1b1b] font-medium">{profile.full_name}</span>
            </div>
            {profile.birthdate && (
              <div className="flex justify-between items-center">
                <span className="text-[#9AA0A6]">תאריך לידה:</span>
                <span className="text-[#1b1b1b] font-medium">
                  {new Date(profile.birthdate).toLocaleDateString('he-IL')}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-[#9AA0A6]">מזהה משתמש:</span>
              <span className="text-[#1b1b1b] font-mono text-sm">
                {profile.id.slice(0, 8)}...
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
