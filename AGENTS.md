# ThinkLink Project - Golden Rules

This file contains the critical architecture rules for the ThinkLink project. You MUST follow these rules for all code changes to prevent bugs.

## 1. Authentication & Users
- **System:** We use **Supabase Auth** (`supabase.auth`).
- **User ID:** The user's ID is ALWAYS retrieved via `auth.uid()`.
- **User Data:** User auth data (email) is in `auth.users`. All profile data (name, picture, etc.) is in a *separate* table: `public.profiles`.
- **Security:** ALL tables are secured with **Row Level Security (RLS)**.

## 2. CRITICAL: Database Naming (snake_case)
- All database columns use **`snake_case`** (e.g., `full_name`, `avatar_url`, `host_id`, `start_at`, `meetup_id`).
- When you `insert()`, `update()`, or `upsert()` data from the JavaScript client, the keys in the JavaScript object **MUST** match the `snake_case` schema.
- **Example (Correct):** `supabase.from('profiles').update({ full_name: 'Sagi', avatar_url: '...' })`
- **Example (INCORRECT - WILL CRASH):** `supabase.from('profiles').update({ fullName: 'Sagi', avatarUrl: '...' })`

## 3. Critical: Time Zone Handling
- **Problem:** Our `start_at` column is `timestamp without time zone` (naive). Users input time in 'Asia/Jerusalem'.
- **Solution:** You **MUST NOT** use `new Date().toISOString()` or `.gte('start_at', 'now()')` to filter meetups.
- **THE RULE:** To get a list of future meetups, you **MUST** use our custom SQL function:
  `supabase.rpc('get_future_meetups', { p_topic: '...' })`

## 4. Storage (Profile Pictures)
- **Service:** We use **Supabase Storage**.
- **Bucket:** `avatars` (public, RLS enabled).
- **Path:** All file uploads **MUST** be saved to a path that matches the user's ID to satisfy RLS policies.
- **Correct Path:** `[user_id]/[filename]` (e.g., `efdb9e68.../avatar.jpg`).

## 5. UI & Language
- **Design:** All new UI MUST reuse existing app components (`<Input>`, `<Button>`, `<Card>`, etc.) to maintain design consistency.
- **Language:** All user-facing text (labels, error messages, placeholders) MUST be in **Hebrew**.
