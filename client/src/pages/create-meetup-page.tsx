import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Info } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import type { InsertMeetup } from "@shared/schema";

const topics = [
  { value: "טכנולוגיה", label: "טכנולוגיה" },
  { value: "תרבות", label: "תרבות" },
  { value: "פילוסופיה", label: "פילוסופיה" },
  { value: "פסיכולוגיה", label: "פסיכולוגיה" },
  { value: "אחר", label: "אחר" }
];

const capacities = [
  { value: 2, label: "2 משתתפים" },
  { value: 5, label: "5 משתתפים" },
  { value: 10, label: "10 משתתפים" },
  { value: 15, label: "15 משתתפים" }
];

export default function CreateMeetupPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    topic: "",
    title: "",
    description: "",
    startAt: "",
    location: "",
    capacity: "",
    icebreaker: ""
  });

  const createMeetupMutation = useMutation({
    mutationFn: async (data: Omit<InsertMeetup, "hostId">) => {
      const response = await fetch("/api/meetups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error("Failed to create meetup");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetups"] });
      toast({
        title: "המפגש נוצר בהצלחה!",
        description: "המפגש שלכם מוכן ומחכה למשתתפים"
      });
      setLocation("/home");
    },
    onError: () => {
      toast({
        title: "שגיאה ביצירת המפגש",
        description: "אנא נסו שוב מאוחר יותר",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const meetupData: Omit<InsertMeetup, "hostId"> = {
      topic: formData.topic,
      title: formData.title,
      description: formData.description,
      startAt: new Date(formData.startAt),
      location: formData.location,
      capacity: parseInt(formData.capacity),
      icebreaker: formData.icebreaker || undefined
    };

    createMeetupMutation.mutate(meetupData);
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-[#f4f9ff]" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/home")}
          data-testid="button-back"
        >
          <ArrowRight className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold flex-1">יצירת מפגש חדש</h1>
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6 pb-24">
        {/* Topic Selection */}
        <div>
          <Label htmlFor="topic">נושא *</Label>
          <Select value={formData.topic} onValueChange={(value) => updateFormData("topic", value)}>
            <SelectTrigger className="w-full mt-2" data-testid="select-topic">
              <SelectValue placeholder="בחרו נושא" />
            </SelectTrigger>
            <SelectContent>
              {topics.map((topic) => (
                <SelectItem key={topic.value} value={topic.value}>
                  {topic.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Title */}
        <div>
          <Label htmlFor="title">כותרת המפגש *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => updateFormData("title", e.target.value)}
            placeholder="למשל: שיחה על עתיד הבינה המלאכותית"
            required
            className="mt-2"
            data-testid="input-title"
          />
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="description">תיאור *</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => updateFormData("description", e.target.value)}
            placeholder="תארו את נושא השיחה ומה תרצו לדון בו"
            rows={4}
            required
            className="mt-2 resize-none"
            data-testid="textarea-description"
          />
        </div>

        {/* Date & Time */}
        <div>
          <Label htmlFor="startAt">תאריך ושעה *</Label>
          <Input
            id="startAt"
            type="datetime-local"
            value={formData.startAt}
            onChange={(e) => updateFormData("startAt", e.target.value)}
            required
            className="mt-2 [&::-webkit-calendar-picker-indicator]:ml-2"
            dir="ltr"
            data-testid="input-start-at"
          />
        </div>

        {/* Location */}
        <div>
          <Label htmlFor="location">מיקום *</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => updateFormData("location", e.target.value)}
            placeholder="למשל: קפה רוטשילד, תל אביב"
            required
            className="mt-2"
            data-testid="input-location"
          />
        </div>

        {/* Capacity */}
        <div>
          <Label htmlFor="capacity">מספר משתתפים מקסימלי *</Label>
          <Select value={formData.capacity} onValueChange={(value) => updateFormData("capacity", value)}>
            <SelectTrigger className="w-full mt-2" data-testid="select-capacity">
              <SelectValue placeholder="בחרו מספר" />
            </SelectTrigger>
            <SelectContent>
              {capacities.map((capacity) => (
                <SelectItem key={capacity.value} value={capacity.value.toString()}>
                  {capacity.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Icebreaker */}
        <div>
          <Label htmlFor="icebreaker">שאלה לשבירת הקרח (אופציונלי)</Label>
          <Input
            id="icebreaker"
            value={formData.icebreaker}
            onChange={(e) => updateFormData("icebreaker", e.target.value)}
            placeholder="למשל: מה הדבר הראשון שעשה עליכם רושם השבוע?"
            className="mt-2"
            data-testid="input-icebreaker"
          />
        </div>

        {/* Hosting Guidelines */}
        <div className="bg-[#18cb96]/5 rounded-lg p-4 space-y-3 border border-[#18cb96]/20">
          <div className="flex items-center gap-2 text-[#18cb96] font-medium">
            <Info className="h-4 w-4" />
            <span>כללי אירוח</span>
          </div>
          <ul className="text-sm text-[#1b1b1b] space-y-2 pr-6">
            <li className="list-disc">צרו מרחב מזמין עבור כל המשתתפים</li>
            <li className="list-disc">עודדו את כולם לשתף את נקודות המבט שלהם</li>
            <li className="list-disc">שמרו על שיח מכבד ומכיל</li>
            <li className="list-disc">התחילו עם שאלת הפתיחה שהגדרתם</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => setLocation("/home")}
            className="flex-1 py-4"
            data-testid="button-cancel"
          >
            ביטול
          </Button>
          <Button 
            type="submit"
            className="flex-1 py-4 bg-gradient-to-r from-[#8c52ff] to-[#5ce1e6] hover:opacity-90"
            disabled={createMeetupMutation.isPending}
            data-testid="button-create"
          >
            {createMeetupMutation.isPending ? "יוצר..." : "יצירת מפגש"}
          </Button>
        </div>
      </form>
    </div>
  );
}
