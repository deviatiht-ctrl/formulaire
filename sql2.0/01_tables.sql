-- ============================================================
--  RASIN AYITI 2.0 — DEFINISYON TOUT TABLO (TABLES)
--  Tout tablo yo gen prefiks: rasinayiti_
-- ============================================================

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
    type_formation VARCHAR(50) DEFAULT 'presentiel', -- presentiel, en_ligne, hybride
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
    status VARCHAR(50) DEFAULT 'brouillon', -- brouillon, publie, en_cours, termine, annule
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
    type_seminaire VARCHAR(50) DEFAULT 'presentiel', -- presentiel, en_ligne
    code_acces VARCHAR(50),
    plateforme_live VARCHAR(50) DEFAULT 'facebook',
    url_live VARCHAR(500),
    status VARCHAR(50) DEFAULT 'planifie', -- planifie, en_cours, termine, annule
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
    status VARCHAR(50) DEFAULT 'actif', -- actif, inactif, suspendu
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
    type_paiement VARCHAR(50), -- complet, certificat_seulement, gratuit
    montant_paye DECIMAL(10,2) DEFAULT 0,
    montant_total DECIMAL(10,2) DEFAULT 0,
    status_paiement VARCHAR(50) DEFAULT 'en_attente', -- en_attente, verifie, refuse, rembourse
    preuve_paiement VARCHAR(500),
    transaction_id VARCHAR(100),
    methode_paiement VARCHAR(50), -- moncash, natcash, etc.
    status_inscription VARCHAR(50) DEFAULT 'en_attente', -- en_attente, confirme, annule, termine
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
    type_contenu VARCHAR(50) DEFAULT 'video', -- video, texte, quiz, document
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
    type_media VARCHAR(50) NOT NULL, -- image, video
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
    role VARCHAR(50) DEFAULT 'admin', -- super_admin, admin, formateur
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
    type_utilisateur VARCHAR(50), -- etudiant, admin
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
    but_don TEXT NOT NULL, -- 'general', 'rasin', 'evenement', 'activite'
    evenement_id UUID REFERENCES public.rasinayiti_events(id) ON DELETE SET NULL,
    activite_specifique TEXT,
    methode_paiement TEXT NOT NULL, -- 'moncash', 'natcash', 'manuel'
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
    taille TEXT NOT NULL, -- S, M, L, XL, XXL
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

-- 21. PARTICIPANTS (Modèl jeneral pou atelye / peman rapid)
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
    statut_paiement TEXT DEFAULT 'en_attente', -- en_attente, verifie, refuse
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
