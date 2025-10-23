import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hziongcacamxclnkloho.supabase.co'
const supabaseAnonKey = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6aW9uZ2NhY2FteGNsbmtsb2hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzYzOTIsImV4cCI6MjA3NDk1MjM5Mn0.kf0CGl-5NuO4pTQjwYC2BN1ypKxkjXaRQxjXp_gwm04'

console.log("🔧 Supabase client initialized:", { 
  url: supabaseUrl, 
  hasAnonKey: !!supabaseAnonKey,
  anonKeyLength: supabaseAnonKey?.length 
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
