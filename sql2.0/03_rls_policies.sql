-- ============================================================
--  RASIN AYITI 2.0 — RÈGLEMAN SEKIRITE (ROW LEVEL SECURITY - RLS)
-- ============================================================

-- ---- 1. AKTIVE RLS SOU TOUT TABLO YO -----------------------
ALTER TABLE public.rasinayiti_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_formations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_seminaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_etudiants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_inscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_progressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_completions_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_galerie ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_administrateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_parametres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_logs_activite ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_event_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_inscriptions_evenements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_maillots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_maillot_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_leaders_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_zoom_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_live_viewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rasinayiti_live_reactions ENABLE ROW LEVEL SECURITY;

-- ---- 2. POLITIQUES SEKIRITE (POLICIES) ----------------------

-- 1. Kategori
DROP POLICY IF EXISTS "rasinayiti_cat_public_read" ON public.rasinayiti_categories;
CREATE POLICY "rasinayiti_cat_public_read" ON public.rasinayiti_categories
    FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "rasinayiti_cat_admin_all" ON public.rasinayiti_categories;
CREATE POLICY "rasinayiti_cat_admin_all" ON public.rasinayiti_categories
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 2. Formations
DROP POLICY IF EXISTS "rasinayiti_form_public_read" ON public.rasinayiti_formations;
CREATE POLICY "rasinayiti_form_public_read" ON public.rasinayiti_formations
    FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "rasinayiti_form_admin_all" ON public.rasinayiti_formations;
CREATE POLICY "rasinayiti_form_admin_all" ON public.rasinayiti_formations
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 3. Seminaires
DROP POLICY IF EXISTS "rasinayiti_sem_public_read" ON public.rasinayiti_seminaires;
CREATE POLICY "rasinayiti_sem_public_read" ON public.rasinayiti_seminaires
    FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "rasinayiti_sem_admin_all" ON public.rasinayiti_seminaires;
CREATE POLICY "rasinayiti_sem_admin_all" ON public.rasinayiti_seminaires
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 4. Etudiants
DROP POLICY IF EXISTS "rasinayiti_etud_insert" ON public.rasinayiti_etudiants;
CREATE POLICY "rasinayiti_etud_insert" ON public.rasinayiti_etudiants
    FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "rasinayiti_etud_read" ON public.rasinayiti_etudiants;
CREATE POLICY "rasinayiti_etud_read" ON public.rasinayiti_etudiants
    FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "rasinayiti_etud_update" ON public.rasinayiti_etudiants;
CREATE POLICY "rasinayiti_etud_update" ON public.rasinayiti_etudiants
    FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "rasinayiti_etud_delete" ON public.rasinayiti_etudiants;
CREATE POLICY "rasinayiti_etud_delete" ON public.rasinayiti_etudiants
    FOR DELETE TO anon, authenticated USING (true);

-- 5. Inscriptions
DROP POLICY IF EXISTS "rasinayiti_insc_all" ON public.rasinayiti_inscriptions;
CREATE POLICY "rasinayiti_insc_all" ON public.rasinayiti_inscriptions
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 6. Progressions
DROP POLICY IF EXISTS "rasinayiti_prog_all" ON public.rasinayiti_progressions;
CREATE POLICY "rasinayiti_prog_all" ON public.rasinayiti_progressions
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 7. Modules
DROP POLICY IF EXISTS "rasinayiti_mod_all" ON public.rasinayiti_modules;
CREATE POLICY "rasinayiti_mod_all" ON public.rasinayiti_modules
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 8. Completions modules
DROP POLICY IF EXISTS "rasinayiti_comp_all" ON public.rasinayiti_completions_modules;
CREATE POLICY "rasinayiti_comp_all" ON public.rasinayiti_completions_modules
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 9. Galerie
DROP POLICY IF EXISTS "rasinayiti_gal_all" ON public.rasinayiti_galerie;
CREATE POLICY "rasinayiti_gal_all" ON public.rasinayiti_galerie
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 10. Notifications
DROP POLICY IF EXISTS "rasinayiti_notif_all" ON public.rasinayiti_notifications;
CREATE POLICY "rasinayiti_notif_all" ON public.rasinayiti_notifications
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 11. Administrateurs
DROP POLICY IF EXISTS "rasinayiti_admin_all" ON public.rasinayiti_administrateurs;
CREATE POLICY "rasinayiti_admin_all" ON public.rasinayiti_administrateurs
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 12. Paramètres
DROP POLICY IF EXISTS "rasinayiti_param_all" ON public.rasinayiti_parametres;
CREATE POLICY "rasinayiti_param_all" ON public.rasinayiti_parametres
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 13. Logs
DROP POLICY IF EXISTS "rasinayiti_logs_all" ON public.rasinayiti_logs_activite;
CREATE POLICY "rasinayiti_logs_all" ON public.rasinayiti_logs_activite
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 14. Events
DROP POLICY IF EXISTS "rasinayiti_events_read" ON public.rasinayiti_events;
CREATE POLICY "rasinayiti_events_read" ON public.rasinayiti_events
    FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "rasinayiti_events_admin" ON public.rasinayiti_events;
CREATE POLICY "rasinayiti_events_admin" ON public.rasinayiti_events
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 15. Quiz Questions
DROP POLICY IF EXISTS "rasinayiti_quiz_read" ON public.rasinayiti_event_questions;
CREATE POLICY "rasinayiti_quiz_read" ON public.rasinayiti_event_questions
    FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "rasinayiti_quiz_admin" ON public.rasinayiti_event_questions;
CREATE POLICY "rasinayiti_quiz_admin" ON public.rasinayiti_event_questions
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 16. Inscriptions Evenements
DROP POLICY IF EXISTS "rasinayiti_insc_ev_insert" ON public.rasinayiti_inscriptions_evenements;
CREATE POLICY "rasinayiti_insc_ev_insert" ON public.rasinayiti_inscriptions_evenements
    FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "rasinayiti_insc_ev_select" ON public.rasinayiti_inscriptions_evenements;
CREATE POLICY "rasinayiti_insc_ev_select" ON public.rasinayiti_inscriptions_evenements
    FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "rasinayiti_insc_ev_admin" ON public.rasinayiti_inscriptions_evenements;
CREATE POLICY "rasinayiti_insc_ev_admin" ON public.rasinayiti_inscriptions_evenements
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 17. Donations
DROP POLICY IF EXISTS "rasinayiti_don_insert" ON public.rasinayiti_donations;
CREATE POLICY "rasinayiti_don_insert" ON public.rasinayiti_donations
    FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "rasinayiti_don_select" ON public.rasinayiti_donations;
CREATE POLICY "rasinayiti_don_select" ON public.rasinayiti_donations
    FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "rasinayiti_don_admin" ON public.rasinayiti_donations;
CREATE POLICY "rasinayiti_don_admin" ON public.rasinayiti_donations
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 18. Maillots
DROP POLICY IF EXISTS "rasinayiti_mail_read" ON public.rasinayiti_maillots;
CREATE POLICY "rasinayiti_mail_read" ON public.rasinayiti_maillots
    FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "rasinayiti_mail_admin" ON public.rasinayiti_maillots;
CREATE POLICY "rasinayiti_mail_admin" ON public.rasinayiti_maillots
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 19. Maillot Orders
DROP POLICY IF EXISTS "rasinayiti_mail_orders_insert" ON public.rasinayiti_maillot_orders;
CREATE POLICY "rasinayiti_mail_orders_insert" ON public.rasinayiti_maillot_orders
    FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "rasinayiti_mail_orders_admin" ON public.rasinayiti_maillot_orders;
CREATE POLICY "rasinayiti_mail_orders_admin" ON public.rasinayiti_maillot_orders
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 20. Leaders V2
DROP POLICY IF EXISTS "rasinayiti_leaders_read" ON public.rasinayiti_leaders_v2;
CREATE POLICY "rasinayiti_leaders_read" ON public.rasinayiti_leaders_v2
    FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "rasinayiti_leaders_admin" ON public.rasinayiti_leaders_v2;
CREATE POLICY "rasinayiti_leaders_admin" ON public.rasinayiti_leaders_v2
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 21. Participants
DROP POLICY IF EXISTS "rasinayiti_part_all" ON public.rasinayiti_participants;
CREATE POLICY "rasinayiti_part_all" ON public.rasinayiti_participants
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 22. Zoom Config
DROP POLICY IF EXISTS "rasinayiti_zoom_all" ON public.rasinayiti_zoom_config;
CREATE POLICY "rasinayiti_zoom_all" ON public.rasinayiti_zoom_config
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 23. Live Viewers
DROP POLICY IF EXISTS "rasinayiti_viewers_all" ON public.rasinayiti_live_viewers;
CREATE POLICY "rasinayiti_viewers_all" ON public.rasinayiti_live_viewers
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 24. Live Reactions
DROP POLICY IF EXISTS "rasinayiti_reactions_all" ON public.rasinayiti_live_reactions;
CREATE POLICY "rasinayiti_reactions_all" ON public.rasinayiti_live_reactions
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
