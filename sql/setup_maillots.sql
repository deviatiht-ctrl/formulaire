-- =================================================================
-- SETUP BOUTIQUE MAILLOTS - Rasin Ayiti
-- =================================================================

-- ---- 1. TABLE MAILLOTS (Produits) ---------------------------
CREATE TABLE IF NOT EXISTS public.maillots (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nom             TEXT NOT NULL,
    description     TEXT,
    prix            NUMERIC(10,2) NOT NULL,
    devise          TEXT DEFAULT 'HTG',
    image_url_1     TEXT,
    image_url_2     TEXT,
    image_url_3     TEXT,
    est_disponible  BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ---- 2. TABLE COMMANDES MAILLOTS ----------------------------
CREATE TABLE IF NOT EXISTS public.maillot_orders (
    id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    maillot_id          UUID REFERENCES public.maillots(id) ON DELETE SET NULL,
    nom                 TEXT NOT NULL,
    prenom              TEXT NOT NULL,
    email               TEXT NOT NULL,
    quantite            INTEGER DEFAULT 1,
    taille              TEXT NOT NULL, -- S, M, L, XL, XXL
    montant_total       NUMERIC(10,2),
    preuve_paiement_url TEXT, -- Link to uploaded image
    statut              TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_attente','confirme','livre','annule')),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ---- 3. RLS POLICIES -----------------------------------------
ALTER TABLE public.maillots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maillot_orders ENABLE ROW LEVEL SECURITY;

-- Public can view available maillots
CREATE POLICY "Public read maillots" ON public.maillots FOR SELECT USING (est_disponible = true);

-- Public can insert orders
CREATE POLICY "Public insert orders" ON public.maillot_orders FOR INSERT WITH CHECK (true);

-- Admin can do everything
CREATE POLICY "Admin full access maillots" ON public.maillots FOR ALL USING (true);
CREATE POLICY "Admin full access orders" ON public.maillot_orders FOR ALL USING (true);

-- ---- 4. STORAGE BUCKET "maillots" ----------------------------
-- Note: Create bucket "maillots" in Supabase dashboard or via SQL if supported
INSERT INTO storage.buckets (id, name, public) VALUES ('maillots', 'maillots', true) ON CONFLICT DO NOTHING;

-- Policies for maillots bucket
CREATE POLICY "Public read maillots bucket" ON storage.objects FOR SELECT USING (bucket_id = 'maillots');
CREATE POLICY "Public upload proof bucket" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'maillots');
CREATE POLICY "Admin delete maillots bucket" ON storage.objects FOR DELETE USING (bucket_id = 'maillots');

-- ---- 5. DEFAULT PRODUCT --------------------------------------
INSERT INTO public.maillots (nom, description, prix, image_url_1)
VALUES ('Maillot Officiel Rasin Ayiti', 'Département de développement Juvénile - Édition 2026', 1500, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1000&auto=format&fit=crop')
ON CONFLICT DO NOTHING;
