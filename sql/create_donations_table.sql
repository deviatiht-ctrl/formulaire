-- ============================================================
--  KREYE TABLE DONATIONS
--  Kreye: 2026
--  Deskripsyon: Table pour les donations au Département de Développement Juvénile
-- ============================================================

-- Drop table si li egziste deja (pour recreation propre)
DROP TABLE IF EXISTS public.donations CASCADE;

-- Kreye table donations
CREATE TABLE public.donations (
    id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nom_donateur        TEXT,                    -- Nom du donateur (null si anonyme)
    association_nom     TEXT,                    -- Nom de l'association (si applicable)
    est_anonyme         BOOLEAN DEFAULT false,   -- Donation anonyme
    montant             NUMERIC(10,2) NOT NULL,   -- Montant du don
    devise              VARCHAR(10) DEFAULT 'HTG',
    but_don             TEXT NOT NULL,           -- But du don: 'general', 'rasin', 'evenement', 'activite'
    evenement_id        UUID,                    -- ID de l'événement (si but_don = 'evenement')
    activite_specifique TEXT,                    -- Description de l'activité spécifique
    methode_paiement    TEXT NOT NULL,           -- 'monacash', 'natcash', 'manuel'
    preuve_paiement_url TEXT,                    -- URL de la preuve de paiement (upload)
    email               TEXT,                    -- Email du donateur (pour confirmation)
    telephone           TEXT,                    -- Téléphone du donateur
    statut              TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_attente','confirme','annule')),
    message             TEXT,                    -- Message du donateur
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_donations_statut ON public.donations(statut);
CREATE INDEX IF NOT EXISTS idx_donations_date ON public.donations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_donations_methode ON public.donations(methode_paiement);

-- RLS Policies
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- Public peut insérer des donations
DROP POLICY IF EXISTS "Public insert donations" ON public.donations;
CREATE POLICY "Public insert donations" ON public.donations
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

-- Public peut lire ses propres donations (basé sur email)
DROP POLICY IF EXISTS "Public read own donations" ON public.donations;
CREATE POLICY "Public read own donations" ON public.donations
    FOR SELECT TO anon, authenticated
    USING (true);

-- Admin peut tout faire
DROP POLICY IF EXISTS "Admin full access donations" ON public.donations;
CREATE POLICY "Admin full access donations" ON public.donations
    FOR ALL TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- Vérification
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'donations'
ORDER BY ordinal_position;
