-- ============================================================
--  CREATE LEADERS TABLE
--  Kreye: 2026
--  Deskripsyon: Table pour stocker les leaders de Rasin Ayiti
-- ============================================================

-- Create leaders table
CREATE TABLE IF NOT EXISTS public.leaders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prenom VARCHAR(100) NOT NULL,
    nom VARCHAR(100) NOT NULL,
    poste VARCHAR(200) NOT NULL,
    photo_url TEXT NOT NULL,
    description TEXT,
    responsabilites TEXT,
    communites_responsables TEXT,
    linkedin VARCHAR(500),
    instagram VARCHAR(500),
    email VARCHAR(255),
    telephone VARCHAR(50),
    est_actif BOOLEAN DEFAULT true,
    ordre_affichage INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_leaders_est_actif ON public.leaders(est_actif);
CREATE INDEX IF NOT EXISTS idx_leaders_ordre_affichage ON public.leaders(ordre_affichage);

-- Enable Row Level Security
ALTER TABLE public.leaders ENABLE ROW LEVEL SECURITY;

-- Policy for public to read active leaders
CREATE POLICY "Public read active leaders" ON public.leaders
    FOR SELECT TO anon, authenticated
    USING (est_actif = true);

-- Policy for admin to do everything
CREATE POLICY "Admin full access leaders" ON public.leaders
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_leaders_updated_at BEFORE UPDATE ON public.leaders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data (optional)
INSERT INTO public.leaders (prenom, nom, poste, photo_url, description, responsabilites, ordre_affichage) VALUES
('Jude', 'Joseph', 'Fondateur & Directeur Général', 'https://example.com/jude.jpg', 'Leader visionnaire avec plus de 10 ans d''expérience dans le développement juvénile.', 'Direction stratégique, gestion d''équipe, développement de partenariats.', 1),
('Henry', 'Berlinda', 'Directeur des Opérations', 'https://example.com/henry.jpg', 'Expert en gestion opérationnelle et coordination de projets.', 'Coordination des opérations, gestion des ressources, supervision des équipes.', 2)
ON CONFLICT DO NOTHING;
