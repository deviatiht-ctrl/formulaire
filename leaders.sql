-- ============================================================
-- CRÉATION DE LA TABLE LEADERS
-- ============================================================

CREATE TABLE IF NOT EXISTS leaders (
    id BIGSERIAL PRIMARY KEY,
    prenom TEXT NOT NULL,
    nom TEXT NOT NULL,
    poste TEXT NOT NULL,
    photo_url TEXT,
    bio TEXT,
    responsabilites TEXT,
    communites_responsables TEXT,
    linkedin TEXT,
    instagram TEXT,
    email TEXT,
    ordre_affichage INTEGER DEFAULT 0,
    est_actif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser le tri
CREATE INDEX IF NOT EXISTS idx_leaders_ordre ON leaders(ordre_affichage);

-- Activer la sécurité (RLS)
ALTER TABLE leaders ENABLE ROW LEVEL SECURITY;

-- Politiques de sécurité
-- 1. Lecture publique (pour tout le monde)
CREATE POLICY "Lecture publique pour tous" ON leaders
    FOR SELECT TO anon, authenticated
    USING (true);

-- 2. Accès complet pour les administrateurs connectés
CREATE POLICY "Accès complet pour admin" ON leaders
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- CONFIGURATION DU STORAGE (Optionnel si pas déjà fait)
-- ============================================================

-- Note: Assurez-vous que le bucket 'events' existe et est public.
-- Si vous voulez créer un bucket spécifique pour les leaders:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('leaders', 'leaders', true) ON CONFLICT DO NOTHING;
