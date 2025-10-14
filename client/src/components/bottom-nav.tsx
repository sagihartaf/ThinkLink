import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Home, Calendar, User } from "lucide-react";

interface BottomNavProps {
  currentRoute: "home" | "my-events" | "profile";
}

export function BottomNav({ currentRoute }: BottomNavProps) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const navItems = [
    { 
      route: "home" as const, 
      label: "בית", 
      icon: Home, 
      path: "/home",
      requiresAuth: false
    },
    { 
      route: "my-events" as const, 
      label: "המפגשים שלי", 
      icon: Calendar, 
      path: "/my-events",
      requiresAuth: true
    },
    { 
      route: "profile" as const, 
      label: "פרופיל", 
      icon: User, 
      path: "/profile",
      requiresAuth: true
    }
  ];

  const handleNavClick = (item: typeof navItems[0]) => {
    if (item.requiresAuth && !user) {
      // Store the intended action for redirect after login
      sessionStorage.setItem('intendedAction', item.path);
      setLocation("/auth");
    } else {
      setLocation(item.path);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50" dir="rtl">
      <div className="flex justify-around items-center h-16 safe-area-bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentRoute === item.route;
          
          return (
            <Button
              key={item.route}
              variant="ghost"
              onClick={() => handleNavClick(item)}
              className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 ${
                isActive 
                  ? "text-[#8c52ff]" 
                  : "text-[#9AA0A6] hover:text-[#8c52ff]"
              }`}
              data-testid={`nav-${item.route}`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
