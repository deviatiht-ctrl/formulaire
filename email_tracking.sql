-- ============================================================
-- EMAIL_TRACKING.SQL - Suivi des emails envoyés
-- Kouri sa nan Supabase > SQL Editor
-- ============================================================

-- 1. Ajoute kolòn pou swiv email voye
ALTER TABLE participants ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP WITH TIME ZONE;

-- 2. Index pou filtè vit
CREATE INDEX IF NOT EXISTS idx_participants_email_sent ON participants(email_sent);
CREATE INDEX IF NOT EXISTS idx_participants_created_at ON participants(created_at DESC);

-- 3. Fonksyon pou mark email kòm voye
CREATE OR REPLACE FUNCTION mark_email_sent(participant_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE participants 
    SET email_sent = TRUE, 
        email_sent_at = NOW() 
    WHERE id = participant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Fonksyon pou reset (pou test)
CREATE OR REPLACE FUNCTION reset_email_sent(participant_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE participants 
    SET email_sent = FALSE, 
        email_sent_at = NULL 
    WHERE id = participant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Verifye:
-- SELECT id, nom, prenom, email, email_sent, email_sent_at FROM participants LIMIT 5;
-- ============================================================
