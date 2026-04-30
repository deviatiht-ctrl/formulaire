-- ============================================================
-- LIVE STREAMING TABLES — Track viewers and reactions
-- ============================================================

-- Table to track viewers watching the live stream
CREATE TABLE live_viewers (
    id SERIAL PRIMARY KEY,
    participant_id INTEGER REFERENCES participants(id) ON DELETE SET NULL,
    prenom VARCHAR(100),
    nom VARCHAR(100),
    email VARCHAR(255),
    platform VARCHAR(50) DEFAULT 'zoom', -- zoom, tiktok, facebook, instagram
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(participant_id)
);

-- Table to store real-time reactions from viewers
CREATE TABLE live_reactions (
    id SERIAL PRIMARY KEY,
    participant_id INTEGER REFERENCES participants(id) ON DELETE SET NULL,
    prenom VARCHAR(100),
    nom VARCHAR(100),
    emoji VARCHAR(10) NOT NULL,
    platform VARCHAR(50) DEFAULT 'zoom',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_live_viewers_active ON live_viewers(is_active) WHERE is_active = true;
CREATE INDEX idx_live_viewers_last_seen ON live_viewers(last_seen);
CREATE INDEX idx_live_reactions_created ON live_reactions(created_at);

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Allow anonymous to insert/update (for viewers)
CREATE POLICY "Allow anon insert viewers"
    ON live_viewers FOR INSERT
    TO anon
    WITH CHECK (true);

CREATE POLICY "Allow anon update viewers"
    ON live_viewers FOR UPDATE
    TO anon
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow anon read viewers"
    ON live_viewers FOR SELECT
    TO anon
    USING (true);

-- Allow anonymous to insert reactions
CREATE POLICY "Allow anon insert reactions"
    ON live_reactions FOR INSERT
    TO anon
    WITH CHECK (true);

CREATE POLICY "Allow anon read reactions"
    ON live_reactions FOR SELECT
    TO anon
    USING (true);

-- ============================================================
-- FUNCTION TO GET ACTIVE VIEWERS COUNT
-- ============================================================

CREATE OR REPLACE FUNCTION get_active_viewers_count()
RETURNS INTEGER AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM live_viewers 
            WHERE is_active = true 
            AND last_seen > NOW() - INTERVAL '2 minutes');
END;
$$ LANGUAGE plpgsql;
