import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Share, Edit, Calendar, MapPin, Users, Lightbulb, Send, CalendarPlus, LogOut } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import type { Meetup, Message, Participation } from "@shared/schema";

interface MeetupWithHost extends Meetup {
  host: { id: string; email: string; full_name?: string; avatar_url?: string };
  joined_count?: number;
}

interface MessageWithUser extends Message {
  user: { id: string; email: string; full_name?: string; avatar_url?: string };
}

interface ParticipationWithUser extends Participation {
  user: { id: string; email: string; full_name?: string; avatar_url?: string };
}

export default function MeetupDetailPage() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const meetupId = location.split("/").pop()!;
  const [messageText, setMessageText] = useState("");

  const { data: meetup, isLoading: meetupLoading } = useQuery<MeetupWithHost>({
    queryKey: ["meetup", meetupId],
    queryFn: async () => {
      const { data: meetupData, error: meetupError } = await supabase
        .from('meetups')
        .select('*')
        .eq('id', meetupId)
        .single();
      
      if (meetupError) {
        if (meetupError.code === 'PGRST116') throw new Error("Meetup not found");
        throw new Error("Failed to fetch meetup");
      }
      
      // Get host profile data
      const { data: hostProfile, error: hostError } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', meetupData.host_id)
        .single();
      
      // Get participation count
      const { count: joinedCount } = await supabase
        .from('participations')
        .select('*', { count: 'exact', head: true })
        .eq('meetup_id', meetupId)
        .eq('status', 'joined');
      
      return {
        ...meetupData,
        host: {
          id: meetupData.host_id,
          email: '', // We don't have email in profiles table
          full_name: hostProfile?.full_name || '',
          avatar_url: hostProfile?.avatar_url || null
        },
        joined_count: joinedCount || 0
      };
    }
  });

  const { data: participants = [] } = useQuery<ParticipationWithUser[]>({
    queryKey: ["meetup-participants", meetupId],
    queryFn: async () => {
      const { data: participations, error: participationsError } = await supabase
        .from('participations')
        .select('*')
        .eq('meetup_id', meetupId)
        .eq('status', 'joined')
        .order('joined_at', { ascending: true });
      
      if (participationsError) throw participationsError;
      
      if (!participations || participations.length === 0) return [];
      
      // Get user profiles for each participation
      const userIds = participations.map(p => p.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
      
      if (profilesError) throw profilesError;
      
      // Combine participations with user data
      return participations.map(participation => ({
        ...participation,
        user: {
          id: participation.user_id,
          email: '', // We don't have email in profiles table
          full_name: profiles?.find(p => p.id === participation.user_id)?.full_name || '',
          avatar_url: profiles?.find(p => p.id === participation.user_id)?.avatar_url || null
        }
      }));
    },
    enabled: !!meetup
  });

  const { data: messages = [] } = useQuery<MessageWithUser[]>({
    queryKey: ["meetup-messages", meetupId],
    queryFn: async () => {
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('meetup_id', meetupId)
        .order('created_at', { ascending: true });
      
      if (messagesError) throw messagesError;
      
      if (!messagesData || messagesData.length === 0) return [];
      
      // Get user profiles for each message
      const userIds = messagesData.map(m => m.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
      
      if (profilesError) throw profilesError;
      
      // Combine messages with user data
      return messagesData.map(message => ({
        ...message,
        user: {
          id: message.user_id,
          email: '', // We don't have email in profiles table
          full_name: profiles?.find(p => p.id === message.user_id)?.full_name || '',
          avatar_url: profiles?.find(p => p.id === message.user_id)?.avatar_url || null
        }
      }));
    },
    enabled: !!meetup && !!user,
    refetchInterval: 20000 // Poll every 20 seconds
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");
      
      // Check if already joined
      const { data: existingParticipation } = await supabase
        .from('participations')
        .select('*')
        .eq('meetup_id', meetupId)
        .eq('user_id', user.id)
        .single();
      
      if (existingParticipation) {
        throw new Error("Already joined this meetup");
      }
      
      // Check capacity
      const { count: currentCount } = await supabase
        .from('participations')
        .select('*', { count: 'exact', head: true })
        .eq('meetup_id', meetupId)
        .eq('status', 'joined');
      
      if (meetup && currentCount && currentCount >= meetup.capacity) {
        throw new Error("Meetup is full");
      }
      
      // Join the meetup
      const { data: participation, error } = await supabase
        .from('participations')
        .insert({
          meetup_id: meetupId,
          user_id: user.id,
          status: 'joined'
        })
        .select()
        .single();
      
      if (error) throw error;
      return participation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetup-participants", meetupId] });
      queryClient.invalidateQueries({ queryKey: ["joined-meetups", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["meetup", meetupId] });
      queryClient.invalidateQueries({ queryKey: ["meetups"] });
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

  const leaveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");
      
      const { error } = await supabase
        .from('participations')
        .delete()
        .eq('meetup_id', meetupId)
        .eq('user_id', user.id);
      
      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetup-participants", meetupId] });
      queryClient.invalidateQueries({ queryKey: ["joined-meetups", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["meetup", meetupId] });
      queryClient.invalidateQueries({ queryKey: ["meetups"] });
      toast({
        title: "עזבת את המפגש",
        description: "הסרתם את עצמכם מרשימת המשתתפים"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "שגיאה בעזיבת המפגש",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!user?.id) throw new Error("User not authenticated");
      
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          meetup_id: meetupId,
          user_id: user.id,
          text: text
        })
        .select()
        .single();
      
      if (error) throw error;
      return message;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetup-messages", meetupId] });
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
    if (!meetup?.start_at) return;
    
    const shareData = {
      title: meetup.title,
      text: `${meetup.title}\n\n${format(new Date(meetup.start_at), "dd MMMM yyyy, HH:mm", { locale: he })}\n${meetup.location}\n\nהצטרפו אלינו ב-ThinkLink!`,
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
    if (!meetup?.start_at) return;
    
    const startDate = new Date(meetup.start_at);
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

  const isHost = meetup?.host_id === user?.id;
  const isParticipant = participants.some(p => p.user_id === user?.id);
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
                {meetup?.start_at ? format(new Date(meetup.start_at), "dd MMMM yyyy, HH:mm", { locale: he }) : 'טוען...'}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#18cb96]/10 flex items-center justify-center flex-shrink-0">
              <MapPin className="h-5 w-5 text-[#18cb96]" />
            </div>
            <div>
              <div className="text-sm text-[#9AA0A6]">מיקום</div>
              {meetup.place_name === "מקום אחר (הקלדה ידנית)" && meetup.custom_location_details ? (
                <div>
                  <div className="font-medium text-[#1b1b1b]" data-testid="text-location">
                    {meetup.custom_location_details}
                  </div>
                  <div className="text-xs text-[#9AA0A6] mt-1">
                    שימו לב: באחריות המשתתפים לוודא שהמקום ציבורי ונגיש. מומלץ לתאם פרטים סופיים בצ'אט המפגש.
                  </div>
                </div>
              ) : (
                <div className="font-medium text-[#1b1b1b]" data-testid="text-location">
                  {meetup.location}
                </div>
              )}
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
                  key={participant.user_id}
                  className="flex items-center gap-2 bg-white rounded-full pr-1 pl-3 py-1 border border-gray-200"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8c52ff] to-[#5ce1e6] flex items-center justify-center text-white text-sm font-bold">
                    {(participant.user?.full_name || 'משתמש').charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-[#1b1b1b]">
                    {participant.user?.full_name || 'משתמש'}
                  </span>
                  {participant.user_id === meetup.host_id && (
                    <Badge variant="secondary" className="text-xs bg-[#18cb96]/10 text-[#18cb96]">
                      מארח/ת
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* Leave Meeting Button - Only show for participants (not hosts) */}
          {hasJoined && !isHost && (
            <div className="pt-4 border-t border-gray-200">
              <Button
                onClick={() => leaveMutation.mutate()}
                variant="destructive"
                className="w-full"
                disabled={leaveMutation.isPending}
                data-testid="button-leave-meeting"
              >
                <LogOut className="h-4 w-4 ml-2" />
                {leaveMutation.isPending ? "עוזב..." : "לעזוב את המפגש"}
              </Button>
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
                      {(message.user.full_name || 'משתמש').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-medium text-sm text-[#1b1b1b]">
                          {message.user.full_name || 'משתמש'}
                        </span>
                        <span className="text-xs text-[#9AA0A6]">
                          {message.created_at ? format(new Date(message.created_at), "HH:mm") : 'טוען...'}
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
