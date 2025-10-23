import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { ProfileGatekeeper } from "@/components/profile-gatekeeper";
import AuthPage from "@/pages/auth-page";
import CompleteProfilePage from "@/pages/complete-profile-page";
import HomePage from "@/pages/home-page";
import CreateMeetupPage from "@/pages/create-meetup-page";
import MeetupDetailPage from "@/pages/meetup-detail-page";
import MyEventsPage from "@/pages/my-events-page";
import ProfilePage from "@/pages/profile-page";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/complete-profile" component={CompleteProfilePage} />
      <Route path="/" component={HomePage} />
      <Route path="/home" component={HomePage} />
      <ProtectedRoute path="/create-meetup" component={CreateMeetupPage} />
      <ProtectedRoute path="/meetup/:id" component={MeetupDetailPage} />
      <ProtectedRoute path="/my-events" component={MyEventsPage} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <ProfileGatekeeper>
            <Router />
          </ProfileGatekeeper>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
