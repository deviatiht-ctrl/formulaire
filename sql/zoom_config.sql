-- ============================================================
-- ZOOM CONFIG TABLE — Shared meeting settings for all users
-- ============================================================

-- Create table
CREATE TABLE IF NOT EXISTS zoom_config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    meeting_id TEXT,
    password TEXT,
    link TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT single_row CHECK (id = 1)
);

-- Enable RLS
ALTER TABLE zoom_config ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read (needed for participants)
CREATE POLICY "Allow read zoom config" 
ON zoom_config FOR SELECT TO anon, authenticated 
USING (true);

-- Allow authenticated users to upsert (for admin updates)
CREATE POLICY "Allow upsert zoom config" 
ON zoom_config FOR ALL TO authenticated 
USING (true)
WITH CHECK (true);

-- Insert default row
INSERT INTO zoom_config (id, meeting_id, password, link)
VALUES (1, '', '', '')
ON CONFLICT (id) DO NOTHING;
