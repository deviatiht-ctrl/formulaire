-- ============================================================
-- 12_email_settings.sql — Paramètres email / groupe WhatsApp
-- À exécuter APRÈS 09, 10 et 11. Réexécutable (idempotent).
-- Stocke le lien + le nom du groupe utilisés dans les emails,
-- modifiables depuis Admin → Paramètres.
-- ============================================================

INSERT INTO public.rasinayiti_parametres (cle, valeur, description)
VALUES
('whatsapp_group_link', 'https://chat.whatsapp.com/Hf6T9GaKptAEs5EaOrOMLS?mode=gi_t', 'Lien d''invitation au groupe WhatsApp affiché dans les emails'),
('whatsapp_group_name', 'Groupe WhatsApp Rasin Ayiti', 'Nom du groupe affiché dans les emails'),
('whatsapp_admin_number', '+509 46807922', 'Numéro WhatsApp de contact affiché dans les emails')
ON CONFLICT (cle) DO NOTHING;

-- Le contenu des emails dépend de ces paramètres : la lecture reste
-- publique (les pages d'inscription en ont besoin), mais seul un
-- administrateur authentifié peut les modifier.
DROP POLICY IF EXISTS "rasinayiti_param_all" ON public.rasinayiti_parametres;
DROP POLICY IF EXISTS "rasinayiti_param_read" ON public.rasinayiti_parametres;
DROP POLICY IF EXISTS "rasinayiti_param_write" ON public.rasinayiti_parametres;

CREATE POLICY "rasinayiti_param_read" ON public.rasinayiti_parametres
    FOR SELECT TO anon, authenticated USING (true);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'rasinayiti_is_admin'
    ) THEN
        EXECUTE 'CREATE POLICY "rasinayiti_param_write" ON public.rasinayiti_parametres
            FOR ALL TO authenticated
            USING (public.rasinayiti_is_admin())
            WITH CHECK (public.rasinayiti_is_admin())';
    ELSE
        EXECUTE 'CREATE POLICY "rasinayiti_param_write" ON public.rasinayiti_parametres
            FOR ALL TO authenticated USING (true) WITH CHECK (true)';
    END IF;
END $$;
