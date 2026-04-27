-- ============================================
-- SQL COMPLET - EventJeunes 2026
-- ============================================

-- ============================================
-- 1. TABLE ADMIN USERS (Stocke seulement les emails admins)
-- ============================================
CREATE TABLE IF NOT EXISTS admin_users (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    nom TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index admin
CREATE INDEX IF NOT EXISTS idx_admin_email ON admin_users(email);

-- Insérer l'admin par défaut (créer ce compte dans Supabase Auth aussi!)
INSERT INTO admin_users (email, nom)
VALUES ('rasinayiti@gmail.com', 'Admin Rasin')
ON CONFLICT (email) DO NOTHING;

-- Activer RLS sur admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Politique: tout le monde peut lire la liste des admins (pour vérification login)
DROP POLICY IF EXISTS "Allow select admins for all" ON admin_users;
CREATE POLICY "Allow select admins for all" ON admin_users
    FOR SELECT TO anon, authenticated
    USING (true);

-- ============================================
-- 2. TABLE PARTICIPANTS
-- ============================================
CREATE TABLE IF NOT EXISTS participants (
    id BIGSERIAL PRIMARY KEY,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    telephone TEXT,
    date_inscription TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- QR Code
    qr_code TEXT,
    
    -- Paiement Certificat (500 Gds) - optionnel
    frais INTEGER DEFAULT 0,
    statut_paiement TEXT DEFAULT 'non_requis', -- non_requis, en_attente, verifie, refuse
    preuve_paiement TEXT,
    mode_paiement TEXT, -- moncash, natcash
    date_paiement TIMESTAMP WITH TIME ZONE,
    
    -- Email
    email_envoye BOOLEAN DEFAULT FALSE,
    date_email TIMESTAMP WITH TIME ZONE
);

-- Index participants
CREATE INDEX IF NOT EXISTS idx_participants_email ON participants(email);
CREATE INDEX IF NOT EXISTS idx_participants_statut ON participants(statut_paiement);

-- ============================================
-- 2. TABLE DONATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS donations (
    id BIGSERIAL PRIMARY KEY,
    nom TEXT,
    prenom TEXT,
    telephone TEXT NOT NULL,
    montant INTEGER NOT NULL,
    mode_paiement TEXT NOT NULL, -- moncash, natcash
    preuve_paiement TEXT,
    type_donateur TEXT DEFAULT 'anonymous', -- anonymous, named
    statut TEXT DEFAULT 'en_attente', -- en_attente, verifie, refuse
    date_don TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index donations
CREATE INDEX IF NOT EXISTS idx_donations_statut ON donations(statut);
CREATE INDEX IF NOT EXISTS idx_donations_date ON donations(date_don);

-- ============================================
-- 4. ACTIVER ROW LEVEL SECURITY
-- ============================================

-- Participants
drop policy if exists "Allow insert for all" on participants;
drop policy if exists "Allow select for all" on participants;
drop policy if exists "Allow update for authenticated" on participants;
drop policy if exists "Allow delete for authenticated" on participants;

ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow insert for all" ON participants;
CREATE POLICY "Allow insert for all" ON participants
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow select for all" ON participants;
CREATE POLICY "Allow select for all" ON participants
    FOR SELECT TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow update for authenticated" ON participants;
CREATE POLICY "Allow update for authenticated" ON participants
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete for authenticated" ON participants;
CREATE POLICY "Allow delete for authenticated" ON participants
    FOR DELETE TO authenticated
    USING (true);

-- Donations
drop policy if exists "Allow insert donations for all" on donations;
drop policy if exists "Allow select donations for all" on donations;
drop policy if exists "Allow update donations for authenticated" on donations;
drop policy if exists "Allow delete donations for authenticated" on donations;

ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow insert donations for all" ON donations;
CREATE POLICY "Allow insert donations for all" ON donations
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow select donations for all" ON donations;
CREATE POLICY "Allow select donations for all" ON donations
    FOR SELECT TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow update donations for authenticated" ON donations;
CREATE POLICY "Allow update donations for authenticated" ON donations
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete donations for authenticated" ON donations;
CREATE POLICY "Allow delete donations for authenticated" ON donations
    FOR DELETE TO authenticated
    USING (true);

-- ============================================
-- 5. STORAGE BUCKET
-- ============================================

-- Créer le bucket 'paiements' (si il n'existe pas)
INSERT INTO storage.buckets (id, name, public, created_at, updated_at)
VALUES ('paiements', 'paiements', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 7. STORAGE BUCKET POLICIES
-- ============================================

-- Politique pour upload (tout le monde)
DROP POLICY IF EXISTS "Allow upload for all" ON storage.objects;
CREATE POLICY "Allow upload for all" ON storage.objects
    FOR INSERT TO anon, authenticated
    WITH CHECK (bucket_id = 'paiements');

-- Politique pour lecture (tout le monde)
DROP POLICY IF EXISTS "Allow read for all" ON storage.objects;
CREATE POLICY "Allow read for all" ON storage.objects
    FOR SELECT TO anon, authenticated
    USING (bucket_id = 'paiements');

-- Politique pour suppression (admin uniquement)
DROP POLICY IF EXISTS "Allow delete for authenticated" ON storage.objects;
CREATE POLICY "Allow delete for authenticated" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'paiements');

-- ============================================
-- 8. CONFIGURATION SUPABASE STORAGE
-- ============================================

-- Instructions:
-- 1. Aller dans Storage > New bucket
-- 2. Nom: paiements
-- 3. Cocher "Public bucket"
-- 4. Créer

-- ============================================
-- 9. DONNÉES DE TEST (OPTIONNEL)
-- ============================================

-- Participants test
INSERT INTO participants (nom, prenom, email, telephone, frais, statut_paiement, mode_paiement, email_envoye)
VALUES 
    ('Dupont', 'Marie', 'marie@example.com', '+509 34 56 7890', 0, 'non_requis', NULL, FALSE),
    ('Martin', 'Jean', 'jean@example.com', '+509 45 67 8901', 500, 'verifie', 'moncash', TRUE),
    ('Bernard', 'Sophie', 'sophie@example.com', '+509 56 78 9012', 0, 'non_requis', NULL, FALSE)
ON CONFLICT (email) DO NOTHING;

-- Donations test
INSERT INTO donations (nom, prenom, telephone, montant, mode_paiement, type_donateur, statut)
VALUES 
    ('Jean', 'Dupont', '+509 34 56 7890', 1000, 'moncash', 'named', 'verifie'),
    ('Anonyme', '', '+509 45 67 8901', 500, 'natcash', 'anonymous', 'en_attente'),
    ('Marie', 'Martin', '+509 56 78 9012', 2000, 'moncash', 'named', 'verifie')
ON CONFLICT DO NOTHING;

-- ============================================
-- 10. VUES POUR STATISTIQUES
-- ============================================

-- Vue statistiques participants
CREATE OR REPLACE VIEW stats_participants AS
SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE date_inscription::date = CURRENT_DATE) as today,
    COUNT(*) FILTER (WHERE statut_paiement = 'verifie') as paiements_verifies,
    COUNT(*) FILTER (WHERE email_envoye = TRUE) as emails_envoyes
FROM participants;

-- Vue statistiques donations
CREATE OR REPLACE VIEW stats_donations AS
SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE statut = 'verifie') as verifies,
    COUNT(*) FILTER (WHERE statut = 'en_attente') as en_attente,
    COALESCE(SUM(montant) FILTER (WHERE statut = 'verifie'), 0) as montant_total
FROM donations;

-- ============================================
-- FIN DU SCRIPT
-- ============================================
