-- ============================================================
-- ACCESS_CODE.SQL - Nouvelles colonnes pour codes d'accès
-- Kouri sa nan Supabase > SQL Editor
-- ============================================================

-- 1. Ajoute colonnes pou access code
ALTER TABLE participants ADD COLUMN IF NOT EXISTS access_code TEXT UNIQUE;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS code_genere_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS certificat_telecharge BOOLEAN DEFAULT FALSE;

-- 2. Index pou cherche code vit
CREATE UNIQUE INDEX IF NOT EXISTS idx_participants_access_code ON participants(access_code)
    WHERE access_code IS NOT NULL;

-- 3. Politique: tout moun ka lire pa code (pou validate access)
DROP POLICY IF EXISTS "Allow select by code" ON participants;
CREATE POLICY "Allow select by code" ON participants
    FOR SELECT TO anon, authenticated
    USING (true);

-- ============================================================
-- Verifye:
-- SELECT id, nom, prenom, access_code FROM participants LIMIT 5;
-- ============================================================
