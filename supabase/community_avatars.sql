-- Community Avatars Table
-- Stores user-uploaded avatars that are available globally to all players

CREATE TABLE IF NOT EXISTS community_avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  avatar_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  color TEXT NOT NULL,
  accent_color TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries ordered by creation date
CREATE INDEX IF NOT EXISTS idx_community_avatars_created_at ON community_avatars(created_at DESC);

-- Enable Row Level Security
ALTER TABLE community_avatars ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read community avatars
CREATE POLICY "Community avatars are publicly readable"
  ON community_avatars
  FOR SELECT
  USING (true);

-- Policy: Anyone can insert new avatars (anonymous upload)
CREATE POLICY "Anyone can upload community avatars"
  ON community_avatars
  FOR INSERT
  WITH CHECK (true);

-- Note: No delete or update policies - avatars are permanent once uploaded
-- (You can add moderation/admin policies later if needed)
