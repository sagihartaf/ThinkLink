import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useMutation, UseMutationResult, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  profileComplete: boolean | null; // null = loading, true = complete, false = incomplete
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
};

type LoginData = { email: string; password: string; rememberMe?: boolean };
type RegisterData = { email: string; password: string; displayName: string };

export const AuthContext = createContext<AuthContextType | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);

  // Function to check if user's profile is complete
  const checkProfileCompletion = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single();

      if (error) {
        // If profile doesn't exist, it's incomplete
        if (error.code === 'PGRST116') {
          setProfileComplete(false);
        } else {
          console.error('Error checking profile:', error);
          setProfileComplete(false);
        }
      } else {
        // Profile exists, check if full_name is filled
        setProfileComplete(!!profile?.full_name);
      }
    } catch (error) {
      console.error('Unexpected error checking profile:', error);
      setProfileComplete(false);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
      
      // Check profile completion if user exists
      if (session?.user) {
        checkProfileCompletion(session.user.id);
      } else {
        setProfileComplete(null);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        setIsLoading(false);
        
        // Check profile completion if user exists
        if (session?.user) {
          checkProfileCompletion(session.user.id);
        } else {
          setProfileComplete(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });
      if (error) throw error;
      return data.user!;
    },
    onError: (error: Error) => {
      toast({
        title: "כניסה נכשלה",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterData) => {
      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            display_name: credentials.displayName,
          },
        },
      });
      if (error) throw error;
      return data.user!;
    },
    onError: (error: Error) => {
      toast({
        title: "הרשמה נכשלה",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onError: (error: Error) => {
      toast({
        title: "יציאה נכשלה",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user,
        isLoading,
        error,
        profileComplete,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
