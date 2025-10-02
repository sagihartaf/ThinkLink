import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPen, MessageSquare, LogOut, X, Star } from "lucide-react";
const logoPath = "/thinklink-logo.png";

export default function ProfilePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: user?.displayName || "",
    photoUrl: user?.photoUrl || ""
  });
  const [feedbackForm, setFeedbackForm] = useState({
    rating: 0,
    category: "",
    message: "",
    includeDiagnostic: false
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { displayName: string; photoUrl?: string }) => {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error("Failed to update profile");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setEditDialogOpen(false);
      toast({
        title: "הפרופיל עודכן בהצלחה",
        description: "השינויים נשמרו במערכת"
      });
    },
    onError: () => {
      toast({
        title: "שגיאה בעדכון הפרופיל",
        description: "אנא נסו שוב מאוחר יותר",
        variant: "destructive"
      });
    }
  });

  const submitFeedbackMutation = useMutation({
    mutationFn: async (data: { rating?: number; category: string; message: string }) => {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error("Failed to submit feedback");
      return response.json();
    },
    onSuccess: () => {
      setFeedbackDialogOpen(false);
      setFeedbackForm({ rating: 0, category: "", message: "", includeDiagnostic: false });
      toast({
        title: "תודה שעזרתם לנו להשתפר!",
        description: "המשוב שלכם התקבל ויעזור לנו לשפר את האפליקציה"
      });
    },
    onError: () => {
      toast({
        title: "שגיאה בשליחת המשוב",
        description: "אנא נסו שוב מאוחר יותר",
        variant: "destructive"
      });
    }
  });

  const handleEditProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      displayName: editForm.displayName,
      photoUrl: editForm.photoUrl || undefined
    });
  };

  const handleFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    submitFeedbackMutation.mutate({
      rating: feedbackForm.rating || undefined,
      category: feedbackForm.category,
      message: feedbackForm.message
    });
  };

  const setRating = (rating: number) => {
    setFeedbackForm(prev => ({ ...prev, rating }));
  };

  return (
    <div className="min-h-screen bg-[#f4f9ff] pb-20" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <h1 className="text-2xl font-bold text-[#1b1b1b]">פרופיל</h1>
      </div>

      <div className="px-6 py-8 space-y-8">
        {/* User Info */}
        <div className="flex flex-col items-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#8c52ff] to-[#5ce1e6] flex items-center justify-center text-white text-2xl font-bold">
            {user?.photoUrl ? (
              <img 
                src={user.photoUrl} 
                alt={user.displayName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              user?.displayName.charAt(0).toUpperCase()
            )}
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-[#1b1b1b]" data-testid="text-display-name">
              {user?.displayName}
            </h2>
            <p className="text-[#9AA0A6]" data-testid="text-email">
              {user?.email}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline"
                className="w-full flex items-center justify-between px-5 py-4 bg-white border border-gray-200 rounded-xl h-auto"
                data-testid="button-edit-profile"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#8c52ff]/10 flex items-center justify-center">
                    <UserPen className="h-5 w-5 text-[#8c52ff]" />
                  </div>
                  <span className="font-medium text-[#1b1b1b]">עריכת פרופיל</span>
                </div>
                <div className="text-[#9AA0A6]">←</div>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" dir="rtl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">עריכת פרופיל</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleEditProfile} className="space-y-6">
                <div className="flex justify-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#8c52ff] to-[#5ce1e6] flex items-center justify-center text-white text-2xl font-bold">
                    {editForm.displayName.charAt(0).toUpperCase() || "👤"}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="editDisplayName">שם מלא *</Label>
                    <Input
                      id="editDisplayName"
                      value={editForm.displayName}
                      onChange={(e) => setEditForm(prev => ({ ...prev, displayName: e.target.value }))}
                      required
                      className="mt-2"
                      data-testid="input-edit-display-name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="editPhotoUrl">תמונת פרופיל (אופציונלי)</Label>
                    <Input
                      id="editPhotoUrl"
                      type="url"
                      value={editForm.photoUrl}
                      onChange={(e) => setEditForm(prev => ({ ...prev, photoUrl: e.target.value }))}
                      placeholder="קישור לתמונה"
                      dir="ltr"
                      className="mt-2"
                      data-testid="input-edit-photo-url"
                    />
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setEditDialogOpen(false)}
                    className="flex-1"
                    data-testid="button-cancel-edit"
                  >
                    ביטול
                  </Button>
                  <Button 
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-[#8c52ff] to-[#5ce1e6] hover:opacity-90"
                    disabled={updateProfileMutation.isPending}
                    data-testid="button-save-profile"
                  >
                    {updateProfileMutation.isPending ? "שומר..." : "שמירה"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline"
                className="w-full flex items-center justify-between px-5 py-4 bg-white border border-gray-200 rounded-xl h-auto"
                data-testid="button-send-feedback"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#18cb96]/10 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-[#18cb96]" />
                  </div>
                  <span className="font-medium text-[#1b1b1b]">שליחת משוב</span>
                </div>
                <div className="text-[#9AA0A6]">←</div>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">שליחת משוב</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleFeedback} className="space-y-5">
                {/* Star Rating */}
                <div>
                  <Label>דירוג</Label>
                  <div className="flex gap-2 justify-center py-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Button
                        key={star}
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setRating(star)}
                        className="text-3xl p-0 h-auto"
                        data-testid={`button-star-${star}`}
                      >
                        <Star 
                          className={`h-8 w-8 ${
                            star <= feedbackForm.rating 
                              ? "fill-yellow-400 text-yellow-400" 
                              : "text-gray-300"
                          }`}
                        />
                      </Button>
                    ))}
                  </div>
                </div>
                
                {/* Category */}
                <div>
                  <Label>סוג המשוב</Label>
                  <Select 
                    value={feedbackForm.category} 
                    onValueChange={(value) => setFeedbackForm(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger className="w-full mt-2" data-testid="select-feedback-category">
                      <SelectValue placeholder="בחרו סוג" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bug">בעיה טכנית</SelectItem>
                      <SelectItem value="improvement">הצעה לשיפור</SelectItem>
                      <SelectItem value="general">משוב כללי</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Message */}
                <div>
                  <Label htmlFor="feedbackMessage">תיאור *</Label>
                  <Textarea
                    id="feedbackMessage"
                    value={feedbackForm.message}
                    onChange={(e) => setFeedbackForm(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="ספרו לנו על החוויה שלכם..."
                    rows={4}
                    required
                    className="mt-2 resize-none"
                    data-testid="textarea-feedback-message"
                  />
                </div>
                
                <div className="flex gap-3">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setFeedbackDialogOpen(false)}
                    className="flex-1"
                    data-testid="button-cancel-feedback"
                  >
                    ביטול
                  </Button>
                  <Button 
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-[#8c52ff] to-[#5ce1e6] hover:opacity-90"
                    disabled={submitFeedbackMutation.isPending}
                    data-testid="button-submit-feedback"
                  >
                    {submitFeedbackMutation.isPending ? "שולח..." : "שליחה"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Button 
            variant="outline"
            onClick={() => logoutMutation.mutate()}
            className="w-full flex items-center justify-between px-5 py-4 bg-white border border-gray-200 rounded-xl h-auto"
            disabled={logoutMutation.isPending}
            data-testid="button-logout"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <LogOut className="h-5 w-5 text-[#9AA0A6]" />
              </div>
              <span className="font-medium text-[#9AA0A6]">
                {logoutMutation.isPending ? "מתנתק..." : "התנתקות"}
              </span>
            </div>
            <div className="text-[#9AA0A6]">←</div>
          </Button>
        </div>

        {/* App Info */}
        <div className="pt-8 border-t border-gray-200 text-center space-y-2">
          <img src={logoPath} alt="ThinkLink" className="mx-auto h-10" />
          <p className="text-sm text-[#9AA0A6]">גרסה 1.0.0</p>
        </div>
      </div>

      <BottomNav currentRoute="profile" />
    </div>
  );
}
