import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Share, Edit, Calendar, MapPin, Users, Lightbulb, Send, CalendarPlus } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import type { Meetup, User, Message, Participation } from "@shared/schema";

interface MeetupWithHost extends Meetup {
  host: User;
  joined_count?: number;
}

interface MessageWithUser extends Message {
  user: User;
}

interface ParticipationWithUser extends Participation {
  user: User;
}

export default function MeetupDetailPage() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const meetupId = location.split("/").pop()!;
  const [messageText, setMessageText] = useState("");

  const { data: meetup, isLoading: meetupLoading } = useQuery<MeetupWithHost>({
    queryKey: ["/api/meetups", meetupId],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(`${queryKey[0]}/${queryKey[1]}`, {
        credentials: "include"
      });
      if (!response.ok) {
        if (response.status === 404) throw new Error("Meetup not found");
        throw new Error("Failed to fetch meetup");
      }
      return response.json();
    }
  });

  const { data: participants = [] } = useQuery<ParticipationWithUser[]>({
    queryKey: ["/api/meetups", meetupId, "participants"],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(`${queryKey[0]}/${queryKey[1]}/${queryKey[2]}`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch participants");
      return response.json();
    },
    enabled: !!meetup
  });

  const { data: messages = [] } = useQuery<MessageWithUser[]>({
    queryKey: ["/api/meetups", meetupId, "messages"],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(`${queryKey[0]}/${queryKey[1]}/${queryKey[2]}`, {
        credentials: "include"
      });
      if (!response.ok) {
        if (response.status === 403) return [];
        throw new Error("Failed to fetch messages");
      }
      return response.json();
    },
    enabled: !!meetup && !!user,
    refetchInterval: 20000 // Poll every 20 seconds
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/meetups/${meetupId}/join`, {
        method: "POST",
        credentials: "include"
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetups", meetupId, "participants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user", "joined-meetups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/meetups", meetupId] });
      queryClient.invalidateQueries({ queryKey: ["/api/meetups"] });
      toast({
        title: "הצטרפת למפגש בהצלחה!",
        description: "תוכלו לראות את המפגש ברשימת המפגשים שלכם"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "שגיאה בהצטרפות למפגש",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await fetch(`/api/meetups/${meetupId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text })
      });
      if (!response.ok) throw new Error("Failed to send message");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetups", meetupId, "messages"] });
      setMessageText("");
    },
    onError: () => {
      toast({
        title: "שגיאה בשליחת ההודעה",
        description: "אנא נסו שוב",
        variant: "destructive"
      });
    }
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageText.trim()) {
      sendMessageMutation.mutate(messageText.trim());
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: meetup.title,
      text: `${meetup.title}\n\n${format(new Date(meetup.startAt), "dd MMMM yyyy, HH:mm", { locale: he })}\n${meetup.location}\n\nהצטרפו אלינו ב-ThinkLink!`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        // User cancelled sharing
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        toast({
          title: "הקישור הועתק ללוח",
          description: "תוכלו לשתף את המפגש עם חברים"
        });
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
      }
    }
  };

  const handleAddToCalendar = () => {
    const startDate = new Date(meetup.startAt);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours duration
    
    // Format dates for ICS (YYYYMMDDTHHMMSSZ)
    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
    
    const calendarData = {
      title: meetup.title,
      description: `${meetup.description}\\n\\nמיקום: ${meetup.location}\\n\\nהצטרפו אלינו ב-ThinkLink!`,
      location: meetup.location,
      startDate: formatICSDate(startDate),
      endDate: formatICSDate(endDate),
      uid: `thinklink-${meetup.id}@thinklink.app`
    };

    // Generate proper ICS content
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ThinkLink//ThinkLink Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${calendarData.uid}`,
      `DTSTART:${calendarData.startDate}`,
      `DTEND:${calendarData.endDate}`,
      `SUMMARY:${calendarData.title}`,
      `DESCRIPTION:${calendarData.description}`,
      `LOCATION:${calendarData.location}`,
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    // Create blob with correct MIME type
    const blob = new Blob([icsContent], { 
      type: 'text/calendar;charset=utf-8' 
    });

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${meetup.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
    link.style.display = 'none';
    
    // Add to DOM, click, and cleanup
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Also provide Google Calendar as fallback option
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(calendarData.title)}&dates=${calendarData.startDate}/${calendarData.endDate}&details=${encodeURIComponent(meetup.description + '\\n\\nמיקום: ' + meetup.location + '\\n\\nהצטרפו אלינו ב-ThinkLink!')}&location=${encodeURIComponent(calendarData.location)}`;
    
    // Show success message with additional option
    toast({
      title: "הוסף ללוח השנה",
      description: "הקובץ הורד. ניתן גם לפתוח ב-Google Calendar",
      action: (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => window.open(googleCalendarUrl, '_blank')}
        >
          פתח ב-Google Calendar
        </Button>
      )
    });
  };

  const isHost = meetup?.hostId === user?.id;
  const isParticipant = participants.some(p => p.userId === user?.id);
  const canViewDiscussion = isHost || isParticipant;
  const isFull = (meetup?.joined_count ?? participants.length) >= (meetup?.capacity || 0);
  const hasJoined = isParticipant;

  if (meetupLoading) {
    return (
      <div className="min-h-screen bg-[#f4f9ff] flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#8c52ff] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-[#9AA0A6]">טוען מפגש…</p>
        </div>
      </div>
    );
  }

  if (!meetup) {
    return (
      <div className="min-h-screen bg-[#f4f9ff] flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-4">
          <div className="text-6xl">🔍</div>
          <h1 className="text-2xl font-bold">המפגש לא נמצא</h1>
          <p className="text-[#9AA0A6]">ייתכן שהמפגש הוסר או שאינו קיים</p>
          <Button 
            onClick={() => setLocation("/home")}
            className="bg-gradient-to-r from-[#8c52ff] to-[#5ce1e6] hover:opacity-90"
          >
            חזרה לדף הבית
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f9ff] pb-32" dir="rtl">
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
        <div className="flex-1"></div>
        <Button variant="ghost" size="icon" onClick={handleShare} data-testid="button-share">
          <Share className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleAddToCalendar} data-testid="button-add-calendar">
          <CalendarPlus className="h-5 w-5" />
        </Button>
        {isHost && (
          <Button variant="ghost" size="icon" data-testid="button-edit">
            <Edit className="h-5 w-5" />
          </Button>
        )}
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Topic & Title */}
        <div className="space-y-3">
          <Badge 
            variant="secondary" 
            className="bg-[#8c52ff]/10 text-[#8c52ff] text-xs font-medium"
            data-testid="badge-topic"
          >
            {meetup.topic}
          </Badge>
          <h1 className="text-2xl font-bold leading-tight text-[#1b1b1b]" data-testid="text-title">
            {meetup.title}
          </h1>
          <p className="text-[#1b1b1b] leading-relaxed" data-testid="text-description">
            {meetup.description}
          </p>
        </div>

        {/* Info Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#18cb96]/10 flex items-center justify-center flex-shrink-0">
              <Calendar className="h-5 w-5 text-[#18cb96]" />
            </div>
            <div>
              <div className="text-sm text-[#9AA0A6]">תאריך ושעה</div>
              <div className="font-medium text-[#1b1b1b]" data-testid="text-start-time">
                {format(new Date(meetup.startAt), "dd MMMM yyyy, HH:mm", { locale: he })}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#18cb96]/10 flex items-center justify-center flex-shrink-0">
              <MapPin className="h-5 w-5 text-[#18cb96]" />
            </div>
            <div>
              <div className="text-sm text-[#9AA0A6]">מיקום</div>
              <div className="font-medium text-[#1b1b1b]" data-testid="text-location">
                {meetup.location}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#18cb96]/10 flex items-center justify-center flex-shrink-0">
              <Users className="h-5 w-5 text-[#18cb96]" />
            </div>
            <div>
              <div className="text-sm text-[#9AA0A6]">גודל הקבוצה</div>
              <div className="font-medium text-[#1b1b1b]" data-testid="text-capacity">
                {meetup.joined_count ?? participants.length}/{meetup.capacity} משתתפים
              </div>
            </div>
          </div>
        </div>

        {/* Participants */}
        <div className="space-y-4">
          <h3 className="font-bold text-lg text-[#1b1b1b]">
            משתתפים (<span data-testid="text-participant-count">{meetup.joined_count ?? participants.length}</span>)
          </h3>
          
          {participants.length === 0 ? (
            <div className="text-center py-8 text-[#9AA0A6]">
              היו הראשונים להצטרף!
            </div>
          ) : (
            <div className="flex flex-wrap gap-3" data-testid="list-participants">
              {participants.map((participant) => (
                <div 
                  key={participant.userId}
                  className="flex items-center gap-2 bg-white rounded-full pr-1 pl-3 py-1 border border-gray-200"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8c52ff] to-[#5ce1e6] flex items-center justify-center text-white text-sm font-bold">
                    {participant.user.displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-[#1b1b1b]">
                    {participant.user.displayName}
                  </span>
                  {participant.userId === meetup.hostId && (
                    <Badge variant="secondary" className="text-xs bg-[#18cb96]/10 text-[#18cb96]">
                      מארח/ת
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Icebreaker */}
        {meetup.icebreaker && (
          <div className="bg-[#18cb96]/5 rounded-lg p-4 border border-[#18cb96]/20">
            <div className="flex items-center gap-2 text-[#18cb96] font-medium mb-2">
              <Lightbulb className="h-4 w-4" />
              <span>שאלת פתיחה</span>
            </div>
            <p className="text-[#1b1b1b]" data-testid="text-icebreaker">
              {meetup.icebreaker}
            </p>
          </div>
        )}

        {/* Discussion */}
        {canViewDiscussion && (
          <div className="space-y-4">
            <h3 className="font-bold text-lg text-[#1b1b1b]">דיון</h3>
            
            <div className="space-y-4" data-testid="messages-container">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-[#9AA0A6] text-sm">
                  עדיין אין הודעות – התחילו את השיחה כאן.
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8c52ff] to-[#5ce1e6] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {message.user.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-medium text-sm text-[#1b1b1b]">
                          {message.user.displayName}
                        </span>
                        <span className="text-xs text-[#9AA0A6]">
                          {format(new Date(message.createdAt), "HH:mm")}
                        </span>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-gray-200 max-w-[80%]">
                        <p className="text-sm text-[#1b1b1b]">{message.text}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-2xl mx-auto space-y-3">
          {/* Message Composer */}
          {canViewDiscussion && (
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="כתבו הודעה…"
                className="flex-1 text-right"
                data-testid="input-message"
              />
              <Button 
                type="submit"
                size="icon"
                className="bg-gradient-to-r from-[#8c52ff] to-[#5ce1e6] hover:opacity-90"
                disabled={!messageText.trim() || sendMessageMutation.isPending}
                data-testid="button-send-message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          )}
          
          {/* Join Button */}
          {!hasJoined && (
            <Button 
              onClick={() => joinMutation.mutate()}
              disabled={isFull || joinMutation.isPending}
              className={`w-full py-4 font-semibold text-lg shadow-lg ${
                isFull 
                  ? "bg-gray-400 cursor-not-allowed" 
                  : hasJoined
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-[#8c52ff] to-[#5ce1e6] hover:opacity-90"
              }`}
              data-testid="button-join-meetup"
            >
              {joinMutation.isPending 
                ? "מצטרף..." 
                : isFull 
                ? "המפגש מלא"
                : hasJoined
                ? "הצטרפת"
                : "להצטרף למפגש"
              }
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
