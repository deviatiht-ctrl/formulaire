-- ============================================================
--  MIGRATE LEADERS TABLE v2
--  Nouvo lojik: Admin jis upload yon flyer + chwazi commune
-- ============================================================

-- Drop old table if you want a clean start (OPTIONAL — uncomment if needed)
-- DROP TABLE IF EXISTS public.leaders;

-- Create new simplified leaders table
CREATE TABLE IF NOT EXISTS public.leaders_v2 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    flyer_url TEXT NOT NULL,
    commune VARCHAR(200) NOT NULL,
    est_actif BOOLEAN DEFAULT true,
    ordre_affichage INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- If you prefer to ALTER the existing table instead of creating a new one,
-- run these commands instead (after backing up data):
--
-- ALTER TABLE public.leaders ADD COLUMN IF NOT EXISTS flyer_url TEXT;
-- ALTER TABLE public.leaders ADD COLUMN IF NOT EXISTS commune VARCHAR(200);
-- ALTER TABLE public.leaders DROP COLUMN IF EXISTS prenom;
-- ALTER TABLE public.leaders DROP COLUMN IF EXISTS nom;
-- ALTER TABLE public.leaders DROP COLUMN IF EXISTS poste;
-- ALTER TABLE public.leaders DROP COLUMN IF EXISTS photo_url;
-- ALTER TABLE public.leaders DROP COLUMN IF EXISTS description;
-- ALTER TABLE public.leaders DROP COLUMN IF EXISTS bio;
-- ALTER TABLE public.leaders DROP COLUMN IF EXISTS responsabilites;
-- ALTER TABLE public.leaders DROP COLUMN IF EXISTS communites_responsables;
-- ALTER TABLE public.leaders DROP COLUMN IF EXISTS linkedin;
-- ALTER TABLE public.leaders DROP COLUMN IF EXISTS instagram;
-- ALTER TABLE public.leaders DROP COLUMN IF EXISTS email;
-- ALTER TABLE public.leaders DROP COLUMN IF EXISTS telephone;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_leaders_v2_commune ON public.leaders_v2(commune);
CREATE INDEX IF NOT EXISTS idx_leaders_v2_est_actif ON public.leaders_v2(est_actif);

-- Enable RLS
ALTER TABLE public.leaders_v2 ENABLE ROW LEVEL SECURITY;

-- Public can read active leaders
CREATE POLICY "Public read active leaders v2" ON public.leaders_v2
    FOR SELECT TO anon, authenticated
    USING (est_actif = true);

-- Authenticated users (admins) full access
CREATE POLICY "Admin full access leaders v2" ON public.leaders_v2
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow anon INSERT/UPDATE/DELETE for admin operations via anon key
CREATE POLICY "Anon full access leaders v2" ON public.leaders_v2
    FOR ALL TO anon
    USING (true)
    WITH CHECK (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_leaders_v2_updated_at BEFORE UPDATE ON public.leaders_v2
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for leader flyers (run in Supabase dashboard if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('leaders', 'leaders', true)
-- ON CONFLICT DO NOTHING;
