-- ============================================================
--  CREER TABLES POUR LOGIN (ADMINISTRATEURS ET ETUDIANTS)
--  Kreye: 2026
--  Deskripsyon: Kreye tablo administrateurs ak etudiants pou sistèm login
-- ============================================================

-- ============================================================
--  TABLO: ADMINISTRATEURS
-- ============================================================
-- Si tablo la deja ekziste ak NOT NULL constraint, modifye li
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'administrateurs' 
               AND column_name = 'mot_de_passe_hash' 
               AND is_nullable = 'NO') THEN
        ALTER TABLE administrateurs ALTER COLUMN mot_de_passe_hash DROP NOT NULL;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS administrateurs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Enfòmasyon
    prenom VARCHAR(100) NOT NULL,
    nom VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telephone VARCHAR(20),
    
    -- Sekirite
    mot_de_passe_hash VARCHAR(255),
    
    -- Rôl
    role VARCHAR(50) DEFAULT 'admin', -- super_admin, admin, formateur
    permissions JSONB DEFAULT '[]',
    
    -- Status
    actif BOOLEAN DEFAULT true,
    dernier_login TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
--  TABLO: ETUDIANTS
-- ============================================================
CREATE TABLE IF NOT EXISTS etudiants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Enfòmasyon pèsonel
    prenom VARCHAR(100) NOT NULL,
    nom VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telephone VARCHAR(20),
    date_naissance DATE,
    
    -- Adres
    adresse TEXT,
    ville VARCHAR(100),
    pays VARCHAR(100) DEFAULT 'Haïti',
    
    -- Sekirite
    mot_de_passe_hash VARCHAR(255),
    code_acces_temp VARCHAR(10),
    
    -- Profil
    photo_profil VARCHAR(500),
    bio TEXT,
    niveau_etude VARCHAR(100),
    profession VARCHAR(100),
    
    -- Status kont
    status VARCHAR(50) DEFAULT 'actif', -- actif, inactif, suspendu
    email_verifie BOOLEAN DEFAULT false,
    
    -- Dat
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
--  FONKSIYON POU UPDATE updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================
--  TRIGGER POU UPDATE updated_at
-- ============================================================
DROP TRIGGER IF EXISTS update_administrateurs_updated_at ON administrateurs;
CREATE TRIGGER update_administrateurs_updated_at BEFORE UPDATE ON administrateurs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_etudiants_updated_at ON etudiants;
CREATE TRIGGER update_etudiants_updated_at BEFORE UPDATE ON etudiants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
--  RLS POLICIES
-- ============================================================
-- Enable RLS
ALTER TABLE administrateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE etudiants ENABLE ROW LEVEL SECURITY;

-- Policies for administrateurs
DROP POLICY IF EXISTS "Allow select administrateurs for authenticated" ON administrateurs;
CREATE POLICY "Allow select administrateurs for authenticated" ON administrateurs
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow insert administrateurs for service_role" ON administrateurs;
CREATE POLICY "Allow insert administrateurs for service_role" ON administrateurs
    FOR INSERT TO service_role
    WITH CHECK (true);

-- Policies for etudiants
DROP POLICY IF EXISTS "Allow select etudiants for authenticated" ON etudiants;
CREATE POLICY "Allow select etudiants for authenticated" ON etudiants
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow insert etudiants for service_role" ON etudiants;
CREATE POLICY "Allow insert etudiants for service_role" ON etudiants
    FOR INSERT TO service_role
    WITH CHECK (true);

-- ============================================================
--  INSERE ADMIN
-- ============================================================

-- Admin 1 (Super Admin)
-- Email: laurorejeanclarens0@gmail.com
-- Password: Deja kreye nan Supabase Auth
INSERT INTO administrateurs (prenom, nom, email, role) VALUES
('Laurore', 'Jean', 'laurorejeanclarens0@gmail.com', 'super_admin')
ON CONFLICT (email) DO UPDATE SET
    actif = true,
    updated_at = NOW();

SELECT 'ADMIN INSERE AVEC SUCCES!' AS message;
