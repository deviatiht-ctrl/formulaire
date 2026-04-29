-- ============================================================
-- SEMINAR PRESENCE TRACKING
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add is_present and last_seen columns to participants table
ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS is_present BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_seen  TIMESTAMPTZ;

-- Allow updates from browser client
CREATE POLICY IF NOT EXISTS "Allow participants to update their presence"
  ON participants FOR UPDATE
  USING (true)
  WITH CHECK (true);
