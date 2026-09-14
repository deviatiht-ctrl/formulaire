-- =================================================================
--  RASIN AYITI 2.0 — MASTER SETUP KONPLÈ (ALL-IN-ONE)
--  Tout tablo, endèks, deklanchè, RLS, buckets ak done inisyal.
--  Tout gen prefiks: rasinayiti_
--  Kouri script sa a nan Supabase SQL Editor pou prepare tout baz la!
-- =================================================================

-- =================================================================
-- 1. TABLO YO (TABLES)
-- =================================================================

-- 1. KATEGORI FORMATIONS
CREATE TABLE IF NOT EXISTS public.rasinayiti_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    description TEXT,
    icone VARCHAR(50),
    couleur VARCHAR(20) DEFAULT '#2563eb',
    ordre INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. FORMATIONS
CREATE TABLE IF NOT EXISTS public.rasinayiti_formations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    titre VARCHAR(255) NOT NULL,
    description TEXT,
    categorie_id UUID REFERENCES public.rasinayiti_categories(id) ON DELETE SET NULL,
    duree VARCHAR(50),
    prix DECIMAL(10,2) DEFAULT 0,
    prix_certificat DECIMAL(10,2) DEFAULT 0,
    type_formation VARCHAR(50) DEFAULT 'presentiel',
    avec_certificat BOOLEAN DEFAULT false,
    certificat_inclus BOOLEAN DEFAULT false,
    syllabus TEXT,
    prerequis TEXT,
    objectifs TEXT,
    image_principale VARCHAR(500),
    video_presentation VARCHAR(500),
    date_debut DATE,
    date_fin DATE,
    heure_debut TIME,
    heure_fin TIME,
    places_total INTEGER DEFAULT 50,
    places_disponibles INTEGER DEFAULT 50,
    status VARCHAR(50) DEFAULT 'brouillon',
    featured BOOLEAN DEFAULT false,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. SEMINAIRES
CREATE TABLE IF NOT EXISTS public.rasinayiti_seminaires (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    formation_id UUID REFERENCES public.rasinayiti_formations(id) ON DELETE CASCADE,
    code VARCHAR(50) UNIQUE NOT NULL,
    titre VARCHAR(255) NOT NULL,
    description TEXT,
    date_seminaire DATE NOT NULL,
    heure_debut TIME,
    heure_fin TIME,
    lieu VARCHAR(255),
    lien_visio VARCHAR(500),
    type_seminaire VARCHAR(50) DEFAULT 'presentiel',
    code_acces VARCHAR(50),
    plateforme_live VARCHAR(50) DEFAULT 'facebook',
    url_live VARCHAR(500),
    status VARCHAR(50) DEFAULT 'planifie',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. ETUDIANTS
CREATE TABLE IF NOT EXISTS public.rasinayiti_etudiants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prenom VARCHAR(100) NOT NULL,
    nom VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telephone VARCHAR(50),
    whatsapp VARCHAR(50),
    date_naissance DATE,
    adresse TEXT,
    ville VARCHAR(100),
    pays VARCHAR(100) DEFAULT 'Haïti',
    mot_de_passe_hash VARCHAR(255),
    code_acces_temp VARCHAR(50),
    photo_profil VARCHAR(500),
    bio TEXT,
    niveau_etude VARCHAR(100),
    profession VARCHAR(100),
    status VARCHAR(50) DEFAULT 'actif',
    email_verifie BOOLEAN DEFAULT false,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. INSCRIPTIONS FORMATIONS
CREATE TABLE IF NOT EXISTS public.rasinayiti_inscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    etudiant_id UUID REFERENCES public.rasinayiti_etudiants(id) ON DELETE CASCADE,
    formation_id UUID REFERENCES public.rasinayiti_formations(id) ON DELETE CASCADE,
    seminaire_id UUID REFERENCES public.rasinayiti_seminaires(id) ON DELETE SET NULL,
    type_paiement VARCHAR(50),
    montant_paye DECIMAL(10,2) DEFAULT 0,
    montant_total DECIMAL(10,2) DEFAULT 0,
    status_paiement VARCHAR(50) DEFAULT 'en_attente',
    preuve_paiement VARCHAR(500),
    transaction_id VARCHAR(100),
    methode_paiement VARCHAR(50),
    status_inscription VARCHAR(50) DEFAULT 'en_attente',
    date_inscription TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date_confirmation TIMESTAMP WITH TIME ZONE,
    code_acces VARCHAR(50),
    notes_admin TEXT,
    UNIQUE(etudiant_id, formation_id)
);

-- 6. PROGRESSIONS
CREATE TABLE IF NOT EXISTS public.rasinayiti_progressions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    etudiant_id UUID REFERENCES public.rasinayiti_etudiants(id) ON DELETE CASCADE,
    formation_id UUID REFERENCES public.rasinayiti_formations(id) ON DELETE CASCADE,
    modules_total INTEGER DEFAULT 0,
    modules_completes INTEGER DEFAULT 0,
    pourcentage_completion INTEGER DEFAULT 0,
    derniere_activite TIMESTAMP WITH TIME ZONE,
    date_completion TIMESTAMP WITH TIME ZONE,
    certificat_delivre BOOLEAN DEFAULT false,
    date_delivrance_certificat TIMESTAMP WITH TIME ZONE,
    numero_certificat VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(etudiant_id, formation_id)
);

-- 7. MODULES
CREATE TABLE IF NOT EXISTS public.rasinayiti_modules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    formation_id UUID REFERENCES public.rasinayiti_formations(id) ON DELETE CASCADE,
    numero INTEGER NOT NULL,
    titre VARCHAR(255) NOT NULL,
    description TEXT,
    type_contenu VARCHAR(50) DEFAULT 'video',
    url_video VARCHAR(500),
    contenu_texte TEXT,
    url_document VARCHAR(500),
    duree_minutes INTEGER,
    ordre INTEGER DEFAULT 0,
    publie BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. COMPLETIONS MODULES
CREATE TABLE IF NOT EXISTS public.rasinayiti_completions_modules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    etudiant_id UUID REFERENCES public.rasinayiti_etudiants(id) ON DELETE CASCADE,
    module_id UUID REFERENCES public.rasinayiti_modules(id) ON DELETE CASCADE,
    formation_id UUID REFERENCES public.rasinayiti_formations(id) ON DELETE CASCADE,
    date_completion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duree_regardee INTEGER,
    UNIQUE(etudiant_id, module_id)
);

-- 9. GALERIE
CREATE TABLE IF NOT EXISTS public.rasinayiti_galerie (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    formation_id UUID REFERENCES public.rasinayiti_formations(id) ON DELETE CASCADE,
    seminaire_id UUID REFERENCES public.rasinayiti_seminaires(id) ON DELETE CASCADE,
    type_media VARCHAR(50) NOT NULL,
    titre VARCHAR(255),
    description TEXT,
    url_fichier VARCHAR(500) NOT NULL,
    thumbnail VARCHAR(500),
    date_capture DATE,
    featured BOOLEAN DEFAULT false,
    ordre INTEGER DEFAULT 0,
    publie BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.rasinayiti_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    etudiant_id UUID REFERENCES public.rasinayiti_etudiants(id) ON DELETE CASCADE,
    titre VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    lien VARCHAR(500),
    formation_id UUID,
    seminaire_id UUID,
    lu BOOLEAN DEFAULT false,
    date_lecture TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. ADMINISTRATEURS
CREATE TABLE IF NOT EXISTS public.rasinayiti_administrateurs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prenom VARCHAR(100) NOT NULL,
    nom VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telephone VARCHAR(50),
    mot_de_passe_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    permissions JSONB DEFAULT '[]',
    actif BOOLEAN DEFAULT true,
    dernier_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. PARAMETRES SYSTEM
CREATE TABLE IF NOT EXISTS public.rasinayiti_parametres (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cle VARCHAR(100) UNIQUE NOT NULL,
    valeur TEXT,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. LOGS AKTIVITE
CREATE TABLE IF NOT EXISTS public.rasinayiti_logs_activite (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    utilisateur_id UUID,
    type_utilisateur VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    description TEXT,
    ip_adresse VARCHAR(50),
    user_agent TEXT,
    donnees JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. EVENEMENTS (EVENTS)
CREATE TABLE IF NOT EXISTS public.rasinayiti_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    titre TEXT NOT NULL,
    description TEXT,
    type_evenement TEXT DEFAULT 'in_person' CHECK (type_evenement IN ('in_person','online','hybrid')),
    date_evenement TIMESTAMPTZ,
    lieu TEXT,
    est_payant BOOLEAN DEFAULT false,
    prix NUMERIC(10,2) DEFAULT 0,
    devise TEXT DEFAULT 'HTG',
    flyer_url TEXT,
    flyer_public_id TEXT,
    flyers_urls TEXT[] DEFAULT '{}',
    sponsors TEXT[] DEFAULT '{}',
    places_max INTEGER DEFAULT NULL,
    whatsapp_link TEXT,
    has_quiz BOOLEAN DEFAULT false,
    afficher_sur_site BOOLEAN DEFAULT true,
    inscription_ouverte BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'actif' CHECK (status IN ('actif','termine','annule','archive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. QUESTIONS QUIZ EVENEMENTS
CREATE TABLE IF NOT EXISTS public.rasinayiti_event_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES public.rasinayiti_events(id) ON DELETE SET NULL,
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_option CHAR(1) NOT NULL CHECK (correct_option IN ('A','B','C','D')),
    points INTEGER DEFAULT 2,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. INSCRIPTIONS EVENEMENTS
CREATE TABLE IF NOT EXISTS public.rasinayiti_inscriptions_evenements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES public.rasinayiti_events(id) ON DELETE CASCADE,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    email TEXT NOT NULL,
    telephone TEXT,
    whatsapp TEXT,
    ville TEXT,
    message TEXT,
    quiz_score INTEGER DEFAULT 0,
    quiz_reponses JSONB DEFAULT '{}',
    statut TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_attente','confirme','annule')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. DONATIONS
CREATE TABLE IF NOT EXISTS public.rasinayiti_donations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nom_donateur TEXT,
    association_nom TEXT,
    est_anonyme BOOLEAN DEFAULT false,
    montant NUMERIC(10,2) NOT NULL,
    devise VARCHAR(10) DEFAULT 'HTG',
    but_don TEXT NOT NULL,
    evenement_id UUID REFERENCES public.rasinayiti_events(id) ON DELETE SET NULL,
    activite_specifique TEXT,
    methode_paiement TEXT NOT NULL,
    preuve_paiement_url TEXT,
    email TEXT,
    telephone TEXT,
    statut TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_attente','confirme','annule')),
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. PRODUITS BOUTIQUE MAILLOTS
CREATE TABLE IF NOT EXISTS public.rasinayiti_maillots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nom TEXT NOT NULL,
    description TEXT,
    prix NUMERIC(10,2) NOT NULL,
    devise TEXT DEFAULT 'HTG',
    image_url_1 TEXT,
    image_url_2 TEXT,
    image_url_3 TEXT,
    est_disponible BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. KOMAND BOUTIQUE MAILLOTS
CREATE TABLE IF NOT EXISTS public.rasinayiti_maillot_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    maillot_id UUID REFERENCES public.rasinayiti_maillots(id) ON DELETE SET NULL,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    email TEXT NOT NULL,
    telephone TEXT,
    quantite INTEGER DEFAULT 1,
    taille TEXT NOT NULL,
    montant_total NUMERIC(10,2),
    preuve_paiement_url TEXT,
    statut TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_attente','confirme','livre','annule')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. LEADERS V2
CREATE TABLE IF NOT EXISTS public.rasinayiti_leaders_v2 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    flyer_url TEXT NOT NULL,
    commune VARCHAR(200) NOT NULL,
    est_actif BOOLEAN DEFAULT true,
    ordre_affichage INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 21. PARTICIPANTS
CREATE TABLE IF NOT EXISTS public.rasinayiti_participants (
    id BIGSERIAL PRIMARY KEY,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    telephone TEXT,
    whatsapp TEXT,
    tranche_age TEXT,
    ville TEXT,
    date_inscription TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    qr_code TEXT,
    access_code TEXT UNIQUE,
    code_genere_at TIMESTAMP WITH TIME ZONE,
    certificat_telecharge BOOLEAN DEFAULT FALSE,
    frais INTEGER DEFAULT 500,
    statut_paiement TEXT DEFAULT 'en_attente',
    preuve_paiement TEXT,
    mode_paiement TEXT,
    date_paiement TIMESTAMP WITH TIME ZONE,
    email_envoye BOOLEAN DEFAULT FALSE,
    date_email TIMESTAMP WITH TIME ZONE
);

-- 22. ZOOM CONFIG
CREATE TABLE IF NOT EXISTS public.rasinayiti_zoom_config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    meeting_id TEXT,
    password TEXT,
    link TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT rasinayiti_single_row CHECK (id = 1)
);

-- 23. LIVE STREAM VIEWERS
CREATE TABLE IF NOT EXISTS public.rasinayiti_live_viewers (
    id SERIAL PRIMARY KEY,
    participant_id BIGINT REFERENCES public.rasinayiti_participants(id) ON DELETE SET NULL,
    prenom VARCHAR(100),
    nom VARCHAR(100),
    email VARCHAR(255),
    platform VARCHAR(50) DEFAULT 'zoom',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(participant_id)
);

-- 24. LIVE STREAM REACTIONS
CREATE TABLE IF NOT EXISTS public.rasinayiti_live_reactions (
    id SERIAL PRIMARY KEY,
    participant_id BIGINT REFERENCES public.rasinayiti_participants(id) ON DELETE SET NULL,
    prenom VARCHAR(100),
    nom VARCHAR(100),
    emoji VARCHAR(10) NOT NULL,
    platform VARCHAR(50) DEFAULT 'zoom',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- 2. ENDÈKS POU VITÈS (INDEXES)
-- =================================================================
CREATE INDEX IF NOT EXISTS idx_rasinayiti_formations_status ON public.rasinayiti_formations(status);
CREATE INDEX IF NOT EXISTS idx_rasinayiti_formations_cat ON public.rasinayiti_formations(categorie_id);
CREATE INDEX IF NOT EXISTS idx_rasinayiti_formations_feat ON public.rasinayiti_formations(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_rasinayiti_seminaires_date ON public.rasinayiti_seminaires(date_seminaire);
CREATE INDEX IF NOT EXISTS idx_rasinayiti_seminaires_form ON public.rasinayiti_seminaires(formation_id);
CREATE INDEX IF NOT EXISTS idx_rasinayiti_seminaires_status ON public.rasinayiti_seminaires(status);

CREATE INDEX IF NOT EXISTS idx_rasinayiti_etudiants_email ON public.rasinayiti_etudiants(email);
CREATE INDEX IF NOT EXISTS idx_rasinayiti_etudiants_status ON public.rasinayiti_etudiants(status);
CREATE INDEX IF NOT EXISTS idx_rasinayiti_inscriptions_etud ON public.rasinayiti_inscriptions(etudiant_id);
CREATE INDEX IF NOT EXISTS idx_rasinayiti_inscriptions_form ON public.rasinayiti_inscriptions(formation_id);
CREATE INDEX IF NOT EXISTS idx_rasinayiti_inscriptions_stat ON public.rasinayiti_inscriptions(status_inscription);
CREATE INDEX IF NOT EXISTS idx_rasinayiti_inscriptions_pay ON public.rasinayiti_inscriptions(status_paiement);

CREATE INDEX IF NOT EXISTS idx_rasinayiti_events_date ON public.rasinayiti_events(date_evenement);
CREATE INDEX IF NOT EXISTS idx_rasinayiti_events_status ON public.rasinayiti_events(status);
CREATE INDEX IF NOT EXISTS idx_rasinayiti_insc_events_ev ON public.rasinayiti_inscriptions_evenements(event_id);
CREATE INDEX IF NOT EXISTS idx_rasinayiti_insc_events_email ON public.rasinayiti_inscriptions_evenements(email);
CREATE INDEX IF NOT EXISTS idx_rasinayiti_event_q_active ON public.rasinayiti_event_questions(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_rasinayiti_donations_stat ON public.rasinayiti_donations(statut);
CREATE INDEX IF NOT EXISTS idx_rasinayiti_donations_date ON public.rasinayiti_donations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rasinayiti_donations_method ON public.rasinayiti_donations(methode_paiement);

CREATE INDEX IF NOT EXISTS idx_rasinayiti_maillots_dispo ON public.rasinayiti_maillots(est_disponible) WHERE est_disponible = true;
CREATE INDEX IF NOT EXISTS idx_rasinayiti_m_orders_stat ON public.rasinayiti_maillot_orders(statut);
CREATE INDEX IF NOT EXISTS idx_rasinayiti_m_orders_email ON public.rasinayiti_maillot_orders(email);

CREATE INDEX IF NOT EXISTS idx_rasinayiti_leaders_commune ON public.rasinayiti_leaders_v2(commune);
CREATE INDEX IF NOT EXISTS idx_rasinayiti_leaders_actif ON public.rasinayiti_leaders_v2(est_actif) WHERE est_actif = true;

CREATE INDEX IF NOT EXISTS idx_rasinayiti_part_email ON public.rasinayiti_participants(email);
CREATE INDEX IF NOT EXISTS idx_rasinayiti_part_statut ON public.rasinayiti_participants(statut_paiement);
CREATE INDEX IF NOT EXISTS idx_rasinayiti_part_code ON public.rasinayiti_participants(access_code) WHERE access_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rasinayiti_live_v_active ON public.rasinayiti_live_viewers(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_rasinayiti_live_v_seen ON public.rasinayiti_live_viewers(last_seen);
CREATE INDEX IF NOT EXISTS idx_rasinayiti_live_r_date ON public.rasinayiti_live_reactions(created_at);

-- =================================================================
-- 3. FONKSYON & DEKLANCHÈ (FUNCTIONS & TRIGGERS)
-- =================================================================
CREATE OR REPLACE FUNCTION public.rasinayiti_update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rasinayiti_categories_updated_at ON public.rasinayiti_categories;
CREATE TRIGGER trg_rasinayiti_categories_updated_at BEFORE UPDATE ON public.rasinayiti_categories
    FOR EACH ROW EXECUTE FUNCTION public.rasinayiti_update_updated_at_column();

DROP TRIGGER IF EXISTS trg_rasinayiti_formations_updated_at ON public.rasinayiti_formations;
CREATE TRIGGER trg_rasinayiti_formations_updated_at BEFORE UPDATE ON public.rasinayiti_formations
    FOR EACH ROW EXECUTE FUNCTION public.rasinayiti_update_updated_at_column();

DROP TRIGGER IF EXISTS trg_rasinayiti_seminaires_updated_at ON public.rasinayiti_seminaires;
CREATE TRIGGER trg_rasinayiti_seminaires_updated_at BEFORE UPDATE ON public.rasinayiti_seminaires
    FOR EACH ROW EXECUTE FUNCTION public.rasinayiti_update_updated_at_column();

DROP TRIGGER IF EXISTS trg_rasinayiti_etudiants_updated_at ON public.rasinayiti_etudiants;
CREATE TRIGGER trg_rasinayiti_etudiants_updated_at BEFORE UPDATE ON public.rasinayiti_etudiants
    FOR EACH ROW EXECUTE FUNCTION public.rasinayiti_update_updated_at_column();

DROP TRIGGER IF EXISTS trg_rasinayiti_progressions_updated_at ON public.rasinayiti_progressions;
CREATE TRIGGER trg_rasinayiti_progressions_updated_at BEFORE UPDATE ON public.rasinayiti_progressions
    FOR EACH ROW EXECUTE FUNCTION public.rasinayiti_update_updated_at_column();

DROP TRIGGER IF EXISTS trg_rasinayiti_modules_updated_at ON public.rasinayiti_modules;
CREATE TRIGGER trg_rasinayiti_modules_updated_at BEFORE UPDATE ON public.rasinayiti_modules
    FOR EACH ROW EXECUTE FUNCTION public.rasinayiti_update_updated_at_column();

DROP TRIGGER IF EXISTS trg_rasinayiti_galerie_updated_at ON public.rasinayiti_galerie;
CREATE TRIGGER trg_rasinayiti_galerie_updated_at BEFORE UPDATE ON public.rasinayiti_galerie
    FOR EACH ROW EXECUTE FUNCTION public.rasinayiti_update_updated_at_column();

DROP TRIGGER IF EXISTS trg_rasinayiti_administrateurs_updated_at ON public.rasinayiti_administrateurs;
CREATE TRIGGER trg_rasinayiti_administrateurs_updated_at BEFORE UPDATE ON public.rasinayiti_administrateurs
    FOR EACH ROW EXECUTE FUNCTION public.rasinayiti_update_updated_at_column();

DROP TRIGGER IF EXISTS trg_rasinayiti_parametres_updated_at ON public.rasinayiti_parametres;
CREATE TRIGGER trg_rasinayiti_parametres_updated_at BEFORE UPDATE ON public.rasinayiti_parametres
    FOR EACH ROW EXECUTE FUNCTION public.rasinayiti_update_updated_at_column();

DROP TRIGGER IF EXISTS trg_rasinayiti_events_updated_at ON public.rasinayiti_events;
CREATE TRIGGER trg_rasinayiti_events_updated_at BEFORE UPDATE ON public.rasinayiti_events
    FOR EACH ROW EXECUTE FUNCTION public.rasinayiti_update_updated_at_column();

DROP TRIGGER IF EXISTS trg_rasinayiti_donations_updated_at ON public.rasinayiti_donations;
CREATE TRIGGER trg_rasinayiti_donations_updated_at BEFORE UPDATE ON public.rasinayiti_donations
    FOR EACH ROW EXECUTE FUNCTION public.rasinayiti_update_updated_at_column();

DROP TRIGGER IF EXISTS trg_rasinayiti_maillots_updated_at ON public.rasinayiti_maillots;
CREATE TRIGGER trg_rasinayiti_maillots_updated_at BEFORE UPDATE ON public.rasinayiti_maillots
    FOR EACH ROW EXECUTE FUNCTION public.rasinayiti_update_updated_at_column();

DROP TRIGGER IF EXISTS trg_rasinayiti_maillot_orders_updated_at ON public.rasinayiti_maillot_orders;
CREATE TRIGGER trg_rasinayiti_maillot_orders_updated_at BEFORE UPDATE ON public.rasinayiti_maillot_orders
    FOR EACH ROW EXECUTE FUNCTION public.rasinayiti_update_updated_at_column();

DROP TRIGGER IF EXISTS trg_rasinayiti_leaders_updated_at ON public.rasinayiti_leaders_v2;
CREATE TRIGGER trg_rasinayiti_leaders_updated_at BEFORE UPDATE ON public.rasinayiti_leaders_v2
    FOR EACH ROW EXECUTE FUNCTION public.rasinayiti_update_updated_at_column();

CREATE OR REPLACE FUNCTION public.rasinayiti_get_active_viewers_count()
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*) FROM public.rasinayiti_live_viewers 
        WHERE is_active = true 
        AND last_seen > NOW() - INTERVAL '2 minutes'
    );
END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- 4. RÈGLEMAN SEKIRITE (ROW LEVEL SECURITY - RLS)
-- =================================================================
ALTER TABLE public.rasinayiti_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_formations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_seminaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_etudiants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_inscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_progressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_completions_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_galerie ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_administrateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_parametres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_logs_activite ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_event_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_inscriptions_evenements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_maillots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_maillot_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_leaders_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_zoom_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_live_viewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_live_reactions ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
DROP POLICY IF EXISTS "rasinayiti_cat_all" ON public.rasinayiti_categories;
CREATE POLICY "rasinayiti_cat_all" ON public.rasinayiti_categories FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "rasinayiti_form_all" ON public.rasinayiti_formations;
CREATE POLICY "rasinayiti_form_all" ON public.rasinayiti_formations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "rasinayiti_sem_all" ON public.rasinayiti_seminaires;
CREATE POLICY "rasinayiti_sem_all" ON public.rasinayiti_seminaires FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "rasinayiti_etud_all" ON public.rasinayiti_etudiants;
CREATE POLICY "rasinayiti_etud_all" ON public.rasinayiti_etudiants FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "rasinayiti_insc_all" ON public.rasinayiti_inscriptions;
CREATE POLICY "rasinayiti_insc_all" ON public.rasinayiti_inscriptions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "rasinayiti_prog_all" ON public.rasinayiti_progressions;
CREATE POLICY "rasinayiti_prog_all" ON public.rasinayiti_progressions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "rasinayiti_mod_all" ON public.rasinayiti_modules;
CREATE POLICY "rasinayiti_mod_all" ON public.rasinayiti_modules FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "rasinayiti_comp_all" ON public.rasinayiti_completions_modules;
CREATE POLICY "rasinayiti_comp_all" ON public.rasinayiti_completions_modules FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "rasinayiti_gal_all" ON public.rasinayiti_galerie;
CREATE POLICY "rasinayiti_gal_all" ON public.rasinayiti_galerie FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "rasinayiti_notif_all" ON public.rasinayiti_notifications;
CREATE POLICY "rasinayiti_notif_all" ON public.rasinayiti_notifications FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "rasinayiti_admin_all" ON public.rasinayiti_administrateurs;
CREATE POLICY "rasinayiti_admin_all" ON public.rasinayiti_administrateurs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "rasinayiti_param_all" ON public.rasinayiti_parametres;
CREATE POLICY "rasinayiti_param_all" ON public.rasinayiti_parametres FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "rasinayiti_logs_all" ON public.rasinayiti_logs_activite;
CREATE POLICY "rasinayiti_logs_all" ON public.rasinayiti_logs_activite FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "rasinayiti_events_all" ON public.rasinayiti_events;
CREATE POLICY "rasinayiti_events_all" ON public.rasinayiti_events FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "rasinayiti_event_q_all" ON public.rasinayiti_event_questions;
CREATE POLICY "rasinayiti_event_q_all" ON public.rasinayiti_event_questions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "rasinayiti_insc_ev_all" ON public.rasinayiti_inscriptions_evenements;
CREATE POLICY "rasinayiti_insc_ev_all" ON public.rasinayiti_inscriptions_evenements FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "rasinayiti_don_all" ON public.rasinayiti_donations;
CREATE POLICY "rasinayiti_don_all" ON public.rasinayiti_donations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "rasinayiti_mail_all" ON public.rasinayiti_maillots;
CREATE POLICY "rasinayiti_mail_all" ON public.rasinayiti_maillots FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "rasinayiti_mail_orders_all" ON public.rasinayiti_maillot_orders;
CREATE POLICY "rasinayiti_mail_orders_all" ON public.rasinayiti_maillot_orders FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "rasinayiti_leaders_all" ON public.rasinayiti_leaders_v2;
CREATE POLICY "rasinayiti_leaders_all" ON public.rasinayiti_leaders_v2 FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "rasinayiti_part_all" ON public.rasinayiti_participants;
CREATE POLICY "rasinayiti_part_all" ON public.rasinayiti_participants FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "rasinayiti_zoom_all" ON public.rasinayiti_zoom_config;
CREATE POLICY "rasinayiti_zoom_all" ON public.rasinayiti_zoom_config FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "rasinayiti_live_v_all" ON public.rasinayiti_live_viewers;
CREATE POLICY "rasinayiti_live_v_all" ON public.rasinayiti_live_viewers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "rasinayiti_live_r_all" ON public.rasinayiti_live_reactions;
CREATE POLICY "rasinayiti_live_r_all" ON public.rasinayiti_live_reactions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- =================================================================
-- 5. STORAGE BUCKETS & POLITIQUES
-- =================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
('rasinayiti_paiements', 'rasinayiti_paiements', true, 10485760, ARRAY['image/jpeg','image/png','image/webp','application/pdf']),
('rasinayiti_events', 'rasinayiti_events', true, 20971520, ARRAY['image/jpeg','image/png','image/webp','image/gif']),
('rasinayiti_maillots', 'rasinayiti_maillots', true, 15728640, ARRAY['image/jpeg','image/png','image/webp']),
('rasinayiti_leaders', 'rasinayiti_leaders', true, 20971520, ARRAY['image/jpeg','image/png','image/webp','image/gif']),
('rasinayiti_galerie', 'rasinayiti_galerie', true, 52428800, ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4'])
ON CONFLICT (id) DO UPDATE SET 
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "rasinayiti_storage_public_read" ON storage.objects;
CREATE POLICY "rasinayiti_storage_public_read" ON storage.objects
    FOR SELECT TO anon, authenticated
    USING (bucket_id IN ('rasinayiti_paiements','rasinayiti_events','rasinayiti_maillots','rasinayiti_leaders','rasinayiti_galerie'));

DROP POLICY IF EXISTS "rasinayiti_storage_insert" ON storage.objects;
CREATE POLICY "rasinayiti_storage_insert" ON storage.objects
    FOR INSERT TO anon, authenticated
    WITH CHECK (bucket_id IN ('rasinayiti_paiements','rasinayiti_events','rasinayiti_maillots','rasinayiti_leaders','rasinayiti_galerie'));

DROP POLICY IF EXISTS "rasinayiti_storage_update" ON storage.objects;
CREATE POLICY "rasinayiti_storage_update" ON storage.objects
    FOR UPDATE TO anon, authenticated
    USING (bucket_id IN ('rasinayiti_paiements','rasinayiti_events','rasinayiti_maillots','rasinayiti_leaders','rasinayiti_galerie'));

DROP POLICY IF EXISTS "rasinayiti_storage_delete" ON storage.objects;
CREATE POLICY "rasinayiti_storage_delete" ON storage.objects
    FOR DELETE TO anon, authenticated
    USING (bucket_id IN ('rasinayiti_paiements','rasinayiti_events','rasinayiti_maillots','rasinayiti_leaders','rasinayiti_galerie'));

-- =================================================================
-- 6. DONE INITIAL (SEED DATA)
-- =================================================================
INSERT INTO public.rasinayiti_categories (nom, description, icone, couleur, ordre, active)
VALUES 
('Développement Personnel', 'Formations pou devlope potansyèl ak lidèchip pèsonèl ou', 'fa-user-graduate', '#2563eb', 1, true),
('Leadership & Angajman', 'Fòmasyon pou vin lidè efikas nan kominote w ak peyi w', 'fa-crown', '#f59e0b', 2, true),
('Konpetans Pwofesyonèl', 'Amelyore karyè w ak zouti modèn', 'fa-briefcase', '#10b981', 3, true),
('Sante Mantal & Byennèt', 'Pran swen tèt ou ak byennèt sikolojik ou', 'fa-heart', '#ef4444', 4, true),
('Antreprenarya & Biznis', 'Lanse biznis ou ak jere pwojè w', 'fa-rocket', '#8b5cf6', 5, true)
ON CONFLICT DO NOTHING;

INSERT INTO public.rasinayiti_parametres (cle, valeur, description)
VALUES
('site_nom', 'Rasin Ayiti - Mobilisation pour le Développement Juvénile', 'Nom officiel du site'),
('site_description', 'Plateforme de formation, événements et développement pour la jeunesse haïtienne', 'Description du site'),
('contact_email', 'contact@rasinayiti.com', 'Email officiel de contact'),
('contact_phone', '+509 47 11 1111', 'Téléphone officiel de contact'),
('moncash_number', '+509 47 11 1111', 'Numéro Moncash officiel'),
('natcash_number', '+509 38 22 2222', 'Numéro Natcash officiel'),
('annee_academique', '2025-2026', 'Année académique en cours')
ON CONFLICT (cle) DO UPDATE SET valeur = EXCLUDED.valeur;

INSERT INTO public.rasinayiti_administrateurs (prenom, nom, email, mot_de_passe_hash, role, actif)
VALUES
('Super', 'Admin', 'admin@rasinayiti.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'super_admin', true)
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.rasinayiti_maillots (nom, description, prix, devise, image_url_1, est_disponible)
VALUES 
('Maillot Officiel Rasin Ayiti', 'Département de Développement Juvénile - Édition Spéciale 2026', 1500, 'HTG', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1000&auto=format&fit=crop', true)
ON CONFLICT DO NOTHING;

INSERT INTO public.rasinayiti_zoom_config (id, meeting_id, password, link)
VALUES (1, '', '', '')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.rasinayiti_event_questions (question_text, option_a, option_b, option_c, option_d, correct_option, points, is_active)
VALUES 
('Ki koulè drapo ayisyen an genyen?', 'Vèt ak jòn', 'Ble ak wouj', 'Nwa ak blan', 'Wouj ak jòn', 'B', 2, true),
('Ki dat Ayiti selebre fèt drapo li?', '1 janvye', '17 oktòb', '18 me', '25 desanm', 'C', 2, true),
('Ki vil ki asosye ak kreyasyon drapo ayisyen an?', 'Jakmèl', 'Okay', 'Pòtoprens', 'Aks (Arcahaie)', 'D', 2, true),
('Kiyès ki te koud premye drapo ayisyen an?', 'Toussaint Louverture', 'Catherine Flon', 'Alexandre Pétion', 'Henri Christophe', 'B', 2, true),
('Ki koulè Dessalines te retire nan drapo franse a?', 'Ble', 'Wouj', 'Blan', 'Vèt', 'C', 2, true),
('Kisa drapo ayisyen an reprezante?', 'Divizyon', 'Inyon ak libète', 'Lagè sèlman', 'Richès peyi a', 'B', 2, true),
('Ki deviz ki sou drapo ayisyen an?', 'L''Union Fait La Force', 'Libète oswa lanmò', 'Ayiti pap peri', 'Viv ansanm', 'A', 2, true),
('Ki ewo yo rele "Papa drapo ayisyen an"?', 'Capois-La-Mort', 'Henri Christophe', 'Jean-Jacques Dessalines', 'Charlemagne Péralte', 'C', 2, true),
('Ki koulè ki anwo sou drapo ayisyen an?', 'Wouj', 'Ble', 'Blan', 'Vèt', 'B', 2, true),
('Poukisa 18 me enpòtan pou Ayiti?', 'Se jou endepandans', 'Se jou eleksyon', 'Se fèt drapo ak inyon pèp ayisyen', 'Se fèt travay', 'C', 2, true)
ON CONFLICT DO NOTHING;

-- Mesaj siksè
SELECT '✅ TOUT TABLO AK KONFIGIRASYON RASIN AYITI 2.0 ENSTALE AVÈK SIKSÈ!' AS rezilta;
