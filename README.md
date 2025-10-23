# ThinkLink - Meetup & Event Management Platform

ThinkLink is a modern web application that allows users to create, discover, and join meetups and events. Users can browse events by topic, join discussions, and connect with like-minded people.

## Features

- 🎯 **Create & Join Meetups**: Host your own events or join existing ones
- 🏷️ **Topic-based Discovery**: Browse events by categories and interests  
- 💬 **Event Chat**: Communicate with other participants
- 👤 **User Profiles**: Manage your profile and track your events
- 📱 **Responsive Design**: Works great on desktop and mobile
- 🔐 **Secure Authentication**: User registration and login system
- 🌐 **Public Profiles**: View other users' profiles and interests
- 📸 **Avatar Upload**: Upload and manage profile pictures
- 🔒 **Row Level Security**: Secure data access with RLS policies

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Radix UI, Vite
- **Backend**: Supabase (Backend-as-a-Service)
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage (for avatars)
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Deployment**: Ready for platforms like Vercel, Railway, or Render

## Prerequisites

Before running this project, make sure you have:

- **Node.js** (version 18 or higher)
- **npm** (comes with Node.js)
- **Supabase Account** (free tier available at https://supabase.com)

## Quick Start

### 1. Clone and Install Dependencies

```bash
# Navigate to your project directory
cd "ThinkLink (replit)"

# Install dependencies
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL="your-supabase-project-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"

# Environment
NODE_ENV="development"
```

**Important**: 
- Get your Supabase URL and anon key from your Supabase project settings
- Go to Settings → API in your Supabase dashboard
- Copy the Project URL and anon/public key

### 3. Set Up Supabase Database

1. Create a new Supabase project at https://supabase.com
2. Go to the SQL Editor in your Supabase dashboard
3. Run the database schema migrations (see Database Setup section below)

### 4. Run the Development Server

```bash
# Start the development server
npm run dev
```

The application will be available at `http://localhost:5173`

## Database Setup

### Supabase Database (Recommended)

1. **Create Supabase Project**:
   - Go to https://supabase.com
   - Create a new project
   - Wait for the database to be ready

2. **Set Up Database Schema**:
   - Go to SQL Editor in your Supabase dashboard
   - Run the following SQL commands to create tables and RLS policies:

```sql
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  birthdate DATE,
  instagram_url TEXT,
  about_me TEXT,
  interests TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create meetups table
CREATE TABLE public.meetups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  topic TEXT NOT NULL,
  place_name TEXT,
  custom_location_details TEXT,
  address TEXT,
  start_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  max_participants INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create participations table
CREATE TABLE public.participations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  meetup_id UUID REFERENCES public.meetups(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, meetup_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  meetup_id UUID REFERENCES public.meetups(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create app_feedback table
CREATE TABLE public.app_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  feedback TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_feedback ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated read on profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow users to update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Allow users to insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow public read access on meetups" ON public.meetups FOR SELECT TO public USING (true);
CREATE POLICY "Allow authenticated users to create meetups" ON public.meetups FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Allow hosts to update own meetups" ON public.meetups FOR UPDATE TO authenticated USING (auth.uid() = host_id);
CREATE POLICY "Allow hosts to delete own meetups" ON public.meetups FOR DELETE TO authenticated USING (auth.uid() = host_id);

CREATE POLICY "Allow authenticated read on participations" ON public.participations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow users to join meetups" ON public.participations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow users to leave meetups" ON public.participations FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Allow authenticated read on messages" ON public.messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to send messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to submit feedback" ON public.app_feedback FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Enable RLS on storage
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create storage policies
CREATE POLICY "Public read access for avatars" ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars');
CREATE POLICY "Authenticated upload/update/delete for avatars" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create RPC function for future meetups
CREATE OR REPLACE FUNCTION get_future_meetups(p_topic TEXT DEFAULT NULL)
RETURNS SETOF meetups AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM meetups
  WHERE (start_at AT TIME ZONE 'Asia/Jerusalem') > now()
    AND (p_topic IS NULL OR topic = p_topic)
  ORDER BY start_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

3. **Set Up Storage**:
   - Go to Storage in your Supabase dashboard
   - The avatars bucket should be created automatically
   - Verify the bucket is public and has the correct policies

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - Type check with TypeScript
- `npm run vercel-build` - Build for Vercel deployment
- `npm run mcp:start` - Start MCP server for Supabase integration
- `npm run mcp:config` - Display MCP configuration instructions

## Project Structure

```
ThinkLink/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   ├── ui/         # Radix UI components
│   │   │   ├── onboarding.tsx
│   │   │   ├── meetup-card.tsx
│   │   │   └── profile-gatekeeper.tsx
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utilities and configurations
│   │   │   ├── supabase.ts # Supabase client configuration
│   │   │   └── utils.ts    # Utility functions
│   │   ├── constants/      # App constants
│   │   └── main.tsx        # App entry point
├── server/                 # Minimal server for development
│   ├── index.ts           # Server entry point
│   ├── routes.ts          # API routes (minimal)
│   └── vite.ts            # Vite integration
├── shared/                 # Shared types and schemas
│   └── schema.ts          # TypeScript types
├── AGENTS.md              # Development guidelines and rules
└── package.json           # Dependencies and scripts
```

## Deployment

### Deploy to Vercel (Recommended)

1. **Push your code to GitHub**
2. **Connect your GitHub repo to Vercel**
3. **Add environment variables in Vercel dashboard**:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
4. **Deploy!**

### Deploy to Railway

1. **Connect your GitHub repo to Railway**
2. **Add environment variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. **Deploy!**

### Deploy to Render

1. **Connect your GitHub repo to Render**
2. **Add environment variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. **Deploy!**

## Environment Variables for Production

For production deployment, make sure to set:

```env
NEXT_PUBLIC_SUPABASE_URL="your-production-supabase-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-production-supabase-anon-key"
NODE_ENV="production"
```

## Troubleshooting

### Common Issues

1. **Supabase connection errors**: 
   - Verify your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
   - Check that your Supabase project is active
   - Ensure the anon key has the correct permissions

2. **Database errors**:
   - Make sure you've run all the SQL commands in the Database Setup section
   - Check that RLS policies are properly configured
   - Verify the `get_future_meetups` function exists

3. **Authentication issues**:
   - Check that Supabase Auth is enabled in your project
   - Verify email confirmation settings if using email auth
   - Ensure RLS policies allow the operations you're trying to perform

4. **Storage issues**:
   - Verify the avatars bucket exists and is public
   - Check storage policies are correctly configured
   - Ensure file uploads use the correct path format (`user_id/filename`)

5. **Build errors**: 
   - Run `npm run check` to see TypeScript errors
   - Make sure all environment variables are set
   - Check that all dependencies are installed

### Getting Help

If you encounter issues:
1. Check the browser console for error messages
2. Verify your Supabase project settings and environment variables
3. Check the Supabase dashboard for any service issues
4. Review the AGENTS.md file for development guidelines
5. Try deleting `node_modules` and running `npm install` again

## Contributing

This project was generated with AI assistance and is ready for customization and enhancement. Feel free to modify it according to your needs!

## License

MIT License - feel free to use this project for personal or commercial purposes.