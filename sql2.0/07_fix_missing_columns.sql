-- ============================================================
--  RASIN AYITI 2.0 — FIX KOLOn KI MANKE (MIGRATION)
--  Kouri sa nan: Supabase Dashboard > SQL Editor
--  Sa ajoute tout kolòn kòd frontend la itilize ki pa nan
--  schema 01_tables.sql la, epi korije CHECK constraints.
--  Idempotent: ou ka kouri l plizyè fwa san pwoblèm.
-- ============================================================

-- ============================================================
-- 1. EVENTS — kolòn admin/events.html ak sit la itilize
-- ============================================================
ALTER TABLE public.rasinayiti_events
    ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS duration VARCHAR(100);

-- Admin la itilize status 'brouillon' tou — elaji CHECK la
ALTER TABLE public.rasinayiti_events
    DROP CONSTRAINT IF EXISTS rasinayiti_events_status_check;
ALTER TABLE public.rasinayiti_events
    ADD CONSTRAINT rasinayiti_events_status_check
    CHECK (status IN ('actif','brouillon','termine','annule','archive','publie','en_cours'));

-- ============================================================
-- 2. SEMINAIRES — kolòn admin/seminaires.html itilize
-- ============================================================
ALTER TABLE public.rasinayiti_seminaires
    ADD COLUMN IF NOT EXISTS prix NUMERIC(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS lien_live VARCHAR(500),
    ADD COLUMN IF NOT EXISTS image_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- 'code' se NOT NULL men admin la pa voye l → fè l nullable
ALTER TABLE public.rasinayiti_seminaires
    ALTER COLUMN code DROP NOT NULL;

-- ============================================================
-- 3. FORMATIONS — kolòn admin/formations.html itilize
-- ============================================================
ALTER TABLE public.rasinayiti_formations
    ADD COLUMN IF NOT EXISTS couleur VARCHAR(20) DEFAULT '#2563eb',
    ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

ALTER TABLE public.rasinayiti_formations
    ALTER COLUMN code DROP NOT NULL;

-- ============================================================
-- 4. DONATIONS — de fòm don yo itilize (vye + nouvo)
-- ============================================================
ALTER TABLE public.rasinayiti_donations
    ADD COLUMN IF NOT EXISTS nom TEXT,
    ADD COLUMN IF NOT EXISTS prenom TEXT,
    ADD COLUMN IF NOT EXISTS mode_paiement TEXT,
    ADD COLUMN IF NOT EXISTS preuve_paiement TEXT,
    ADD COLUMN IF NOT EXISTS type_donateur TEXT DEFAULT 'anonymous',
    ADD COLUMN IF NOT EXISTS date_don TIMESTAMPTZ DEFAULT NOW();

-- Vye fòm nan pa voye but_don/methode_paiement → retire NOT NULL
ALTER TABLE public.rasinayiti_donations
    ALTER COLUMN but_don DROP NOT NULL,
    ALTER COLUMN methode_paiement DROP NOT NULL;

-- Kòd la itilize 'verifie' ak 'refuse' — elaji CHECK la
ALTER TABLE public.rasinayiti_donations
    DROP CONSTRAINT IF EXISTS rasinayiti_donations_statut_check;
ALTER TABLE public.rasinayiti_donations
    ADD CONSTRAINT rasinayiti_donations_statut_check
    CHECK (statut IN ('en_attente','verifie','refuse','confirme','annule'));

-- ============================================================
-- 5. INSCRIPTIONS — kòd la voye 'statut_paiement' (ak 't')
--    plis kolòn etudiant_* ansyen schema a te genyen
-- ============================================================
ALTER TABLE public.rasinayiti_inscriptions
    ADD COLUMN IF NOT EXISTS statut_paiement VARCHAR(50) DEFAULT 'en_attente',
    ADD COLUMN IF NOT EXISTS etudiant_prenom VARCHAR(100),
    ADD COLUMN IF NOT EXISTS etudiant_nom VARCHAR(100),
    ADD COLUMN IF NOT EXISTS etudiant_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS etudiant_telephone VARCHAR(50);

-- ============================================================
-- 6. ETUDIANTS — tranche_age (pages/inscription.html)
-- ============================================================
ALTER TABLE public.rasinayiti_etudiants
    ADD COLUMN IF NOT EXISTS tranche_age VARCHAR(50);

-- ============================================================
-- 7. PARTICIPANTS — kolòn tracking email/konfimasyon admin.js
-- ============================================================
ALTER TABLE public.rasinayiti_participants
    ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS confirmed BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

-- ============================================================
-- 8. ADMINISTRATEURS — kolòn 'password' pou ansyen login la
--    (script.js + admin/parametres.html)
-- ============================================================
ALTER TABLE public.rasinayiti_administrateurs
    ADD COLUMN IF NOT EXISTS password TEXT;

-- ============================================================
-- 9. INSCRIPTIONS_EVENEMENTS — anpeche doub enskripsyon
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'unique_event_email'
        AND conrelid = 'public.rasinayiti_inscriptions_evenements'::regclass
    ) THEN
        ALTER TABLE public.rasinayiti_inscriptions_evenements
        ADD CONSTRAINT unique_event_email UNIQUE (event_id, email);
    END IF;
END $$;

-- ============================================================
-- VERIFYE — montre kolòn nouvo yo
-- ============================================================
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name LIKE 'rasinayiti_%'
  AND column_name IN (
    'start_date','end_date','images','duration',
    'prix','lien_live','image_url','couleur',
    'nom','prenom','mode_paiement','preuve_paiement','type_donateur','date_don',
    'statut_paiement','tranche_age',
    'email_sent','confirmed','password'
  )
ORDER BY table_name, column_name;
