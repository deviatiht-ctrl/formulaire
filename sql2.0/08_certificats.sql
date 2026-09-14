-- ============================================================
--  RASIN AYITI 2.0 — SISTEM SETIFIKA PEYAN
--  Kouri sa nan: Supabase Dashboard > SQL Editor
--  1. Admin mete si yon evènman/séminaire/formation ofri
--     sètifika, ak pri l si l peyan.
--  2. Patisipan an chwazi si l vle sètifika a nan fòm
--     enskripsyon an, peye pa MonCash/NatCash, epi voye
--     preuve peman an (obligatwa si sètifika a peyan).
-- ============================================================

-- ============================================================
-- 1. EVENEMENTS — sètifika disponib + pri
-- ============================================================
ALTER TABLE public.rasinayiti_events
    ADD COLUMN IF NOT EXISTS avec_certificat BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS prix_certificat NUMERIC(10,2) DEFAULT 0;

-- ============================================================
-- 2. SEMINAIRES — sètifika disponib + pri
--    (formations gen deja avec_certificat/prix_certificat)
-- ============================================================
ALTER TABLE public.rasinayiti_seminaires
    ADD COLUMN IF NOT EXISTS avec_certificat BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS prix_certificat NUMERIC(10,2) DEFAULT 0;

-- ============================================================
-- 3. INSCRIPTIONS EVENEMENTS — chwa + peman sètifika
-- ============================================================
ALTER TABLE public.rasinayiti_inscriptions_evenements
    ADD COLUMN IF NOT EXISTS etudiant_id UUID REFERENCES public.rasinayiti_etudiants(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS veut_certificat BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS certificat_prix NUMERIC(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS certificat_mode_paiement TEXT,
    ADD COLUMN IF NOT EXISTS certificat_preuve_url TEXT,
    ADD COLUMN IF NOT EXISTS certificat_statut_paiement TEXT DEFAULT 'non_requis'
        CHECK (certificat_statut_paiement IN ('non_requis','en_attente','verifie','refuse')),
    ADD COLUMN IF NOT EXISTS certificat_delivre BOOLEAN DEFAULT false;

-- ============================================================
-- 4. INSCRIPTIONS (formations/séminaires) — menm bagay
-- ============================================================
ALTER TABLE public.rasinayiti_inscriptions
    ADD COLUMN IF NOT EXISTS veut_certificat BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS certificat_prix NUMERIC(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS certificat_mode_paiement TEXT,
    ADD COLUMN IF NOT EXISTS certificat_preuve_url TEXT,
    ADD COLUMN IF NOT EXISTS certificat_statut_paiement TEXT DEFAULT 'non_requis'
        CHECK (certificat_statut_paiement IN ('non_requis','en_attente','verifie','refuse')),
    ADD COLUMN IF NOT EXISTS certificat_delivre BOOLEAN DEFAULT false;

-- ============================================================
-- VERIFYE
-- ============================================================
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name LIKE 'rasinayiti_%'
  AND (column_name LIKE '%certificat%' OR column_name = 'etudiant_id')
ORDER BY table_name, column_name;
