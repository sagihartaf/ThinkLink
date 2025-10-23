import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const logoPath = "/thinklink-logo.png";

export default function CompleteProfilePage() {
  const [, setLocation] = useLocation();
  
  const [formData, setFormData] = useState({
    fullName: "",
    profilePictureUrl: "",
    birthdate: ""
  });

  const updateFormData = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Add submission logic later
    console.log("Form submitted:", formData);
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
              className="w-full bg-gradient-to-r from-[#8c52ff] to-[#5ce1e6] hover:opacity-90 text-white font-semibold py-3 mt-8"
              data-testid="button-submit-profile"
            >
              שמירה והמשך לאפליקציה
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
