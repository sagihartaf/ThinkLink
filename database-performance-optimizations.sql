-- ThinkLink Database Performance Optimizations
-- Based on pre-launch audit findings
-- Run this in Supabase SQL Editor

-- ==============================================
-- 1. CRITICAL INDEXES FOR MEETUPS TABLE
-- ==============================================

-- Index for topic filtering (high-frequency query)
CREATE INDEX IF NOT EXISTS idx_meetups_topic ON public.meetups(topic);

-- Index for date filtering (start_at queries)
CREATE INDEX IF NOT EXISTS idx_meetups_start_at ON public.meetups(start_at);

-- Index for host-based queries
CREATE INDEX IF NOT EXISTS idx_meetups_host_id ON public.meetups(host_id);

-- Composite index for topic + date filtering (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_meetups_topic_start_at ON public.meetups(topic, start_at);

-- Note: Partial index with now() removed due to PostgreSQL immutability requirements
-- The start_at index above will still provide excellent performance for date filtering

-- ==============================================
-- 2. OPTIMIZED GET_FUTURE_MEETUPS FUNCTION
-- ==============================================

-- Replace the existing function with optimized version
CREATE OR REPLACE FUNCTION get_future_meetups(
  p_topic TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  host_id UUID,
  title TEXT,
  topic TEXT,
  description TEXT,
  start_at TIMESTAMP WITHOUT TIME ZONE,
  location TEXT,
  place_name TEXT,
  custom_location_details TEXT,
  capacity INTEGER,
  icebreaker TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  host_name TEXT,
  host_avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.host_id,
    m.title,
    m.topic,
    m.description,
    m.start_at,
    m.location,
    m.place_name,
    m.custom_location_details,
    m.capacity,
    m.icebreaker,
    m.created_at,
    p.full_name as host_name,
    p.avatar_url as host_avatar_url
  FROM meetups m
  LEFT JOIN profiles p ON m.host_id = p.id
  WHERE m.start_at > (now() AT TIME ZONE 'Asia/Jerusalem')
    AND (p_topic IS NULL OR m.topic = p_topic)
  ORDER BY m.start_at ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- 3. ADDITIONAL PERFORMANCE INDEXES
-- ==============================================

-- Index for participations table (user-meetup lookups)
CREATE INDEX IF NOT EXISTS idx_participations_user_id ON public.participations(user_id);
CREATE INDEX IF NOT EXISTS idx_participations_meetup_id ON public.participations(meetup_id);

-- Index for messages table (meetup-based queries)
CREATE INDEX IF NOT EXISTS idx_messages_meetup_id ON public.messages(meetup_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

-- ==============================================
-- 4. VERIFICATION QUERIES
-- ==============================================

-- Check that indexes were created successfully
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('meetups', 'participations', 'messages')
ORDER BY tablename, indexname;

-- Test the optimized function
SELECT * FROM get_future_meetups('טכנולוגיה', 10, 0);

-- Check function performance with EXPLAIN
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM get_future_meetups('טכנולוגיה', 10, 0);
