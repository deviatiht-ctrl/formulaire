-- ============================================================
-- BUCKET.SQL - Creye bucket storage "paiements" pou Rasin Ayiti
-- Kopi tout sa a, cole nan Supabase > SQL Editor, epi klike Run
-- ============================================================

-- 1. Kreye bucket "paiements" (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'paiements',
    'paiements',
    true,
    5242880,   -- 5 MB max
    ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

-- 2. Politique: tout moun ka upload (anon + authenticated)
DROP POLICY IF EXISTS "Allow upload for all" ON storage.objects;
CREATE POLICY "Allow upload for all" ON storage.objects
    FOR INSERT TO anon, authenticated
    WITH CHECK (bucket_id = 'paiements');

-- 3. Politique: lekti piblik (tout moun ka we imaj yo)
DROP POLICY IF EXISTS "Allow read for all" ON storage.objects;
CREATE POLICY "Allow read for all" ON storage.objects
    FOR SELECT TO anon, authenticated
    USING (bucket_id = 'paiements');

-- 4. Politique: update (ranplase imaj)
DROP POLICY IF EXISTS "Allow update for all" ON storage.objects;
CREATE POLICY "Allow update for all" ON storage.objects
    FOR UPDATE TO anon, authenticated
    USING (bucket_id = 'paiements');

-- 5. Politique: delete (admin ka efase)
DROP POLICY IF EXISTS "Allow delete for authenticated" ON storage.objects;
CREATE POLICY "Allow delete for authenticated" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'paiements');

-- ============================================================
-- Verifye bucket kreye kòrèkteman:
-- SELECT * FROM storage.buckets WHERE id = 'paiements';
-- ============================================================
