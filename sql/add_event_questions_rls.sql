-- ============================================================
--  AJOUTE RLS POLICIES POUR EVENT_QUESTIONS
--  Kreye: 2026
--  Deskripsyon: Permettre l'accès à la table event_questions
-- ============================================================

-- Activer RLS sur event_questions
ALTER TABLE public.event_questions ENABLE ROW LEVEL SECURITY;

-- Politique pour lire les questions actives (public)
DROP POLICY IF EXISTS "Public read active questions" ON public.event_questions;
CREATE POLICY "Public read active questions" ON public.event_questions
    FOR SELECT TO anon, authenticated
    USING (is_active = true);

-- Politique pour que l'admin puisse tout faire
DROP POLICY IF EXISTS "Admin full access event_questions" ON public.event_questions;
CREATE POLICY "Admin full access event_questions" ON public.event_questions
    FOR ALL TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- Vérification
SELECT 
    policyname,
    tablename,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'event_questions';
