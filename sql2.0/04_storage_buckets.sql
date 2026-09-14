-- ============================================================
--  RASIN AYITI 2.0 — STORAGE BUCKETS AK POLITIQUES
--  Tout buckets yo gen prefiks: rasinayiti_
-- ============================================================

-- 1. KREYASYON BUCKETS SOU STORAGE.BUCKETS
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

-- 2. POLITIQUES SEKIRITE SOU STORAGE.OBJECTS

-- Lekti Piblik pou tout buckets rasinayiti_
DROP POLICY IF EXISTS "rasinayiti_storage_public_read" ON storage.objects;
CREATE POLICY "rasinayiti_storage_public_read" ON storage.objects
    FOR SELECT TO anon, authenticated
    USING (bucket_id IN (
        'rasinayiti_paiements',
        'rasinayiti_events',
        'rasinayiti_maillots',
        'rasinayiti_leaders',
        'rasinayiti_galerie'
    ));

-- Upload (Insert) pou vizitè ak itilizatè yo
DROP POLICY IF EXISTS "rasinayiti_storage_insert" ON storage.objects;
CREATE POLICY "rasinayiti_storage_insert" ON storage.objects
    FOR INSERT TO anon, authenticated
    WITH CHECK (bucket_id IN (
        'rasinayiti_paiements',
        'rasinayiti_events',
        'rasinayiti_maillots',
        'rasinayiti_leaders',
        'rasinayiti_galerie'
    ));

-- Mizajou (Update)
DROP POLICY IF EXISTS "rasinayiti_storage_update" ON storage.objects;
CREATE POLICY "rasinayiti_storage_update" ON storage.objects
    FOR UPDATE TO anon, authenticated
    USING (bucket_id IN (
        'rasinayiti_paiements',
        'rasinayiti_events',
        'rasinayiti_maillots',
        'rasinayiti_leaders',
        'rasinayiti_galerie'
    ));

-- Efase (Delete)
DROP POLICY IF EXISTS "rasinayiti_storage_delete" ON storage.objects;
CREATE POLICY "rasinayiti_storage_delete" ON storage.objects
    FOR DELETE TO anon, authenticated
    USING (bucket_id IN (
        'rasinayiti_paiements',
        'rasinayiti_events',
        'rasinayiti_maillots',
        'rasinayiti_leaders',
        'rasinayiti_galerie'
    ));
