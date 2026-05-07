-- ============================================================
--  NOUVO DATABASE: RASIN AYITI - LEKOL ANLEY
--  Kreye: 2026
--  Deskripsyon: Tout tablo pou sistèm lekòl anlèy la
-- ============================================================

-- Aktive RLS (Row Level Security)
ALTER DATABASE postgres SET "app.jwt_secret" TO 'votre-cle-jwt-tres-securisee-2026';

-- ============================================================
--  TABLO: KATEGORI FORMATION
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
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

-- ============================================================
--  TABLO: FORMATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS formations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    titre VARCHAR(255) NOT NULL,
    description TEXT,
    categorie_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    
    -- Detay formation
    duree VARCHAR(50),
    prix DECIMAL(10,2) DEFAULT 0,
    prix_certificat DECIMAL(10,2) DEFAULT 0,
    
    -- Tip formation
    type_formation VARCHAR(50) DEFAULT 'presentiel', -- presentiel, en_ligne, hybride
    avec_certificat BOOLEAN DEFAULT false,
    certificat_inclus BOOLEAN DEFAULT false,
    
    -- Dokiman ak ressources
    syllabus TEXT,
    prerequis TEXT,
    objectifs TEXT,
    
    -- Media
    image_principale VARCHAR(500),
    video_presentation VARCHAR(500),
    
    -- Dat
    date_debut DATE,
    date_fin DATE,
    heure_debut TIME,
    heure_fin TIME,
    
    -- Plas
    places_total INTEGER DEFAULT 50,
    places_disponibles INTEGER DEFAULT 50,
    
    -- Status
    status VARCHAR(50) DEFAULT 'brouillon', -- brouillon, publie, en_cours, termine, annule
    featured BOOLEAN DEFAULT false,
    
    -- Admin ki kreye li
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
--  TABLO: SEMINAIRES (Spesyalizasyon nan formations)
-- ============================================================
CREATE TABLE IF NOT EXISTS seminaires (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    formation_id UUID REFERENCES formations(id) ON DELETE CASCADE,
    code VARCHAR(20) UNIQUE NOT NULL,
    titre VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Dat seminaire
    date_seminaire DATE NOT NULL,
    heure_debut TIME,
    heure_fin TIME,
    
    -- Kote
    lieu VARCHAR(255),
    lien_visio VARCHAR(500),
    type_seminaire VARCHAR(50) DEFAULT 'presentiel', -- presentiel, en_ligne
    
    -- Paramet live (pou seminaire an liy)
    code_acces VARCHAR(20),
    plateforme_live VARCHAR(50) DEFAULT 'facebook',
    url_live VARCHAR(500),
    
    -- Status
    status VARCHAR(50) DEFAULT 'planifie', -- planifie, en_cours, termine, annule
    
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
--  TABLO: INSCRIPTIONS (Etudiants nan formations)
-- ============================================================
CREATE TABLE IF NOT EXISTS inscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Relasyon
    etudiant_id UUID REFERENCES etudiants(id) ON DELETE CASCADE,
    formation_id UUID REFERENCES formations(id) ON DELETE CASCADE,
    seminaire_id UUID REFERENCES seminaires(id) ON DELETE SET NULL,
    
    -- Detay pèman
    type_paiement VARCHAR(50), -- complet, certificat_seulement, gratuit
    montant_paye DECIMAL(10,2) DEFAULT 0,
    montant_total DECIMAL(10,2) DEFAULT 0,
    
    -- Status pèman
    status_paiement VARCHAR(50) DEFAULT 'en_attente', -- en_attente, verifie, refuse, rembourse
    
    -- Prèv pèman
    preuve_paiement VARCHAR(500),
    transaction_id VARCHAR(100),
    methode_paiement VARCHAR(50),
    
    -- Status enskripsyon
    status_inscription VARCHAR(50) DEFAULT 'en_attente', -- en_attente, confirme, annule, termine
    
    -- Dat enskripsyon
    date_inscription TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date_confirmation TIMESTAMP WITH TIME ZONE,
    
    -- Kòd aksè pou seminaire/formation
    code_acces VARCHAR(20),
    
    -- Not
    notes_admin TEXT,
    
    UNIQUE(etudiant_id, formation_id)
);

-- ============================================================
--  TABLO: PROGRESSION ETUDIANT (Suivi nan yon formation)
-- ============================================================
CREATE TABLE IF NOT EXISTS progressions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    etudiant_id UUID REFERENCES etudiants(id) ON DELETE CASCADE,
    formation_id UUID REFERENCES formations(id) ON DELETE CASCADE,
    
    -- Progresyon
    modules_total INTEGER DEFAULT 0,
    modules_completes INTEGER DEFAULT 0,
    pourcentage_completion INTEGER DEFAULT 0,
    
    -- Dat aktyalite
    derniere_activite TIMESTAMP WITH TIME ZONE,
    date_completion TIMESTAMP WITH TIME ZONE,
    
    -- Sètifika
    certificat_delivre BOOLEAN DEFAULT false,
    date_delivrance_certificat TIMESTAMP WITH TIME ZONE,
    numero_certificat VARCHAR(50),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(etudiant_id, formation_id)
);

-- ============================================================
--  TABLO: MODULES FORMATION
-- ============================================================
CREATE TABLE IF NOT EXISTS modules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    formation_id UUID REFERENCES formations(id) ON DELETE CASCADE,
    
    -- Kontni
    numero INTEGER NOT NULL,
    titre VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Tip kontni
    type_contenu VARCHAR(50) DEFAULT 'video', -- video, texte, quiz, document
    url_video VARCHAR(500),
    contenu_texte TEXT,
    url_document VARCHAR(500),
    
    -- Duree
    duree_minutes INTEGER,
    
    -- Ordre
    ordre INTEGER DEFAULT 0,
    
    -- Status
    publie BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
--  TABLO: COMPLETION MODULES (Ki etudiant fini ki module)
-- ============================================================
CREATE TABLE IF NOT EXISTS completions_modules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    etudiant_id UUID REFERENCES etudiants(id) ON DELETE CASCADE,
    module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
    formation_id UUID REFERENCES formations(id) ON DELETE CASCADE,
    
    date_completion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duree_regardee INTEGER, -- kantite segonn li gade
    
    UNIQUE(etudiant_id, module_id)
);

-- ============================================================
--  TABLO: GALERIE (Foto ak videyo formations ki fini)
-- ============================================================
CREATE TABLE IF NOT EXISTS galerie (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Relasyon
    formation_id UUID REFERENCES formations(id) ON DELETE CASCADE,
    seminaire_id UUID REFERENCES seminaires(id) ON DELETE CASCADE,
    
    -- Media
    type_media VARCHAR(50) NOT NULL, -- image, video
    titre VARCHAR(255),
    description TEXT,
    url_fichier VARCHAR(500) NOT NULL,
    thumbnail VARCHAR(500),
    
    -- Meta done
    date_capture DATE,
    featured BOOLEAN DEFAULT false,
    ordre INTEGER DEFAULT 0,
    
    -- Pibliye
    publie BOOLEAN DEFAULT true,
    
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
--  TABLO: NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Destinataire
    etudiant_id UUID REFERENCES etudiants(id) ON DELETE CASCADE,
    
    -- Kontni
    titre VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info', -- info, success, warning, formation, seminaire
    
    -- Lye
    lien VARCHAR(500),
    formation_id UUID,
    seminaire_id UUID,
    
    -- Status
    lu BOOLEAN DEFAULT false,
    date_lecture TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
--  TABLO: ADMINISTRATEURS
-- ============================================================
CREATE TABLE IF NOT EXISTS administrateurs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Enfòmasyon
    prenom VARCHAR(100) NOT NULL,
    nom VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telephone VARCHAR(20),
    
    -- Sekirite
    mot_de_passe_hash VARCHAR(255) NOT NULL,
    
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
--  TABLO: PARAMETRES SYSTEM
-- ============================================================
CREATE TABLE IF NOT EXISTS parametres (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cle VARCHAR(100) UNIQUE NOT NULL,
    valeur TEXT,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
--  TABLO: LOGS AKTIVITE
-- ============================================================
CREATE TABLE IF NOT EXISTS logs_activite (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Ki moun
    utilisateur_id UUID,
    type_utilisateur VARCHAR(50), -- etudiant, admin
    
    -- Action
    action VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Detay
    ip_adresse VARCHAR(50),
    user_agent TEXT,
    donnees JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
--  INDEX POU OPTIMIZASYON
-- ============================================================
CREATE INDEX idx_formations_status ON formations(status);
CREATE INDEX idx_formations_categorie ON formations(categorie_id);
CREATE INDEX idx_formations_featured ON formations(featured) WHERE featured = true;

CREATE INDEX idx_seminaires_date ON seminaires(date_seminaire);
CREATE INDEX idx_seminaires_status ON seminaires(status);
CREATE INDEX idx_seminaires_formation ON seminaires(formation_id);

CREATE INDEX idx_etudiants_email ON etudiants(email);
CREATE INDEX idx_etudiants_status ON etudiants(status);

CREATE INDEX idx_inscriptions_etudiant ON inscriptions(etudiant_id);
CREATE INDEX idx_inscriptions_formation ON inscriptions(formation_id);
CREATE INDEX idx_inscriptions_status ON inscriptions(status_inscription);

CREATE INDEX idx_notifications_etudiant ON notifications(etudiant_id);
CREATE INDEX idx_notifications_lu ON notifications(lu) WHERE lu = false;

CREATE INDEX idx_galerie_formation ON galerie(formation_id);
CREATE INDEX idx_galerie_type ON galerie(type_media);

-- ============================================================
--  FONKSIYON POU DAT AKTYALIZASYON
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
CREATE TRIGGER update_formations_updated_at BEFORE UPDATE ON formations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seminaires_updated_at BEFORE UPDATE ON seminaires
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_etudiants_updated_at BEFORE UPDATE ON etudiants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inscriptions_updated_at BEFORE UPDATE ON inscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_progressions_updated_at BEFORE UPDATE ON progressions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON modules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_galerie_updated_at BEFORE UPDATE ON galerie
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_administrateurs_updated_at BEFORE UPDATE ON administrateurs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
--  INSERT DONNEE DEFAULT
-- ============================================================

-- Kategori default
INSERT INTO categories (nom, description, icone, couleur) VALUES
('Développement Personnel', 'Formations pour développer vos compétences personnelles', 'fa-user-graduate', '#3b82f6'),
('Leadership', 'Devenez un leader efficace', 'fa-crown', '#f59e0b'),
('Compétences Professionnelles', 'Améliorez votre carrière', 'fa-briefcase', '#10b981'),
('Santé Mentale', 'Prenez soin de votre bien-être', 'fa-heart', '#ef4444'),
('Entrepreneuriat', 'Lancez votre entreprise', 'fa-rocket', '#8b5cf6')
ON CONFLICT DO NOTHING;

-- Parametres default
INSERT INTO parametres (cle, valeur, description) VALUES
('site_nom', 'Rasin Ayiti - École en Ligne', 'Nom du site'),
('site_description', 'Plateforme de formation et séminaires en ligne', 'Description du site'),
('contact_email', 'contact@rasinayiti.com', 'Email de contact'),
('contact_phone', '+509 0000 0000', 'Téléphone de contact'),
('montant_certificat', '2000', 'Montant pour certificat (en HTG)'),
('annee_academique', '2025-2026', 'Année académique en cours')
ON CONFLICT DO NOTHING;

-- Admin default (password: Admin2026!)
-- Note: Fok ou chanje sa apre premye koneksyon
INSERT INTO administrateurs (prenom, nom, email, mot_de_passe_hash, role) VALUES
('Super', 'Admin', 'admin@rasinayiti.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'super_admin')
ON CONFLICT DO NOTHING;

-- ============================================================
--  MESAJ SIKSE
-- ============================================================
SELECT 'DATABASE RASIN AYITI KREYE AVEC SUCCES!' AS message;  
