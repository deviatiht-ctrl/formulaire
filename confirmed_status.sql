-- ============================================================
-- CONFIRMED_STATUS.SQL - Marquer participants ki resevwa email
-- ============================================================

-- 1. Ajoute kolòn confirmed
ALTER TABLE participants ADD COLUMN IF NOT EXISTS confirmed BOOLEAN DEFAULT FALSE;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE;

-- 2. Index
CREATE INDEX IF NOT EXISTS idx_participants_confirmed ON participants(confirmed);

-- 3. Fonksyon pou mark kòm confirmed
CREATE OR REPLACE FUNCTION mark_confirmed(participant_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE participants 
    SET confirmed = TRUE, 
        confirmed_at = NOW(),
        email_sent = TRUE,
        email_sent_at = COALESCE(email_sent_at, NOW())
    WHERE id = participant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Fonksyon pou jwenn tout confirmed (pou seksyon Confirmés)
CREATE OR REPLACE FUNCTION get_confirmed_participants()
RETURNS SETOF participants AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM participants
    WHERE confirmed = TRUE OR statut_paiement = 'verifie'
    ORDER BY confirmed_at DESC NULLS LAST, date_inscription DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Verifye:
-- SELECT COUNT(*) FROM participants WHERE confirmed = TRUE;
-- ============================================================
