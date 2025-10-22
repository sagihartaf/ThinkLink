import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import type { Meetup } from "@shared/schema";

interface MeetupCardProps {
  meetup: Meetup & { joined_count?: number };
  showHostBadge?: boolean;
  onClick: () => void;
}

export function MeetupCard({ meetup, showHostBadge = false, onClick }: MeetupCardProps) {
  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow animate-slide-up"
      data-testid={`meetup-card-${meetup.id}`}
    >
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Badge 
                variant="secondary" 
                className="bg-[#8c52ff]/10 text-[#8c52ff] text-xs font-medium"
                data-testid="badge-topic"
              >
                {meetup.topic}
              </Badge>
              {showHostBadge && (
                <Badge 
                  variant="secondary" 
                  className="bg-[#18cb96]/10 text-[#18cb96] text-xs font-medium"
                >
                  אני מארח/ת
                </Badge>
              )}
            </div>
            <h3 className="font-bold text-lg leading-tight text-[#1b1b1b]" data-testid="text-title">
              {meetup.title}
            </h3>
            <p className="text-sm text-[#9AA0A6] line-clamp-2" data-testid="text-description">
              {meetup.description}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-[#9AA0A6] pt-2 border-t border-gray-200">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-[#18cb96]" />
            <span data-testid="text-start-time">
              {format(new Date(meetup.startAt), "dd MMMM yyyy, HH:mm", { locale: he })}
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5 text-[#9AA0A6]">
            <MapPin className="h-4 w-4 text-[#18cb96]" />
            <span data-testid="text-location">
              {meetup.placeName === "מקום אחר (הקלדה ידנית)" && meetup.customLocationDetails
                ? meetup.customLocationDetails
                : meetup.location}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[#18cb96] font-medium">
            <Users className="h-4 w-4" />
            <span data-testid="text-capacity">
              {meetup.joined_count ?? 0}/{meetup.capacity}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
