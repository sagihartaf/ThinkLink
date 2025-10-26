-- Fix for My Events page - add user-specific filtering to get_future_meetups function
-- This eliminates client-side filtering that fails due to UUID/VARCHAR type mismatch

-- Step 1: Drop the existing function
DROP FUNCTION IF EXISTS get_future_meetups(text,integer,integer);

-- Step 2: Create the improved function with optional user filtering
CREATE OR REPLACE FUNCTION get_future_meetups(
  p_topic TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE(
  id CHARACTER VARYING,
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
  created_at TIMESTAMP WITHOUT TIME ZONE,
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
    AND (p_user_id IS NULL OR m.host_id = p_user_id)
  ORDER BY m.start_at ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the function with user filtering
SELECT * FROM get_future_meetups(NULL, 10, 0, NULL);  -- All meetups
-- SELECT * FROM get_future_meetups(NULL, 10, 0, 'user-id-here');  -- Filtered by user

