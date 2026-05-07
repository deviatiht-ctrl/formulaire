-- =================================================================
-- SETUP COMPLET EVENEMENTS - Rasin Ayiti
-- Kopi tout sa a nan Supabase > SQL Editor > Run
-- =================================================================

-- ---- 1. TABLE EVENTS ----------------------------------------
CREATE TABLE IF NOT EXISTS public.events (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    titre           TEXT NOT NULL,
    description     TEXT,
    type_evenement  TEXT DEFAULT 'in_person' CHECK (type_evenement IN ('in_person','online','hybrid')),
    date_evenement  TIMESTAMPTZ,
    lieu            TEXT,
    est_payant      BOOLEAN DEFAULT false,
    prix            NUMERIC(10,2) DEFAULT 0,
    devise          TEXT DEFAULT 'HTG',
    flyer_url       TEXT,
    flyer_public_id TEXT,
    sponsors        TEXT[] DEFAULT '{}',
    places_max      INTEGER DEFAULT NULL,
    whatsapp_link   TEXT,
    has_quiz        BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Ajoute kolòm si yo pa la (si table la deja egziste)
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS inscription_ouverte BOOLEAN DEFAULT true;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS places_max INTEGER DEFAULT NULL;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS devise TEXT DEFAULT 'HTG';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS whatsapp_link TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS has_quiz BOOLEAN DEFAULT false;

-- ---- 2. TABLE QUESTIONS QUIZ --------------------------------
CREATE TABLE IF NOT EXISTS public.event_questions (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    question_text   TEXT NOT NULL,
    option_a        TEXT NOT NULL,
    option_b        TEXT NOT NULL,
    option_c        TEXT NOT NULL,
    option_d        TEXT NOT NULL,
    correct_option  CHAR(1) NOT NULL CHECK (correct_option IN ('A','B','C','D')),
    points          INTEGER DEFAULT 2,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Mete kèk keksyon defo sou Ayiti
INSERT INTO public.event_questions (question_text, option_a, option_b, option_c, option_d, correct_option, points)
VALUES 
('En quelle année Haïti a-t-elle proclamé son indépendance ?', '1802', '1804', '1791', '1825', 'B', 2),
('Qui est le premier empereur d''Haïti ?', 'Toussaint Louverture', 'Henri Christophe', 'Jean-Jacques Dessalines', 'Alexandre Pétion', 'C', 2),
('Quelle est la capitale historique de la première république noire ?', 'Cap-Haïtien', 'Port-au-Prince', 'Gonaïves', 'Jacmel', 'C', 3)
ON CONFLICT DO NOTHING;

-- ---- 3. TABLE INSCRIPTIONS EVENEMENTS (UPDATED) -------------
CREATE TABLE IF NOT EXISTS public.inscriptions_evenements (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id        UUID REFERENCES public.events(id) ON DELETE CASCADE,
    nom             TEXT NOT NULL,
    prenom          TEXT NOT NULL,
    email           TEXT NOT NULL,
    telephone       TEXT,
    whatsapp        TEXT,
    ville           TEXT,
    message         TEXT,
    quiz_score      INTEGER DEFAULT 0,
    statut          TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_attente','confirme','annule')),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.inscriptions_evenements ADD COLUMN IF NOT EXISTS quiz_score INTEGER DEFAULT 0;
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id        UUID REFERENCES public.events(id) ON DELETE CASCADE,
    nom             TEXT NOT NULL,
    prenom          TEXT NOT NULL,
    email           TEXT NOT NULL,
    telephone       TEXT,
    whatsapp        TEXT,
    ville           TEXT,
    message         TEXT,
    statut          TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_attente','confirme','annule')),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index pou vitès
CREATE INDEX IF NOT EXISTS idx_inscriptions_evenements_event ON public.inscriptions_evenements(event_id);
CREATE INDEX IF NOT EXISTS idx_inscriptions_evenements_email ON public.inscriptions_evenements(email);

-- ---- 3. RLS POLICIES - TABLE EVENTS -------------------------
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Tout moun ka lire events ki afficher sur site
DROP POLICY IF EXISTS "Public read events" ON public.events;
CREATE POLICY "Public read events" ON public.events
    FOR SELECT TO anon, authenticated
    USING (afficher_sur_site = true AND status = 'actif');

-- Admin ka fè tout (select, insert, update, delete)
DROP POLICY IF EXISTS "Admin full access events" ON public.events;
CREATE POLICY "Admin full access events" ON public.events
    FOR ALL TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- ---- 4. RLS POLICIES - TABLE INSCRIPTIONS EVENEMENTS --------
ALTER TABLE public.inscriptions_evenements ENABLE ROW LEVEL SECURITY;

-- Tout moun ka enskri (INSERT)
DROP POLICY IF EXISTS "Public insert inscriptions evenements" ON public.inscriptions_evenements;
CREATE POLICY "Public insert inscriptions evenements" ON public.inscriptions_evenements
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

-- Admin ka lire tout
DROP POLICY IF EXISTS "Admin read inscriptions evenements" ON public.inscriptions_evenements;
CREATE POLICY "Admin read inscriptions evenements" ON public.inscriptions_evenements
    FOR SELECT TO anon, authenticated
    USING (true);

-- Admin ka update ak delete
DROP POLICY IF EXISTS "Admin update inscriptions evenements" ON public.inscriptions_evenements;
CREATE POLICY "Admin update inscriptions evenements" ON public.inscriptions_evenements
    FOR UPDATE TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Admin delete inscriptions evenements" ON public.inscriptions_evenements;
CREATE POLICY "Admin delete inscriptions evenements" ON public.inscriptions_evenements
    FOR DELETE TO anon, authenticated
    USING (true);

-- ---- 5. BUCKET STORAGE "events" ----------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'events',
    'events',
    true,
    10485760,   -- 10 MB max
    ARRAY['image/jpeg','image/png','image/jpg','image/webp','image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/jpg','image/webp','image/gif'];

-- Politique upload bucket events
DROP POLICY IF EXISTS "Allow upload events" ON storage.objects;
CREATE POLICY "Allow upload events" ON storage.objects
    FOR INSERT TO anon, authenticated
    WITH CHECK (bucket_id = 'events');

-- Politique lekti piblik bucket events
DROP POLICY IF EXISTS "Allow read events" ON storage.objects;
CREATE POLICY "Allow read events" ON storage.objects
    FOR SELECT TO anon, authenticated
    USING (bucket_id = 'events');

-- Politique update bucket events
DROP POLICY IF EXISTS "Allow update events" ON storage.objects;
CREATE POLICY "Allow update events" ON storage.objects
    FOR UPDATE TO anon, authenticated
    USING (bucket_id = 'events');

-- Politique delete bucket events
DROP POLICY IF EXISTS "Allow delete events" ON storage.objects;
CREATE POLICY "Allow delete events" ON storage.objects
    FOR DELETE TO anon, authenticated
    USING (bucket_id = 'events');

-- ---- 6. BUCKET STORAGE "galerie" (pou galerie.html) --------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'galerie',
    'galerie',
    true,
    20971520,   -- 20 MB max (pou video tou)
    ARRAY['image/jpeg','image/png','image/jpg','image/webp','video/mp4','video/webm']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 20971520;

DROP POLICY IF EXISTS "Allow all galerie" ON storage.objects;
CREATE POLICY "Allow all galerie" ON storage.objects
    FOR ALL TO anon, authenticated
    USING (bucket_id = 'galerie')
    WITH CHECK (bucket_id = 'galerie');

-- ---- 7. VERIFIKASYON -------------------------------------------
-- SELECT * FROM storage.buckets;
-- SELECT COUNT(*) FROM public.events;
-- SELECT COUNT(*) FROM public.inscriptions_evenements;
-- =================================================================
