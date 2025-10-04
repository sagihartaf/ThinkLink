import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { BottomNav } from "@/components/bottom-nav";
import { MeetupCard } from "@/components/meetup-card";
import { Button } from "@/components/ui/button";
import type { Meetup } from "@shared/schema";

export default function MyEventsPage() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"joined" | "hosting">("joined");

  const { data: joinedMeetups = [], isLoading: joinedLoading } = useQuery<(Meetup & { joined_count?: number })[]>({
    queryKey: ["/api/user/joined-meetups"],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(queryKey[0] as string, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch joined meetups");
      return response.json();
    },
    enabled: activeTab === "joined"
  });

  const { data: hostedMeetups = [], isLoading: hostedLoading } = useQuery<(Meetup & { joined_count?: number })[]>({
    queryKey: ["/api/user/hosted-meetups"],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(queryKey[0] as string, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch hosted meetups");
      return response.json();
    },
    enabled: activeTab === "hosting"
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
