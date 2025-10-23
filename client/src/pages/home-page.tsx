import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { BottomNav } from "@/components/bottom-nav";
import { MeetupCard } from "@/components/meetup-card";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
const logoPath = "/thinklink-logo.png";

const topics = ["הכל", "טכנולוגיה", "תרבות", "פילוסופיה", "פסיכולוגיה", "ספורט", "מוזיקה", "פיננסים", "אחר"];

// Type definition for the RPC function response
type MeetupWithParticipants = {
  id: string;
  host_id: string;
  title: string;
  description: string;
  topic: string;
  place_name: string | null;
  custom_location_details: string | null;
  address: string | null;
  start_at: string;
  max_participants: number | null;
  created_at: string;
  participant_count: number;
};

export default function HomePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedTopic, setSelectedTopic] = useState("הכל");

  const { data: meetups = [], isLoading } = useQuery<MeetupWithParticipants[]>({
    queryKey: ["meetups", selectedTopic === "הכל" ? "" : selectedTopic],
    queryFn: async ({ queryKey }) => {
      const [, topic] = queryKey as [string, string];
      
      // Prepare parameters for the RPC function
      // When topic is empty string (הכל), pass null to get all meetups
      const rpcParams = topic && topic !== "" ? { p_topic: topic } : { p_topic: null };
      
      console.log("🔍 RPC call:", { topic, rpcParams });
      
      // Call the RPC function for both guests and authenticated users
      const { data, error } = await supabase
        .rpc('get_future_meetups', rpcParams);
      
      console.log("📊 RPC response:", { data: data?.length || 0, error });
      
      if (error) throw error;
      return data || [];
    },
    enabled: true // Always enabled, even for guests
  });

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      
      if (error) {
        // If profile doesn't exist, return null
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      
      return profileData;
    },
    enabled: !!user?.id
  });

  // Handle authentication for protected actions
  const handleAuthRequired = (redirectTo: string) => {
    // Navigate to auth page with redirectTo parameter
    setLocation(`/auth?redirectTo=${encodeURIComponent(redirectTo)}`);
  };

  const handleCreateMeetup = () => {
    if (!user) {
      handleAuthRequired('/create-meetup');
    } else {
      setLocation("/create-meetup");
    }
  };

  const handleMeetupClick = (meetupId: string) => {
    if (!user) {
      handleAuthRequired(`/meetup/${meetupId}`);
    } else {
      setLocation(`/meetup/${meetupId}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f9ff] pb-20" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="flex justify-center mb-4">
          <img src={logoPath} alt="ThinkLink" className="h-14" />
        </div>
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-bold text-[#1b1b1b]">
            ברוך הבא, <span data-testid="text-user-name">
              {profileLoading ? 'טוען...' : profile?.full_name || 'חבר/ה'}
            </span>
          </h1>
          <p className="text-[#9AA0A6] text-sm">הצטרפו לשיחות שמעניינות אתכם</p>
          
          {/* Guest Login Button */}
          {!user && (
            <div className="mt-4">
              <Button
                onClick={() => setLocation('/auth')}
                className="bg-gradient-to-r from-[#8c52ff] to-[#5ce1e6] hover:opacity-90 text-white font-semibold px-6 py-2"
                data-testid="button-guest-login"
              >
                התחברות / הרשמה
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Topic Filters */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2 flex-row-reverse">
          <ChevronLeft className="h-4 w-4 text-[#9AA0A6] flex-shrink-0" />
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 flex-1">
            {topics.map((topic) => (
              <Button
                key={topic}
                variant="secondary"
                size="sm"
                onClick={() => setSelectedTopic(topic)}
                className={`whitespace-nowrap font-medium text-sm ${
                  selectedTopic === topic
                    ? "bg-[#4A90E2] text-[#f4f9ff] hover:bg-[#4A90E2]/90"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                data-testid={`button-topic-${topic}`}
              >
                {topic}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Meetups List */}
      <div className="px-6 py-4">
        <h2 className="text-lg font-bold mb-4 text-[#1b1b1b]">מפגשים קרובים</h2>
        
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                <div className="space-y-3">
                  <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : meetups.length === 0 ? (
          <div className="text-center py-8 text-[#9AA0A6]">
            אין מפגשים זמינים בנושא זה כרגע
          </div>
        ) : (
          <div className="space-y-4">
            {meetups.map((meetup) => (
              <MeetupCard 
                key={meetup.id} 
                meetup={meetup}
                onClick={() => handleMeetupClick(meetup.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAB Create Meetup */}
      <Button
        onClick={handleCreateMeetup}
        className="fixed bottom-24 left-4 w-14 h-14 rounded-full bg-gradient-to-r from-[#8c52ff] to-[#5ce1e6] hover:opacity-90 shadow-2xl"
        data-testid="button-create-meetup"
      >
        <Plus className="h-6 w-6 text-white" />
      </Button>

      <BottomNav currentRoute="home" />
    </div>
  );
}
