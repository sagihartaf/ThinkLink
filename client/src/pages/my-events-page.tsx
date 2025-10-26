import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { BottomNav } from "@/components/bottom-nav";
import { MeetupCard } from "@/components/meetup-card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import type { Meetup } from "@shared/schema";

export default function MyEventsPage() {
  console.log('🔵 MyEventsPage rendered');
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"joined" | "hosting">("joined");

  console.log('📊 Auth state:', { hasUser: !!user, userId: user?.id, isLoading: authLoading });

  const { data: joinedMeetups = [], isLoading: joinedLoading } = useQuery<(Meetup & { joined_count?: number })[]>({
    queryKey: ["joined-meetups", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Get participations for this user
      const { data: participations, error: participationsError } = await supabase
        .from('participations')
        .select('meetup_id')
        .eq('user_id', user.id)
        .eq('status', 'joined');
      
      if (participationsError) throw participationsError;
      
      if (!participations || participations.length === 0) return [];
      
      // Get meetups for these participations using RPC function for timezone-aware filtering
      const meetupIds = participations.map(p => p.meetup_id);
      
      // Use RPC function to get future meetups with proper timezone handling
      // Pass pagination parameters to get all meetups (limit 1000 to get all)
      console.log('📞 Calling get_future_meetups (joined tab) with pagination...');
      const { data: meetups, error: meetupsError } = await supabase
        .rpc('get_future_meetups', { p_limit: 1000, p_offset: 0 });
      
      if (meetupsError) {
        console.error('❌ Meetup fetch failed on MyEventsPage (joined):', meetupsError);
        throw meetupsError;
      }
      
      // Filter to only include meetups the user has joined
      // Convert both to strings for reliable comparison
      const userJoinedMeetups = meetups?.filter((meetup: any) => 
        meetupIds.includes(String(meetup.id))
      ) || [];
      return userJoinedMeetups;
    },
    enabled: activeTab === "joined" && !!user?.id
  });

  const { data: hostedMeetups = [], isLoading: hostedLoading } = useQuery<(Meetup & { joined_count?: number })[]>({
    queryKey: ["hosted-meetups", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      console.log('🔍 Fetching hosted meetups for user:', user.id);
      
      // Use RPC function to get future meetups with proper timezone handling
      // Pass pagination parameters to get all meetups (limit 1000 to get all)
      console.log('📞 Calling get_future_meetups with pagination...');
      const { data: meetups, error } = await supabase
        .rpc('get_future_meetups', { p_limit: 1000, p_offset: 0 });
      
      if (error) {
        console.error('❌ Meetup fetch failed on MyEventsPage:', error);
        throw error;
      }
      
      console.log('📊 Total meetups fetched:', meetups?.length);
      console.log('🔎 Sample meetup data structure:', meetups?.[0]);
      
      // Filter to only include meetups hosted by this user
      // Convert both to strings for reliable comparison (host_id is UUID, user.id might be different type)
      const userHostedMeetups = meetups?.filter((meetup: any) => {
        const match = String(meetup.host_id) === String(user.id);
        if (match) console.log('✅ Match found:', meetup.id, meetup.title);
        return match;
      }) || [];
      
      console.log('🎯 Filtered hosted meetups count:', userHostedMeetups.length);
      return userHostedMeetups;
    },
    enabled: activeTab === "hosting" && !!user?.id
  });

  const currentMeetups = activeTab === "joined" ? joinedMeetups : hostedMeetups;
  const isLoading = activeTab === "joined" ? joinedLoading : hostedLoading;

  return (
    <div className="min-h-screen bg-[#f4f9ff] pb-20" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <h1 className="text-2xl font-bold text-[#1b1b1b]">המפגשים שלי</h1>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6 flex gap-6">
        <Button
          variant="ghost"
          onClick={() => setActiveTab("joined")}
          className={`py-4 border-b-2 font-semibold ${
            activeTab === "joined"
              ? "border-[#8c52ff] text-[#8c52ff]"
              : "border-transparent text-[#9AA0A6]"
          }`}
          data-testid="tab-joined"
        >
          הצטרפתי
        </Button>
        <Button
          variant="ghost"
          onClick={() => setActiveTab("hosting")}
          className={`py-4 border-b-2 font-semibold ${
            activeTab === "hosting"
              ? "border-[#8c52ff] text-[#8c52ff]"
              : "border-transparent text-[#9AA0A6]"
          }`}
          data-testid="tab-hosting"
        >
          אני מארח/ת
        </Button>
      </div>

      {/* Content */}
      <div className="px-6 py-4">
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
        ) : currentMeetups.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <div className="text-6xl">📅</div>
            <h3 className="text-lg font-semibold text-[#1b1b1b]">
              {activeTab === "joined" ? "עדיין לא הצטרפתם למפגשים" : "עדיין לא יצרתם מפגשים"}
            </h3>
            <p className="text-[#9AA0A6] text-sm max-w-md mx-auto">
              {activeTab === "joined" 
                ? "עברו לדף הבית כדי לגלות מפגשים מעניינים להצטרף אליהם"
                : "צרו את המפגש הראשון שלכם ובואו נתחיל לחבר בין אנשים"
              }
            </p>
            <Button 
              onClick={() => setLocation(activeTab === "joined" ? "/home" : "/create-meetup")}
              className="bg-gradient-to-r from-[#8c52ff] to-[#5ce1e6] hover:opacity-90"
              data-testid="button-action"
            >
              {activeTab === "joined" ? "גלו מפגשים" : "צרו מפגש"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4" data-testid="meetups-list">
            {currentMeetups.map((meetup) => (
              <MeetupCard 
                key={meetup.id} 
                meetup={meetup}
                showHostBadge={activeTab === "hosting"}
                onClick={() => setLocation(`/meetup/${meetup.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNav currentRoute="my-events" />
    </div>
  );
}
